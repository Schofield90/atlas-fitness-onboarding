import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { getCurrentUserOrganization } from "@/app/lib/organization-server";
import MetaAdsClient from "@/app/lib/integrations/meta-ads-client";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { organizationId } = await getCurrentUserOrganization();

    if (!organizationId) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 400 },
      );
    }

    const body = await request.json();
    const { adAccountId, dateRange, breakdown = "none" } = body;

    if (!adAccountId) {
      return NextResponse.json(
        { error: "adAccountId is required" },
        { status: 400 },
      );
    }

    // Validate date range
    let since: string, until: string;
    if (dateRange?.since && dateRange?.until) {
      since = dateRange.since;
      until = dateRange.until;
    } else {
      // Default to last 30 days
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      since = thirtyDaysAgo.toISOString().split("T")[0];
      until = now.toISOString().split("T")[0];
    }

    // Get Meta client
    const metaClient =
      await MetaAdsClient.createFromIntegration(organizationId);
    if (!metaClient) {
      return NextResponse.json(
        {
          error:
            "Meta integration not found. Please connect your Facebook account first.",
        },
        { status: 400 },
      );
    }

    // Verify ad account exists and is accessible
    const { data: adAccountRecord } = await supabase
      .from("facebook_ad_accounts")
      .select("facebook_ad_account_id, account_name")
      .eq("organization_id", organizationId)
      .eq("id", adAccountId)
      .eq("is_active", true)
      .single();

    if (!adAccountRecord) {
      return NextResponse.json(
        { error: "Ad account not found or inactive" },
        { status: 404 },
      );
    }

    // Fetch campaigns
    const campaigns = await metaClient.getCampaigns(
      adAccountRecord.facebook_ad_account_id,
      [
        "id",
        "name",
        "status",
        "objective",
        "daily_budget",
        "lifetime_budget",
        "created_time",
        "updated_time",
      ],
    );

    if (!campaigns || campaigns.length === 0) {
      return NextResponse.json({
        message: "No campaigns found for this ad account",
        insights: {
          account: adAccountRecord,
          campaigns: [],
          summary: {},
        },
      });
    }

    // Fetch insights for each campaign
    const campaignInsights = [];
    const insightFields = [
      "impressions",
      "clicks",
      "spend",
      "reach",
      "frequency",
      "cpm",
      "cpc",
      "ctr",
      "actions", // Includes leads, purchases, etc.
      "cost_per_action_type",
      "video_play_actions",
      "website_ctr",
    ];

    for (const campaign of campaigns) {
      try {
        const insights = await metaClient.getCampaignInsights(
          campaign.id,
          { since, until },
          insightFields,
        );

        // Parse insights data
        const insightData = insights?.data?.[0] || {};

        // Extract lead generation actions
        const actions = insightData.actions || [];
        const leadActions = actions.find(
          (action: any) => action.action_type === "lead",
        );
        const linkClickActions = actions.find(
          (action: any) => action.action_type === "link_click",
        );

        campaignInsights.push({
          campaign: {
            id: campaign.id,
            name: campaign.name,
            status: campaign.status,
            objective: campaign.objective,
            daily_budget: campaign.daily_budget,
            lifetime_budget: campaign.lifetime_budget,
            created_time: campaign.created_time,
            updated_time: campaign.updated_time,
          },
          insights: {
            impressions: parseInt(insightData.impressions || "0"),
            clicks: parseInt(insightData.clicks || "0"),
            spend: parseFloat(insightData.spend || "0"),
            reach: parseInt(insightData.reach || "0"),
            frequency: parseFloat(insightData.frequency || "0"),
            cpm: parseFloat(insightData.cpm || "0"),
            cpc: parseFloat(insightData.cpc || "0"),
            ctr: parseFloat(insightData.ctr || "0"),
            leads: parseInt(leadActions?.value || "0"),
            link_clicks: parseInt(linkClickActions?.value || "0"),
            cost_per_lead: leadActions
              ? (
                  parseFloat(insightData.spend || "0") /
                  parseInt(leadActions.value || "1")
                ).toFixed(2)
              : "0.00",
            video_plays: insightData.video_play_actions
              ? insightData.video_play_actions.reduce(
                  (sum: number, action: any) =>
                    sum + parseInt(action.value || "0"),
                  0,
                )
              : 0,
          },
        });
      } catch (error) {
        console.error(
          `Failed to fetch insights for campaign ${campaign.id}:`,
          error,
        );
        campaignInsights.push({
          campaign: {
            id: campaign.id,
            name: campaign.name,
            status: campaign.status,
            objective: campaign.objective,
          },
          insights: null,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // Calculate summary metrics
    const summary = campaignInsights.reduce(
      (acc, campaign) => {
        if (campaign.insights) {
          acc.totalImpressions += campaign.insights.impressions;
          acc.totalClicks += campaign.insights.clicks;
          acc.totalSpend += campaign.insights.spend;
          acc.totalReach += campaign.insights.reach;
          acc.totalLeads += campaign.insights.leads;
          acc.totalLinkClicks += campaign.insights.link_clicks;
          acc.activeCampaigns += campaign.campaign.status === "ACTIVE" ? 1 : 0;
        }
        return acc;
      },
      {
        totalImpressions: 0,
        totalClicks: 0,
        totalSpend: 0,
        totalReach: 0,
        totalLeads: 0,
        totalLinkClicks: 0,
        activeCampaigns: 0,
        totalCampaigns: campaigns.length,
      },
    );

    // Add calculated metrics
    summary.averageCPM =
      summary.totalImpressions > 0
        ? ((summary.totalSpend / summary.totalImpressions) * 1000).toFixed(2)
        : "0.00";
    summary.averageCPC =
      summary.totalClicks > 0
        ? (summary.totalSpend / summary.totalClicks).toFixed(2)
        : "0.00";
    summary.averageCTR =
      summary.totalImpressions > 0
        ? ((summary.totalClicks / summary.totalImpressions) * 100).toFixed(2)
        : "0.00";
    summary.costPerLead =
      summary.totalLeads > 0
        ? (summary.totalSpend / summary.totalLeads).toFixed(2)
        : "0.00";

    return NextResponse.json({
      success: true,
      insights: {
        account: adAccountRecord,
        dateRange: { since, until },
        campaigns: campaignInsights,
        summary,
      },
    });
  } catch (error: any) {
    console.error("Campaign insights error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch campaign insights",
        details: error.message,
        code: error.code || "UNKNOWN_ERROR",
      },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { organizationId } = await getCurrentUserOrganization();

    if (!organizationId) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 400 },
      );
    }

    const { searchParams } = new URL(request.url);
    const adAccountId = searchParams.get("adAccountId");

    if (!adAccountId) {
      return NextResponse.json(
        { error: "adAccountId parameter is required" },
        { status: 400 },
      );
    }

    // Get basic campaign data from Meta API (no insights, just campaign info)
    const metaClient =
      await MetaAdsClient.createFromIntegration(organizationId);
    if (!metaClient) {
      return NextResponse.json(
        {
          error:
            "Meta integration not found. Please connect your Facebook account first.",
        },
        { status: 400 },
      );
    }

    const { data: adAccountRecord } = await supabase
      .from("facebook_ad_accounts")
      .select("facebook_ad_account_id, account_name")
      .eq("organization_id", organizationId)
      .eq("id", adAccountId)
      .eq("is_active", true)
      .single();

    if (!adAccountRecord) {
      return NextResponse.json(
        { error: "Ad account not found or inactive" },
        { status: 404 },
      );
    }

    const campaigns = await metaClient.getCampaigns(
      adAccountRecord.facebook_ad_account_id,
      [
        "id",
        "name",
        "status",
        "objective",
        "daily_budget",
        "lifetime_budget",
        "created_time",
        "updated_time",
      ],
    );

    return NextResponse.json({
      success: true,
      account: adAccountRecord,
      campaigns: campaigns || [],
      count: campaigns?.length || 0,
    });
  } catch (error: any) {
    console.error("Get campaigns error:", error);
    return NextResponse.json(
      { error: "Failed to fetch campaigns" },
      { status: 500 },
    );
  }
}
