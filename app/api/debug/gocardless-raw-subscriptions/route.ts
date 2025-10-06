import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

// @ts-ignore - CommonJS module
const gocardless = require("gocardless-nodejs");
const { Environments } = require("gocardless-nodejs/constants");

export const dynamic = "force-dynamic";

/**
 * Raw dump of GoCardless subscriptions to debug GoTeamUp issue
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

    const client = gocardless(
      connection.access_token,
      connection.environment === "live"
        ? Environments.Live
        : Environments.Sandbox,
    );

    // Fetch subscriptions - check pagination
    const subscriptionsResponse = await client.subscriptions.list({
      limit: 500,
    });

    const subscriptions = subscriptionsResponse.subscriptions || [];

    // Check if there are more subscriptions beyond the limit
    const hasMore = subscriptionsResponse.meta?.cursors?.after ? true : false;
    const cursor = subscriptionsResponse.meta?.cursors?.after;

    // Get date range of fetched subscriptions
    const dates = subscriptions.map((s: any) => s.created_at).sort();
    const oldestDate = dates[0];
    const newestDate = dates[dates.length - 1];

    // Get raw details
    const subscriptionDetails = subscriptions.map((sub: any) => ({
      id: sub.id,
      status: sub.status,
      name: sub.name,
      amount: sub.amount,
      currency: sub.currency,
      interval: sub.interval,
      interval_unit: sub.interval_unit,
      customer_id: sub.links?.customer,
      metadata: sub.metadata,
      created_at: sub.created_at,
      start_date: sub.start_date,
      end_date: sub.end_date,
      upcoming_payments: sub.upcoming_payments,
    }));

    // Check for GoTeamUp patterns
    const goteamupSubscriptions = subscriptionDetails.filter(
      (sub) =>
        sub.metadata?.source === "goteamup" ||
        sub.metadata?.platform === "goteamup" ||
        Object.keys(sub.metadata || {}).some((key: string) =>
          key.toLowerCase().includes("goteamup"),
        ),
    );

    // Status breakdown
    const statusBreakdown = subscriptionDetails.reduce(
      (acc: any, sub: any) => {
        acc[sub.status] = (acc[sub.status] || 0) + 1;
        return acc;
      },
      {},
    );

    // Check for patterns in subscription names
    const namePatterns = subscriptionDetails.reduce(
      (acc: any, sub: any) => {
        const name = sub.name || "unnamed";
        acc[name] = (acc[name] || 0) + 1;
        return acc;
      },
      {},
    );

    return NextResponse.json({
      success: true,
      total: subscriptions.length,
      hasMore,
      nextCursor: cursor,
      dateRange: {
        oldest: oldestDate,
        newest: newestDate,
      },
      statusBreakdown,
      namePatterns,
      goteamupSubscriptions: goteamupSubscriptions.length,
      subscriptions: subscriptionDetails.slice(0, 20), // First 20 for inspection
      lastSubscriptions: subscriptionDetails.slice(-5), // Last 5 to see newest
      rawFirstSubscription: subscriptions[0] || null,
      warning: hasMore
        ? `There are MORE subscriptions beyond the 500 limit! Use cursor: ${cursor} to fetch next batch`
        : null,
    });
  } catch (error: any) {
    console.error("GoCardless raw subscription debug error:", error);
    return NextResponse.json(
      { error: `Debug failed: ${error.message}` },
      { status: 500 },
    );
  }
}
