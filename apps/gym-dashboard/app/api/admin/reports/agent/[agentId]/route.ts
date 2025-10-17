import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/reports/agent/[agentId]
 *
 * Get performance metrics for a specific AI agent
 *
 * Query Parameters:
 * - period: 'daily' | 'weekly' | 'monthly' | 'all_time' (default: 'all_time')
 * - date: YYYY-MM-DD (default: today)
 *
 * Returns calculated metrics:
 * - Total leads
 * - Leads responded
 * - Calls booked
 * - Calls answered
 * - Sales made
 * - Response rate %
 * - Booking rate %
 * - Pickup rate %
 * - Close rate %
 * - Lead to sale %
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { agentId: string } }
) {
  try {
    const { agentId } = params;
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "all_time";
    const date = searchParams.get("date") || new Date().toISOString().split("T")[0];

    const supabase = createAdminClient();

    // Refresh snapshot for requested period
    const { error: refreshError } = await supabase.rpc(
      "refresh_agent_performance_snapshot",
      {
        p_agent_id: agentId,
        p_snapshot_date: date,
        p_period_type: period,
      }
    );

    if (refreshError) {
      console.error("[Agent Report] Failed to refresh snapshot:", refreshError);
      return NextResponse.json(
        { error: "Failed to calculate metrics" },
        { status: 500 }
      );
    }

    // Fetch the snapshot
    const { data: snapshot, error: snapshotError } = await supabase
      .from("agent_performance_snapshots")
      .select("*")
      .eq("agent_id", agentId)
      .eq("snapshot_date", date)
      .eq("period_type", period)
      .single();

    if (snapshotError) {
      console.error("[Agent Report] Failed to fetch snapshot:", snapshotError);
      return NextResponse.json(
        { error: "Report not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        agentId,
        period,
        date,
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
        updatedAt: snapshot.updated_at,
      },
    });
  } catch (error: any) {
    console.error("[Agent Report] Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
