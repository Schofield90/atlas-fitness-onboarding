import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { requireAuth, createErrorResponse } from "@/app/lib/api/auth-check";

export async function GET(request: NextRequest) {
  try {
    const userWithOrg = await requireAuth();
    const supabase = await createClient();

    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get("leadId");
    const includeHistory = searchParams.get("includeHistory") === "true";
    const includeBreakdown = searchParams.get("includeBreakdown") === "true";

    if (leadId) {
      // Get specific lead scoring information
      const response: any = {
        success: true,
        leadId,
      };

      // Get current scoring factors
      const { data: scoringFactors } = await supabase
        .from("lead_scoring_factors")
        .select("*")
        .eq("lead_id", leadId)
        .eq("organization_id", userWithOrg.organizationId)
        .single();

      if (scoringFactors) {
        response.currentScore = scoringFactors.total_score;
        response.scoringFactors = scoringFactors;
      }

      // Get scoring breakdown if requested
      if (includeBreakdown) {
        const { data: breakdown } = await supabase.rpc(
          "get_lead_scoring_breakdown",
          { lead_id: leadId },
        );

        response.breakdown = breakdown || [];
      }

      // Get score history if requested
      if (includeHistory) {
        const { data: history } = await supabase
          .from("lead_score_history")
          .select("*")
          .eq("lead_id", leadId)
          .eq("organization_id", userWithOrg.organizationId)
          .order("created_at", { ascending: false })
          .limit(10);

        response.history = history || [];
      }

      // Get latest AI insights
      const { data: insights } = await supabase
        .from("lead_ai_insights")
        .select("*")
        .eq("lead_id", leadId)
        .eq("organization_id", userWithOrg.organizationId)
        .order("created_at", { ascending: false })
        .limit(5);

      response.insights = insights || [];

      return NextResponse.json(response);
    } else {
      // Get scoring dashboard data for all leads
      const { data: leadsWithScoring, error } = await supabase
        .from("lead_scoring_dashboard")
        .select("*")
        .eq("organization_id", userWithOrg.organizationId)
        .order("lead_score", { ascending: false });

      if (error) {
        return NextResponse.json(
          { error: "Failed to fetch scoring dashboard" },
          { status: 500 },
        );
      }

      // Get organization scoring statistics
      const stats = await getOrganizationScoringStats(
        supabase,
        userWithOrg.organizationId,
      );

      return NextResponse.json({
        success: true,
        leads: leadsWithScoring || [],
        stats,
      });
    }
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const userWithOrg = await requireAuth();
    const supabase = await createClient();
    const body = await request.json();

    const { action, leadId, leadIds } = body;

    switch (action) {
      case "recalculate_single":
        if (!leadId) {
          return NextResponse.json(
            { error: "Lead ID is required" },
            { status: 400 },
          );
        }

        // Recalculate score for single lead
        const { data: newScore, error } = await supabase.rpc(
          "update_lead_score_with_history",
          {
            lead_id: leadId,
            triggered_by: "manual",
            change_reason: "Manual score recalculation",
          },
        );

        if (error) {
          return NextResponse.json(
            { error: "Failed to recalculate score" },
            { status: 500 },
          );
        }

        return NextResponse.json({
          success: true,
          leadId,
          newScore,
        });

      case "recalculate_multiple":
        if (!leadIds || !Array.isArray(leadIds)) {
          return NextResponse.json(
            { error: "Lead IDs array is required" },
            { status: 400 },
          );
        }

        const results = [];
        for (const id of leadIds) {
          try {
            const { data: score } = await supabase.rpc(
              "update_lead_score_with_history",
              {
                lead_id: id,
                triggered_by: "bulk_manual",
                change_reason: "Bulk manual score recalculation",
              },
            );

            results.push({ leadId: id, success: true, newScore: score });
          } catch (err) {
            results.push({ leadId: id, success: false, error: err });
          }
        }

        return NextResponse.json({
          success: true,
          results,
        });

      case "recalculate_organization":
        // Recalculate all scores for the organization
        const { data: updatedCount } = await supabase.rpc(
          "refresh_organization_lead_scores",
          {
            org_id: userWithOrg.organizationId,
          },
        );

        return NextResponse.json({
          success: true,
          updatedCount,
          organizationId: userWithOrg.organizationId,
        });

      case "record_activity":
        const { activityType, activityValue, metadata } = body;

        if (!leadId || !activityType) {
          return NextResponse.json(
            {
              error: "Lead ID and activity type are required",
            },
            { status: 400 },
          );
        }

        // Record the activity
        const { error: activityError } = await supabase
          .from("lead_activities")
          .insert({
            organization_id: userWithOrg.organizationId,
            lead_id: leadId,
            activity_type: activityType,
            activity_value: activityValue || 1.0,
            activity_metadata: metadata || {},
          });

        if (activityError) {
          return NextResponse.json(
            { error: "Failed to record activity" },
            { status: 500 },
          );
        }

        return NextResponse.json({
          success: true,
          leadId,
          activityRecorded: true,
        });

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    return createErrorResponse(error);
  }
}

async function getOrganizationScoringStats(
  supabase: any,
  organizationId: string,
) {
  try {
    // Get lead count by temperature
    const { data: temperatureStats } = await supabase
      .from("leads")
      .select("lead_score")
      .eq("organization_id", organizationId);

    const stats: any = {
      totalLeads: temperatureStats?.length || 0,
      hot: 0,
      warm: 0,
      lukewarm: 0,
      cold: 0,
      averageScore: 0,
      scoringCoverage: 0,
    };

    if (temperatureStats) {
      const scores = temperatureStats.map((l) => l.lead_score || 0);
      stats.averageScore = Math.round(
        scores.reduce((a, b) => a + b, 0) / scores.length,
      );

      // Count by temperature
      scores.forEach((score) => {
        if (score >= 80) stats.hot++;
        else if (score >= 60) stats.warm++;
        else if (score >= 40) stats.lukewarm++;
        else stats.cold++;
      });

      // Calculate scoring coverage (leads with scores > 0)
      const scoredLeads = scores.filter((s) => s > 0).length;
      stats.scoringCoverage = Math.round(
        (scoredLeads / stats.totalLeads) * 100,
      );
    }

    // Get recent score changes
    const { data: recentChanges } = await supabase
      .from("lead_score_history")
      .select(
        `
        *,
        leads (name, email)
      `,
      )
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(5);

    stats.recentChanges = recentChanges || [];

    return stats;
  } catch (error) {
    console.error("Error getting scoring stats:", error);
    return {
      totalLeads: 0,
      hot: 0,
      warm: 0,
      lukewarm: 0,
      cold: 0,
      averageScore: 0,
      scoringCoverage: 0,
      recentChanges: [],
    };
  }
}
