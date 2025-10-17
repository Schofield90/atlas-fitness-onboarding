import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { createClient } from "@/app/lib/supabase/client";

/**
 * GET /api/admin/chat-agents
 *
 * Super Admin endpoint to fetch ALL AI chat agents across all organizations
 * Only accessible by sam@gymleadhub.co.uk and @gymleadhub.co.uk/@atlas-gyms.co.uk emails
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check super admin access
    const isSuperAdmin =
      user.email === 'sam@gymleadhub.co.uk' ||
      user.email?.endsWith('@gymleadhub.co.uk') ||
      user.email?.endsWith('@atlas-gyms.co.uk');

    if (!isSuperAdmin) {
      return NextResponse.json(
        { error: "Forbidden: Super admin access required" },
        { status: 403 }
      );
    }

    const supabaseAdmin = createAdminClient();

    // Fetch ALL agents across all organizations
    const { data: agents, error: agentsError } = await supabaseAdmin
      .from("ai_agents")
      .select(`
        id,
        name,
        description,
        enabled,
        model,
        ghl_webhook_url,
        ghl_api_key,
        ghl_calendar_id,
        ghl_webhook_secret,
        follow_up_config,
        booking_config,
        organization_id,
        created_at,
        updated_at,
        organizations!inner (
          id,
          name
        )
      `)
      .order('created_at', { ascending: false });

    if (agentsError) {
      console.error("Error fetching agents:", agentsError);
      return NextResponse.json(
        { error: "Failed to fetch agents" },
        { status: 500 }
      );
    }

    // Fetch stats for each agent
    const agentsWithStats = await Promise.all(
      (agents || []).map(async (agent: any) => {
        // Count conversations
        const { count: conversationsCount } = await supabaseAdmin
          .from("ai_agent_conversations")
          .select("*", { count: "exact", head: true })
          .eq("agent_id", agent.id);

        // Count lead conversions (leads with status 'converted' or 'booked')
        const { count: conversionsCount } = await supabaseAdmin
          .from("leads")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", agent.organization_id)
          .in("status", ["converted", "booked"]);

        // Count bookings created by this agent
        const { count: bookingsCount } = await supabaseAdmin
          .from("bookings")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", agent.organization_id)
          .not("metadata", "is", null)
          .filter("metadata->>agent_id", "eq", agent.id);

        return {
          ...agent,
          organization_name: agent.organizations?.name || "Unknown",
          status: agent.enabled ? "active" : "inactive",
          stats: {
            conversations: conversationsCount || 0,
            conversions: conversionsCount || 0,
            bookings: bookingsCount || 0,
          },
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        agents: agentsWithStats,
        total: agentsWithStats.length,
        by_status: {
          active: agentsWithStats.filter(a => a.enabled).length,
          inactive: agentsWithStats.filter(a => !a.enabled).length,
        },
      },
    });
  } catch (error: any) {
    console.error("Error in GET /api/admin/chat-agents:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
