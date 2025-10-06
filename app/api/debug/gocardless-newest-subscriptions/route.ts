import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

// @ts-ignore - CommonJS module
const gocardless = require("gocardless-nodejs");
const { Environments } = require("gocardless-nodejs/constants");

export const dynamic = "force-dynamic";

/**
 * Fetch NEWEST GoCardless subscriptions first
 * Tests if we can get recent data by sorting differently
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

    // Try fetching with different date filters to get recent data
    const now = new Date();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(now.getFullYear() - 1);

    // Attempt 1: Filter by created_at (if supported)
    let recentSubscriptions;
    try {
      recentSubscriptions = await client.subscriptions.list({
        limit: 100,
        created_at: {
          gt: oneYearAgo.toISOString(),
        },
      });
    } catch (e) {
      // If date filter not supported, try without
      recentSubscriptions = await client.subscriptions.list({
        limit: 100,
      });
    }

    const subscriptions = recentSubscriptions.subscriptions || [];

    // Sort by created_at descending (newest first)
    const sortedSubscriptions = subscriptions.sort(
      (a: any, b: any) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

    // Get status breakdown
    const statusBreakdown = sortedSubscriptions.reduce(
      (acc: any, sub: any) => {
        acc[sub.status] = (acc[sub.status] || 0) + 1;
        return acc;
      },
      {},
    );

    // Show top 10 newest
    const newest10 = sortedSubscriptions.slice(0, 10).map((sub: any) => ({
      id: sub.id,
      status: sub.status,
      name: sub.name,
      amount: sub.amount,
      created_at: sub.created_at,
      start_date: sub.start_date,
      end_date: sub.end_date,
    }));

    return NextResponse.json({
      success: true,
      total: subscriptions.length,
      statusBreakdown,
      newest10Subscriptions: newest10,
      dateRange: {
        oldest: sortedSubscriptions[sortedSubscriptions.length - 1]?.created_at,
        newest: sortedSubscriptions[0]?.created_at,
      },
    });
  } catch (error: any) {
    console.error("GoCardless newest subscriptions error:", error);
    return NextResponse.json(
      { error: `Debug failed: ${error.message}` },
      { status: 500 },
    );
  }
}
