import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get current user and organization
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession();

    if (authError || !session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: user } = await supabase
      .from("users")
      .select("organization_id")
      .eq("id", session.user.id)
      .single();

    if (!user?.organization_id) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 404 },
      );
    }

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get("account_id");
    const days = parseInt(searchParams.get("days") || "7");

    if (!accountId) {
      return NextResponse.json(
        { error: "account_id is required" },
        { status: 400 },
      );
    }

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get aggregated metrics from campaigns
    let query = supabase
      .from("facebook_campaigns")
      .select("spend, impressions, clicks, leads_count")
      .eq("organization_id", user.organization_id);

    // Filter by ad account if specified
    if (accountId !== "all") {
      query = query.eq("ad_account_id", accountId);
    }

    const { data: campaigns, error } = await query;

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Failed to fetch metrics" },
        { status: 500 },
      );
    }

    // Calculate totals
    const totals = campaigns?.reduce(
      (acc, campaign) => ({
        totalSpend: acc.totalSpend + (campaign.spend || 0),
        totalImpressions: acc.totalImpressions + (campaign.impressions || 0),
        totalClicks: acc.totalClicks + (campaign.clicks || 0),
        totalLeads: acc.totalLeads + (campaign.leads_count || 0),
      }),
      {
        totalSpend: 0,
        totalImpressions: 0,
        totalClicks: 0,
        totalLeads: 0,
      },
    ) || {
      totalSpend: 0,
      totalImpressions: 0,
      totalClicks: 0,
      totalLeads: 0,
    };

    // Calculate derived metrics
    const averageCTR =
      totals.totalImpressions > 0
        ? (totals.totalClicks / totals.totalImpressions) * 100
        : 0;

    const averageCPC =
      totals.totalClicks > 0 ? totals.totalSpend / totals.totalClicks : 0;

    const averageCPL =
      totals.totalLeads > 0 ? totals.totalSpend / totals.totalLeads : 0;

    // Calculate ROAS (placeholder - would need conversion value data)
    const roas =
      totals.totalSpend > 0 ? (totals.totalLeads * 50) / totals.totalSpend : 0; // Assuming $50 per lead value

    const metrics = {
      ...totals,
      averageCTR,
      averageCPC,
      averageCPL,
      roas,
    };

    return NextResponse.json({
      success: true,
      metrics,
    });
  } catch (error) {
    console.error("Error fetching metrics:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
