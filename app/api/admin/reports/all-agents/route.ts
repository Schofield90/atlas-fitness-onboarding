import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/reports/all-agents
 *
 * Get cumulative performance metrics across all AI agents
 *
 * Query Parameters:
 * - organizationId: UUID (required) - Organization to get metrics for
 * - period: 'daily' | 'weekly' | 'monthly' | 'all_time' (default: 'all_time')
 * - date: YYYY-MM-DD (default: today)
 *
 * Returns:
 * - Cumulative metrics across all agents
 * - Breakdown by individual agent
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");
    const period = searchParams.get("period") || "all_time";
    const date = searchParams.get("date") || new Date().toISOString().split("T")[0];

    if (!organizationId) {
      return NextResponse.json(
        { error: "organizationId is required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Get all agents for this organization
    const { data: agents, error: agentsError } = await supabase
      .from("ai_agents")
      .select("id, name")
      .eq("organization_id", organizationId);

    if (agentsError) {
      console.error("[All Agents Report] Failed to fetch agents:", agentsError);
      return NextResponse.json(
        { error: "Failed to fetch agents" },
        { status: 500 }
      );
    }

    // Refresh snapshots for all agents in parallel
    const refreshPromises = agents.map((agent) =>
      supabase.rpc("refresh_agent_performance_snapshot", {
        p_agent_id: agent.id,
        p_snapshot_date: date,
        p_period_type: period,
      })
    );

    await Promise.all(refreshPromises);

    // Fetch all snapshots
    const { data: snapshots, error: snapshotsError } = await supabase
      .from("agent_performance_snapshots")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("snapshot_date", date)
      .eq("period_type", period);

    if (snapshotsError) {
      console.error("[All Agents Report] Failed to fetch snapshots:", snapshotsError);
      return NextResponse.json(
        { error: "Failed to fetch snapshots" },
        { status: 500 }
      );
    }

    // Calculate cumulative metrics
    const cumulative = snapshots.reduce(
      (acc, snapshot) => ({
        totalLeads: acc.totalLeads + snapshot.total_leads,
        leadsResponded: acc.leadsResponded + snapshot.leads_responded,
        callsBooked: acc.callsBooked + snapshot.calls_booked,
        callsAnswered: acc.callsAnswered + snapshot.calls_answered,
        callsNoAnswer: acc.callsNoAnswer + snapshot.calls_no_answer,
        salesMade: acc.salesMade + snapshot.sales_made,
        salesLost: acc.salesLost + snapshot.sales_lost,
      }),
      {
        totalLeads: 0,
        leadsResponded: 0,
        callsBooked: 0,
        callsAnswered: 0,
        callsNoAnswer: 0,
        salesMade: 0,
        salesLost: 0,
      }
    );

    // Calculate cumulative percentages
    const calculatePercentage = (numerator: number, denominator: number) => {
      if (denominator === 0) return 0;
      return Math.round((numerator / denominator) * 100 * 100) / 100; // 2 decimal places
    };

    const cumulativeMetrics = {
      ...cumulative,
      responseRate: calculatePercentage(cumulative.leadsResponded, cumulative.totalLeads),
      bookingRate: calculatePercentage(cumulative.callsBooked, cumulative.leadsResponded),
      pickupRate: calculatePercentage(cumulative.callsAnswered, cumulative.callsBooked),
      closeRate: calculatePercentage(cumulative.salesMade, cumulative.callsAnswered),
      leadToSaleRate: calculatePercentage(cumulative.salesMade, cumulative.totalLeads),
    };

    // Build breakdown by agent
    const agentBreakdown = snapshots.map((snapshot) => {
      const agent = agents.find((a) => a.id === snapshot.agent_id);
      return {
        agentId: snapshot.agent_id,
        agentName: agent?.name || "Unknown",
        metrics: {
          totalLeads: snapshot.total_leads,
          leadsResponded: snapshot.leads_responded,
          callsBooked: snapshot.calls_booked,
          callsAnswered: snapshot.calls_answered,
          callsNoAnswer: snapshot.calls_no_answer,
          salesMade: snapshot.sales_made,
          salesLost: snapshot.sales_lost,
          responseRate: snapshot.response_rate,
          bookingRate: snapshot.booking_rate,
          pickupRate: snapshot.pickup_rate,
          closeRate: snapshot.close_rate,
          leadToSaleRate: snapshot.lead_to_sale_rate,
        },
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        organizationId,
        period,
        date,
        totalAgents: agents.length,
        cumulative: cumulativeMetrics,
        agents: agentBreakdown,
      },
    });
  } catch (error: any) {
    console.error("[All Agents Report] Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
