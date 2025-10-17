import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/app/lib/api/auth-check";
import { createAdminClient } from "@/app/lib/supabase/admin";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { id: userId, organizationId } = await requireAuth();
    const supabase = createAdminClient();

    // Get total agents count
    const { count: totalAgents } = await supabase
      .from("ai_agents")
      .select("*", { count: "exact", head: true })
      .or(`organization_id.eq.${organizationId},is_default.eq.true`);

    // Get active conversations count
    const { count: activeConversations } = await supabase
      .from("ai_agent_conversations")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "active");

    // Get monthly cost (current month)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const { data: activityLogs } = await supabase
      .from("ai_agent_activity_log")
      .select("cost_usd")
      .eq("organization_id", organizationId)
      .gte("created_at", startOfMonth.toISOString())
      .lte("created_at", endOfMonth.toISOString());

    const monthlyCost =
      activityLogs?.reduce(
        (sum, log) => sum + (parseFloat(log.cost_usd) || 0),
        0,
      ) || 0;

    return NextResponse.json({
      success: true,
      stats: {
        total_agents: totalAgents || 0,
        active_conversations: activeConversations || 0,
        monthly_cost: monthlyCost,
      },
    });
  } catch (error: any) {
    console.error("Error in GET /api/ai-agents/stats:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: error.status || 500 },
    );
  }
}
