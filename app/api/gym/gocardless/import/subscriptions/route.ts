import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

// @ts-ignore - CommonJS module
const gocardless = require("gocardless-nodejs");
const { Environments } = require("gocardless-nodejs/constants");

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Import subscriptions from GoCardless
 * Auto-creates membership plans and assigns customers
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { organizationId, limit = 500 } = body; // Default 500, can be overridden for testing

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 },
      );
    }

    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Get GoCardless connection
    const { data: connection } = await supabaseAdmin
      .from("payment_provider_accounts")
      .select("access_token, environment")
      .eq("organization_id", organizationId)
      .eq("provider", "gocardless")
      .single();

    if (!connection || !connection.access_token) {
      return NextResponse.json(
        { error: "GoCardless account not connected" },
        { status: 404 },
      );
    }

    // Initialize GoCardless client
    const client = gocardless(
      connection.access_token,
      connection.environment === "live"
        ? Environments.Live
        : Environments.Sandbox,
    );

    // Fetch all subscriptions
    const subscriptionsResponse = await client.subscriptions.list({
      limit: 500,
    });
    const subscriptions = subscriptionsResponse.subscriptions || [];

    // Log subscription statuses for debugging
    const statusCounts = subscriptions.reduce(
      (acc, sub) => {
        acc[sub.status] = (acc[sub.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
    console.log("GoCardless subscription statuses:", statusCounts);

    // Filter active subscriptions (include all non-cancelled statuses)
    const activeSubscriptions = subscriptions.filter(
      (sub) =>
        sub.status === "active" ||
        sub.status === "pending_customer_approval" ||
        sub.status === "paused",
    );

    // PHASE 1: Auto-create membership plans from unique subscription amounts
    const processedAmounts = new Set<string>();
    let plansCreated = 0;

    for (const subscription of activeSubscriptions) {
      const amount = parseInt(subscription.amount);
      const interval = subscription.interval_unit; // monthly, yearly, weekly
      const planKey = `${amount}-${interval}`;

      if (processedAmounts.has(planKey)) continue;
      processedAmounts.add(planKey);

      // Check if plan already exists
      const { data: existingPlan } = await supabaseAdmin
        .from("membership_plans")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("payment_provider", "gocardless")
        .eq("price_pennies", amount)
        .eq(
          "billing_period",
          interval === 1 && subscription.interval_unit === "monthly"
            ? "monthly"
            : "custom",
        )
        .maybeSingle();

      if (existingPlan) {
        console.log(`Plan already exists for ${amount} ${interval}`);
        continue;
      }

      // Create membership plan
      const billingPeriod =
        subscription.interval === 1 && subscription.interval_unit === "monthly"
          ? "monthly"
          : subscription.interval === 1 &&
              subscription.interval_unit === "yearly"
            ? "yearly"
            : subscription.interval === 1 &&
                subscription.interval_unit === "weekly"
              ? "weekly"
              : "monthly";

      const { error: planError } = await supabaseAdmin
        .from("membership_plans")
        .insert({
          organization_id: organizationId,
          name:
            subscription.name || `${interval} Membership - £${amount / 100}`,
          description: subscription.description || "",
          price_pennies: amount,
          price: amount / 100,
          billing_period: billingPeriod,
          payment_provider: "gocardless",
          provider_price_id: subscription.id,
          is_active: true,
          metadata: {
            gocardless_subscription_template: true,
            imported_from_gocardless: true,
            import_date: new Date().toISOString(),
            interval: subscription.interval,
            interval_unit: subscription.interval_unit,
          },
        });

      if (!planError) {
        plansCreated++;
        console.log(`Created plan for ${subscription.name} (${amount})`);
      } else {
        console.error(`Error creating plan:`, planError);
      }
    }

    // PHASE 2: Auto-assign customers to membership plans
    let membershipsCreated = 0;
    let clientsUpdated = 0;

    for (const subscription of activeSubscriptions) {
      // Fetch customer details
      if (!subscription.links?.customer) continue;

      let customer;
      try {
        customer = await client.customers.find(subscription.links.customer);
      } catch (error) {
        console.error(
          `Failed to fetch customer ${subscription.links.customer}:`,
          error,
        );
        continue;
      }

      // Find client by email
      const { data: client } = await supabaseAdmin
        .from("clients")
        .select("id, email, first_name, last_name")
        .eq("org_id", organizationId)
        .eq("email", customer.email)
        .maybeSingle();

      if (!client) {
        console.log(
          `⚠️ Client not found for GoCardless customer ${customer.email} (${customer.given_name} ${customer.family_name}), skipping subscription ${subscription.id}`,
        );
        continue;
      }

      console.log(
        `✅ Found client ${client.id} (${client.email}) for subscription ${subscription.id}`,
      );

      // Update client with subscription info (if not already set)
      await supabaseAdmin
        .from("clients")
        .update({
          subscription_status: subscription.status,
          updated_at: new Date().toISOString(),
          metadata: {
            gocardless_customer_id: customer.id,
            gocardless_subscription_id: subscription.id,
          },
        })
        .eq("id", client.id);

      clientsUpdated++;

      // Find matching membership plan
      const amount = parseInt(subscription.amount);
      const { data: membershipPlan } = await supabaseAdmin
        .from("membership_plans")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("payment_provider", "gocardless")
        .eq("price_pennies", amount)
        .maybeSingle();

      if (!membershipPlan) {
        console.log(`No membership plan found for amount ${amount}`);
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
            status: subscription.status === "active" ? "active" : "pending",
            payment_provider: "gocardless",
            provider_subscription_id: subscription.id,
            next_billing_date:
              subscription.upcoming_payments?.[0]?.charge_date || null,
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
            status: subscription.status === "active" ? "active" : "pending",
            payment_status: "current",
            payment_provider: "gocardless",
            provider_subscription_id: subscription.id,
            start_date:
              subscription.start_date || new Date().toISOString().split("T")[0],
            next_billing_date:
              subscription.upcoming_payments?.[0]?.charge_date || null,
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

    console.log("=== GoCardless Import Summary ===");
    console.log(`Total subscriptions fetched: ${subscriptions.length}`);
    console.log(`Active subscriptions: ${activeSubscriptions.length}`);
    console.log(`Plans created: ${plansCreated}`);
    console.log(`Memberships created: ${membershipsCreated}`);
    console.log(`Clients updated: ${clientsUpdated}`);
    console.log(
      `Skipped subscriptions: ${subscriptions.length - activeSubscriptions.length}`,
    );

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
    console.error("Error importing GoCardless subscriptions:", error);
    return NextResponse.json(
      { error: `Failed to import subscriptions: ${error.message}` },
      { status: 500 },
    );
  }
}
