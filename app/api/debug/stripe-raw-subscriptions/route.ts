import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

/**
 * Raw dump of Stripe subscriptions to debug GoTeamUp issue
 * Shows ALL subscription details including metadata
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

    const stripe = new Stripe(stripeAccount.access_token, {
      apiVersion: "2024-11-20.acacia",
    });

    // Fetch ALL subscriptions with NO filters
    const allSubscriptions = await stripe.subscriptions.list({
      limit: 100,
      expand: ["data.customer", "data.items.data.price.product"],
    });

    // Get raw subscription details
    const subscriptionDetails = allSubscriptions.data.map((sub) => ({
      id: sub.id,
      status: sub.status,
      customer: {
        id: sub.customer,
        email: (sub.customer as any)?.email || null,
        name: (sub.customer as any)?.name || null,
      },
      items: sub.items.data.map((item) => ({
        price_id: item.price.id,
        amount: item.price.unit_amount,
        product_id: item.price.product,
        product_name: (item.price.product as any)?.name || null,
      })),
      metadata: sub.metadata,
      created: sub.created,
      current_period_start: sub.current_period_start,
      current_period_end: sub.current_period_end,
      cancel_at_period_end: sub.cancel_at_period_end,
      canceled_at: sub.canceled_at,
    }));

    // Check for GoTeamUp patterns in metadata
    const goteamupSubscriptions = subscriptionDetails.filter(
      (sub) =>
        sub.metadata?.source === "goteamup" ||
        sub.metadata?.platform === "goteamup" ||
        Object.keys(sub.metadata || {}).some((key) =>
          key.toLowerCase().includes("goteamup"),
        ),
    );

    return NextResponse.json({
      success: true,
      total: allSubscriptions.data.length,
      hasMore: allSubscriptions.has_more,
      statusBreakdown: subscriptionDetails.reduce(
        (acc, sub) => {
          acc[sub.status] = (acc[sub.status] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      ),
      goteamupSubscriptions: goteamupSubscriptions.length,
      subscriptions: subscriptionDetails,
      rawFirstSubscription: allSubscriptions.data[0] || null, // Full raw data for inspection
    });
  } catch (error: any) {
    console.error("Stripe raw subscription debug error:", error);
    return NextResponse.json(
      { error: `Debug failed: ${error.message}` },
      { status: 500 },
    );
  }
}
