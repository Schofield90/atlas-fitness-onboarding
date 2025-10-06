import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

/**
 * Debug endpoint to check Stripe subscriptions status
 * Shows what subscriptions exist and why they might not be importing
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const organizationId = searchParams.get("organizationId");

    if (!organizationId) {
      return NextResponse.json(
        { error: "organizationId query parameter required" },
        { status: 400 },
      );
    }

    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Get Stripe connection
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

    // Fetch all subscriptions
    const subscriptions = await stripe.subscriptions.list({
      limit: 100,
      expand: ["data.customer"],
    });

    // Group by status
    const statusBreakdown = subscriptions.data.reduce(
      (acc, sub) => {
        acc[sub.status] = (acc[sub.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Check which customers have matching clients
    const customerChecks = await Promise.all(
      subscriptions.data.slice(0, 10).map(async (sub) => {
        const customerId = sub.customer as string;

        // Try to find client
        const { data: client } = await supabaseAdmin
          .from("clients")
          .select("id, email, stripe_customer_id")
          .eq("org_id", organizationId)
          .eq("stripe_customer_id", customerId)
          .maybeSingle();

        // Get customer from Stripe
        let customerEmail = null;
        try {
          const customer = await stripe.customers.retrieve(customerId);
          customerEmail = (customer as any).email;
        } catch (e) {
          // ignore
        }

        return {
          subscription_id: sub.id,
          stripe_customer_id: customerId,
          customer_email: customerEmail,
          subscription_status: sub.status,
          client_found: !!client,
          client_id: client?.id || null,
          client_email: client?.email || null,
        };
      }),
    );

    // Check existing memberships in database
    const { data: existingMemberships } = await supabaseAdmin
      .from("customer_memberships")
      .select("id, status, payment_provider, stripe_subscription_id")
      .eq("organization_id", organizationId);

    // Check existing plans
    const { data: existingPlans } = await supabaseAdmin
      .from("membership_plans")
      .select("id, name, payment_provider, stripe_price_id")
      .eq("organization_id", organizationId);

    return NextResponse.json({
      success: true,
      stripe: {
        totalSubscriptions: subscriptions.data.length,
        statusBreakdown,
        hasMore: subscriptions.has_more,
      },
      database: {
        existingMemberships: existingMemberships?.length || 0,
        existingPlans: existingPlans?.length || 0,
        stripePlans:
          existingPlans?.filter((p) => p.payment_provider === "stripe").length ||
          0,
      },
      customerMatching: {
        sampleChecks: customerChecks,
        matchedCount: customerChecks.filter((c) => c.client_found).length,
        unmatchedCount: customerChecks.filter((c) => !c.client_found).length,
      },
      recommendations: [
        subscriptions.data.length === 0
          ? "No subscriptions found in Stripe"
          : null,
        statusBreakdown.active === 0 && statusBreakdown.trialing === 0
          ? "No active or trialing subscriptions in Stripe - check if subscriptions are cancelled/past_due"
          : null,
        customerChecks.filter((c) => !c.client_found).length > 0
          ? "Some Stripe customers don't have matching clients - run customer import first"
          : null,
      ].filter(Boolean),
    });
  } catch (error: any) {
    console.error("Stripe subscription debug error:", error);
    return NextResponse.json(
      { error: `Debug failed: ${error.message}` },
      { status: 500 },
    );
  }
}
