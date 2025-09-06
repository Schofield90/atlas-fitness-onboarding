import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

interface CampaignData {
  id: string;
  facebook_campaign_id: string;
  current_budget: number;
  spend: number;
  leads: number;
  clicks: number;
  impressions: number;
}

interface BudgetRecommendation {
  campaign_id: string;
  campaign_name: string;
  current_budget: number;
  recommended_budget: number;
  reason: string;
  impact: "increase" | "decrease" | "maintain";
  priority: "high" | "medium" | "low";
  potential_leads_change: number;
  confidence: number;
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

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

    const body = await request.json();
    const {
      account_id,
      campaigns,
    }: { account_id: string; campaigns: CampaignData[] } = body;

    if (!account_id || !campaigns || campaigns.length === 0) {
      return NextResponse.json(
        {
          error: "Missing required fields: account_id, campaigns",
        },
        { status: 400 },
      );
    }

    // Get campaign details from database
    const { data: campaignDetails, error } = await supabase
      .from("facebook_campaigns")
      .select("id, campaign_name, facebook_campaign_id")
      .in(
        "facebook_campaign_id",
        campaigns.map((c) => c.facebook_campaign_id),
      )
      .eq("organization_id", user.organization_id);

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Failed to fetch campaign details" },
        { status: 500 },
      );
    }

    const recommendations: BudgetRecommendation[] = [];
    const campaignNameMap = new Map(
      campaignDetails?.map((c) => [c.facebook_campaign_id, c.campaign_name]) ||
        [],
    );

    // Calculate totals for context
    const totalBudget = campaigns.reduce((sum, c) => sum + c.current_budget, 0);
    const totalSpend = campaigns.reduce((sum, c) => sum + c.spend, 0);
    const totalLeads = campaigns.reduce((sum, c) => sum + c.leads, 0);
    const budgetUtilization =
      totalBudget > 0 ? (totalSpend / totalBudget) * 100 : 0;

    // Analyze each campaign
    campaigns.forEach((campaign) => {
      const campaignName =
        campaignNameMap.get(campaign.facebook_campaign_id) ||
        `Campaign ${campaign.id}`;

      // Calculate key metrics
      const costPerLead =
        campaign.leads > 0 ? campaign.spend / campaign.leads : Infinity;
      const clickThroughRate =
        campaign.impressions > 0
          ? (campaign.clicks / campaign.impressions) * 100
          : 0;
      const conversionRate =
        campaign.clicks > 0 ? (campaign.leads / campaign.clicks) * 100 : 0;
      const budgetUtilizationRate =
        campaign.current_budget > 0
          ? (campaign.spend / campaign.current_budget) * 100
          : 0;

      // Calculate average metrics for comparison
      const avgCostPerLead = totalLeads > 0 ? totalSpend / totalLeads : 0;
      const avgCTR =
        campaigns.reduce(
          (sum, c) =>
            sum + (c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0),
          0,
        ) / campaigns.length;
      const avgConversionRate =
        campaigns.reduce(
          (sum, c) => sum + (c.clicks > 0 ? (c.leads / c.clicks) * 100 : 0),
          0,
        ) / campaigns.length;

      // AI-powered budget optimization logic
      let recommendedBudget = campaign.current_budget;
      let reason = "Campaign performance is within expected range";
      let impact: "increase" | "decrease" | "maintain" = "maintain";
      let priority: "high" | "medium" | "low" = "low";
      let potentialLeadsChange = 0;
      let confidence = 70;

      // High-performing campaign (increase budget)
      if (
        (costPerLead < avgCostPerLead * 0.8 && campaign.leads >= 5) ||
        (conversionRate > avgConversionRate * 1.2 &&
          clickThroughRate > avgCTR * 1.1)
      ) {
        const increasePercentage =
          costPerLead < avgCostPerLead * 0.6 ? 0.5 : 0.3; // 50% or 30% increase
        recommendedBudget = campaign.current_budget * (1 + increasePercentage);
        reason = `Strong performance: ${costPerLead.toFixed(2)} cost per lead vs ${avgCostPerLead.toFixed(2)} average. Increase budget to scale results.`;
        impact = "increase";
        priority = costPerLead < avgCostPerLead * 0.6 ? "high" : "medium";
        potentialLeadsChange = Math.floor(
          (recommendedBudget - campaign.current_budget) / costPerLead,
        );
        confidence = 85;
      }

      // Poor performing campaign (decrease budget or pause)
      else if (
        (costPerLead > avgCostPerLead * 1.5 && campaign.leads < 3) ||
        (conversionRate < avgConversionRate * 0.5 && campaign.clicks > 50) ||
        (budgetUtilizationRate > 90 && campaign.leads === 0)
      ) {
        if (
          campaign.leads === 0 &&
          campaign.spend > campaign.current_budget * 0.5
        ) {
          recommendedBudget = campaign.current_budget * 0.3; // Significant decrease
          reason =
            "No leads generated despite significant spend. Consider pausing or reducing budget dramatically.";
          priority = "high";
        } else {
          recommendedBudget = campaign.current_budget * 0.7; // 30% decrease
          reason = `Underperforming: ${costPerLead === Infinity ? "No leads" : costPerLead.toFixed(2) + " cost per lead"} vs ${avgCostPerLead.toFixed(2)} average. Reduce budget.`;
          priority = "medium";
        }
        impact = "decrease";
        potentialLeadsChange = -Math.floor(
          (campaign.current_budget - recommendedBudget) /
            Math.max(costPerLead, avgCostPerLead),
        );
        confidence = 80;
      }

      // Budget optimization opportunities
      else if (budgetUtilizationRate < 60 && campaign.leads > 0) {
        recommendedBudget = campaign.spend * 1.2; // Set budget 20% above current spend
        reason = `Budget underutilized (${budgetUtilizationRate.toFixed(1)}% spent). Optimize budget to match actual spend patterns.`;
        impact = "decrease";
        priority = "low";
        confidence = 65;
      }

      // High budget utilization with good performance
      else if (
        budgetUtilizationRate > 95 &&
        costPerLead <= avgCostPerLead * 1.1 &&
        campaign.leads >= 3
      ) {
        recommendedBudget = campaign.current_budget * 1.25; // 25% increase
        reason = `High budget utilization (${budgetUtilizationRate.toFixed(1)}%) with good performance. Increase budget for more leads.`;
        impact = "increase";
        priority = "medium";
        potentialLeadsChange = Math.floor(
          (recommendedBudget - campaign.current_budget) / costPerLead,
        );
        confidence = 75;
      }

      // Only add recommendation if it's significantly different from current budget
      if (
        Math.abs(recommendedBudget - campaign.current_budget) >
        campaign.current_budget * 0.1
      ) {
        recommendations.push({
          campaign_id: campaign.id,
          campaign_name: campaignName,
          current_budget: campaign.current_budget,
          recommended_budget: Math.round(recommendedBudget),
          reason,
          impact,
          priority,
          potential_leads_change: potentialLeadsChange,
          confidence,
        });
      }
    });

    // Sort recommendations by priority and potential impact
    recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityDiff =
        priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;

      // Then by potential leads change (descending)
      return (
        Math.abs(b.potential_leads_change) - Math.abs(a.potential_leads_change)
      );
    });

    // Calculate performance insights
    const sortedByCostPerLead = campaigns
      .filter((c) => c.leads > 0)
      .sort((a, b) => a.spend / a.leads - b.spend / b.leads);

    const sortedByLeads = campaigns.sort((a, b) => b.leads - a.leads);

    const bestPerformingCampaigns = sortedByCostPerLead
      .slice(0, 3)
      .map(
        (c) =>
          campaignNameMap.get(c.facebook_campaign_id) || `Campaign ${c.id}`,
      );

    const underperformingCampaigns = campaigns
      .filter(
        (c) =>
          c.leads === 0 ||
          (c.leads > 0 && c.spend / c.leads > (totalSpend / totalLeads) * 1.5),
      )
      .slice(0, 3)
      .map(
        (c) =>
          campaignNameMap.get(c.facebook_campaign_id) || `Campaign ${c.id}`,
      );

    // Estimate budget waste
    const budgetWasteAmount = campaigns
      .filter((c) => c.leads === 0 && c.spend > c.current_budget * 0.3)
      .reduce((sum, c) => sum + (c.spend - c.current_budget * 0.1), 0);

    const optimizationData = {
      total_budget: totalBudget,
      total_spend: totalSpend,
      budget_utilization: budgetUtilization,
      recommendations,
      performance_insights: {
        best_performing_campaigns: bestPerformingCampaigns,
        underperforming_campaigns: underperformingCampaigns,
        budget_waste_amount: Math.max(0, budgetWasteAmount),
      },
    };

    return NextResponse.json(optimizationData);
  } catch (error) {
    console.error("Error generating budget optimization:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
