import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { requireAuth, createErrorResponse } from "@/app/lib/api/auth-check";

interface RouteParams {
  params: {
    leadId: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const userWithOrg = await requireAuth();
    const supabase = await createClient();
    const { leadId } = params;

    if (!leadId) {
      return NextResponse.json(
        { error: "Lead ID is required" },
        { status: 400 },
      );
    }

    const { searchParams } = new URL(request.url);
    const insightType = searchParams.get("type");
    const includeExpired = searchParams.get("includeExpired") === "true";

    console.log("Fetching lead insights:", {
      leadId,
      organizationId: userWithOrg.organizationId,
      insightType,
      includeExpired,
    });

    // Build query for AI insights
    let insightsQuery = supabase
      .from("lead_ai_insights")
      .select("*")
      .eq("lead_id", leadId)
      .eq("organization_id", userWithOrg.organizationId)
      .order("created_at", { ascending: false });

    if (insightType) {
      insightsQuery = insightsQuery.eq("insight_type", insightType);
    }

    if (!includeExpired) {
      insightsQuery = insightsQuery.gt("expires_at", new Date().toISOString());
    }

    const { data: insights, error: insightsError } = await insightsQuery;

    if (insightsError) {
      console.error("Error fetching insights:", insightsError);
      return NextResponse.json(
        { error: "Failed to fetch insights" },
        { status: 500 },
      );
    }

    // Get lead scoring factors
    const { data: scoringFactors } = await supabase
      .from("lead_scoring_factors")
      .select("*")
      .eq("lead_id", leadId)
      .eq("organization_id", userWithOrg.organizationId)
      .single();

    // Get scoring breakdown
    const { data: breakdown } = await supabase.rpc(
      "get_lead_scoring_breakdown",
      { lead_id: leadId },
    );

    // Get recent activities
    const { data: activities } = await supabase
      .from("lead_activities")
      .select("*")
      .eq("lead_id", leadId)
      .eq("organization_id", userWithOrg.organizationId)
      .order("created_at", { ascending: false })
      .limit(20);

    // Get lead score history
    const { data: scoreHistory } = await supabase
      .from("lead_score_history")
      .select("*")
      .eq("lead_id", leadId)
      .eq("organization_id", userWithOrg.organizationId)
      .order("created_at", { ascending: false })
      .limit(10);

    // Organize insights by type for easier consumption
    const insightsByType = (insights || []).reduce((acc, insight) => {
      if (!acc[insight.insight_type]) {
        acc[insight.insight_type] = [];
      }
      acc[insight.insight_type].push({
        ...insight,
        age_minutes: Math.round(
          (Date.now() - new Date(insight.created_at).getTime()) / 60000,
        ),
        is_expired:
          insight.expires_at && new Date(insight.expires_at) < new Date(),
      });
      return acc;
    }, {});

    // Calculate freshness metrics
    const freshInsights = (insights || []).filter(
      (i) => !i.expires_at || new Date(i.expires_at) > new Date(),
    );

    const avgInsightAge =
      insights?.length > 0
        ? insights.reduce(
            (sum, i) => sum + (Date.now() - new Date(i.created_at).getTime()),
            0,
          ) /
          insights.length /
          60000
        : 0;

    // Get latest enhanced analysis summary
    const latestBuyingSignals = insightsByType.buying_signals?.[0];
    const latestSentiment = insightsByType.sentiment_analysis?.[0];
    const latestConversion = insightsByType.conversion_likelihood?.[0];

    const enhancedSummary = {
      conversionProbability: latestConversion?.insight_data?.percentage || null,
      sentiment: latestSentiment?.insight_data?.overall || null,
      buyingSignalStrength: latestBuyingSignals?.insight_data?.strength || null,
      urgencyLevel: latestConversion?.insight_data?.urgencyLevel || null,
      timeline: latestConversion?.insight_data?.timeline || null,
      lastAnalyzed: insights?.[0]?.created_at || null,
      analysisConfidence: {
        buying_signals: latestBuyingSignals?.confidence_score || 0,
        sentiment: latestSentiment?.confidence_score || 0,
        conversion: latestConversion?.confidence_score || 0,
        overall:
          insights?.length > 0
            ? insights.reduce((sum, i) => sum + (i.confidence_score || 0), 0) /
              insights.length
            : 0,
      },
    };

    return NextResponse.json({
      success: true,
      leadId,
      summary: enhancedSummary,
      insights: {
        byType: insightsByType,
        all: insights || [],
        fresh: freshInsights,
        expired: (insights || []).filter(
          (i) => i.expires_at && new Date(i.expires_at) < new Date(),
        ),
      },
      scoring: {
        factors: scoringFactors || null,
        breakdown: breakdown || [],
        history: scoreHistory || [],
      },
      activities: activities || [],
      metrics: {
        totalInsights: insights?.length || 0,
        freshInsights: freshInsights.length,
        avgInsightAgeMinutes: Math.round(avgInsightAge),
        lastUpdated: insights?.[0]?.created_at || null,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in lead insights API:", error);
    return createErrorResponse(error);
  }
}
