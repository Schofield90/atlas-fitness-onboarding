import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import Stripe from "stripe";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // 60 seconds timeout (requires Pro plan)

/**
 * Enhanced subscription import that:
 * 1. Auto-creates membership plans from Stripe prices
 * 2. Auto-assigns customers to their membership plans
 * 3. Updates client subscription status
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { organizationId } = body;

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 },
      );
    }

    // Use admin client for all operations
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { data: stripeAccount } = await supabaseAdmin
      .from("stripe_connect_accounts")
      .select("access_token")
      .eq("organization_id", organizationId)
      .single();

    if (!stripeAccount || !stripeAccount.access_token) {
      return NextResponse.json(
        { error: "Stripe account not connected" },
        { status: 404 },
      );
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeAccount.access_token, {
      apiVersion: "2024-11-20.acacia",
    });

    // Fetch all subscriptions from Stripe
    const subscriptions: Stripe.Subscription[] = [];
    let hasMore = true;
    let startingAfter: string | undefined = undefined;

    while (hasMore) {
      const batch = await stripe.subscriptions.list({
        limit: 100,
        starting_after: startingAfter,
        expand: ["data.items.data.price"], // Only expand to price level (3 levels max)
      });

      subscriptions.push(...batch.data);
      hasMore = batch.has_more;
      if (hasMore && batch.data.length > 0) {
        startingAfter = batch.data[batch.data.length - 1].id;
      }
    }

    const activeSubscriptions = subscriptions.filter(
      (sub) => sub.status === "active" || sub.status === "trialing",
    );

    // PHASE 1: Auto-create membership plans from unique Stripe prices
    const processedPriceIds = new Set<string>();
    let plansCreated = 0;

    for (const subscription of activeSubscriptions) {
      for (const item of subscription.items.data) {
        const price = item.price;
        const priceId = price.id;

        if (processedPriceIds.has(priceId)) continue;
        processedPriceIds.add(priceId);

        // Check if plan already exists for this Stripe price
        const { data: existingPlan } = await supabaseAdmin
          .from("membership_plans")
          .select("id")
          .eq("organization_id", organizationId)
          .eq("stripe_price_id", priceId)
          .maybeSingle();

        if (existingPlan) {
          console.log(`Plan already exists for price ${priceId}`);
          continue;
        }

        // Get product details
        const product =
          typeof price.product === "string"
            ? await stripe.products.retrieve(price.product)
            : price.product;

        // Determine billing period
        let billingPeriod = "monthly";
        if (price.recurring) {
          if (price.recurring.interval === "year") {
            billingPeriod = "yearly";
          } else if (price.recurring.interval === "month") {
            if (price.recurring.interval_count === 3) {
              billingPeriod = "quarterly";
            } else {
              billingPeriod = "monthly";
            }
          } else if (price.recurring.interval === "week") {
            billingPeriod = "weekly";
          }
        }

        // Create membership plan
        const { error: planError } = await supabaseAdmin
          .from("membership_plans")
          .insert({
            organization_id: organizationId,
            name: product.name || `Membership Plan`,
            description: product.description || "",
            price_pennies: price.unit_amount || 0,
            price: (price.unit_amount || 0) / 100,
            billing_period: billingPeriod,
            stripe_price_id: priceId,
            is_active: true,
            metadata: {
              stripe_product_id:
                typeof price.product === "string"
                  ? price.product
                  : price.product.id,
              imported_from_stripe: true,
              import_date: new Date().toISOString(),
            },
          });

        if (!planError) {
          plansCreated++;
          console.log(`Created plan for ${product.name} (${priceId})`);
        } else {
          console.error(`Error creating plan for ${priceId}:`, planError);
        }
      }
    }

    // PHASE 2: Auto-assign customers to membership plans & update client records
    let membershipsCreated = 0;
    let clientsUpdated = 0;

    for (const subscription of activeSubscriptions) {
      const customerId = subscription.customer as string;

      // Find client by Stripe customer ID
      const { data: client } = await supabaseAdmin
        .from("clients")
        .select("id")
        .eq("org_id", organizationId)
        .eq("stripe_customer_id", customerId)
        .maybeSingle();

      if (!client) {
        console.log(
          `Client not found for Stripe customer ${customerId}, skipping`,
        );
        continue;
      }

      // Update client with subscription info
      await supabaseAdmin
        .from("clients")
        .update({
          stripe_subscription_id: subscription.id,
          subscription_status: subscription.status,
          subscription_current_period_end: new Date(
            subscription.current_period_end * 1000,
          ).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", client.id);

      clientsUpdated++;

      // Get the first price from subscription items (most subscriptions have 1 item)
      const subscriptionItem = subscription.items.data[0];
      if (!subscriptionItem) continue;

      const priceId = subscriptionItem.price.id;

      // Find the membership plan for this price
      const { data: membershipPlan } = await supabaseAdmin
        .from("membership_plans")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("stripe_price_id", priceId)
        .maybeSingle();

      if (!membershipPlan) {
        console.log(`No membership plan found for price ${priceId}`);
        continue;
      }

      // Check if customer_membership already exists
      const { data: existingMembership } = await supabaseAdmin
        .from("customer_memberships")
        .select("id")
        .eq("client_id", client.id)
        .eq("membership_plan_id", membershipPlan.id)
        .maybeSingle();

      if (existingMembership) {
        // Update existing membership
        await supabaseAdmin
          .from("customer_memberships")
          .update({
            status: subscription.status === "trialing" ? "trial" : "active",
            stripe_subscription_id: subscription.id,
            next_billing_date: new Date(subscription.current_period_end * 1000)
              .toISOString()
              .split("T")[0],
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingMembership.id);

        console.log(
          `Updated membership for client ${client.id} to plan ${membershipPlan.id}`,
        );
      } else {
        // Create new customer_membership
        const { error: membershipError } = await supabaseAdmin
          .from("customer_memberships")
          .insert({
            client_id: client.id,
            organization_id: organizationId,
            membership_plan_id: membershipPlan.id,
            status: subscription.status === "trialing" ? "trial" : "active",
            payment_status: "current",
            stripe_subscription_id: subscription.id,
            start_date: new Date(subscription.current_period_start * 1000)
              .toISOString()
              .split("T")[0],
            next_billing_date: new Date(subscription.current_period_end * 1000)
              .toISOString()
              .split("T")[0],
          });

        if (!membershipError) {
          membershipsCreated++;
          console.log(
            `Created membership for client ${client.id} with plan ${membershipPlan.id}`,
          );
        } else {
          console.error(`Error creating membership:`, membershipError);
        }
      }
    }

    return NextResponse.json({
      success: true,
      stats: {
        total: subscriptions.length,
        active: activeSubscriptions.length,
        plansCreated,
        membershipsCreated,
        clientsUpdated,
      },
      message: `Imported ${activeSubscriptions.length} subscriptions, created ${plansCreated} new plans, and assigned ${membershipsCreated} memberships`,
    });
  } catch (error: any) {
    console.error("Error importing subscriptions:", error);
    return NextResponse.json(
      { error: `Failed to import subscriptions: ${error.message}` },
      { status: 500 },
    );
  }
}
