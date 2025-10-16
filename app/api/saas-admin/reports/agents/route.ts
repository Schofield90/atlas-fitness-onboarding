import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabaseAdmin = createAdminClient();

    // Check if super admin (can see all organizations)
    const isSuperAdmin = user.email?.endsWith('@gymleadhub.co.uk') ||
                         user.email?.endsWith('@atlas-gyms.co.uk');

    let organizationId: string | null = null;

    if (isSuperAdmin) {
      // Super admins: use first organization they have access to, or query parameter
      const { searchParams } = new URL(request.url);
      const orgParam = searchParams.get('org');

      if (orgParam) {
        organizationId = orgParam;
      } else {
        // Get first organization from user_organizations or organization_staff
        const { data: userOrg } = await supabaseAdmin
          .from("user_organizations")
          .select("organization_id")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle();

        if (userOrg) {
          organizationId = userOrg.organization_id;
        } else {
          const { data: staffOrg } = await supabaseAdmin
            .from("organization_staff")
            .select("organization_id")
            .eq("user_id", user.id)
            .limit(1)
            .maybeSingle();

          if (staffOrg) {
            organizationId = staffOrg.organization_id;
          }
        }
      }
    } else {
      // Regular users: check their organization membership
      let { data: userOrg } = await supabaseAdmin
        .from("user_organizations")
        .select("organization_id")
        .eq("user_id", user.id)
        .maybeSingle();

      // Fallback to organization_staff if not found
      if (!userOrg) {
        const { data: staffOrg } = await supabaseAdmin
          .from("organization_staff")
          .select("organization_id")
          .eq("user_id", user.id)
          .maybeSingle();

        userOrg = staffOrg;
      }

      organizationId = userOrg?.organization_id || null;
    }

    if (!organizationId) {
      return NextResponse.json({
        agents: [],
        organizationId: null,
        message: "No organization found for user"
      }, { status: 200 });
    }

    // Fetch GHL lead follow-up agents for this organization using admin client
    // Only include agents with GoHighLevel integration configured
    const { data: allAgents, error: agentsError } = await supabaseAdmin
      .from("ai_agents")
      .select("id, name, organization_id, ghl_api_key, ghl_calendar_id, allowed_tools")
      .eq("organization_id", organizationId)
      .order("name");

    if (agentsError) {
      console.error("[Reports API] Error fetching agents:", agentsError);
      return NextResponse.json({ error: "Failed to fetch agents" }, { status: 500 });
    }

    // Filter for GHL lead agents: must have GHL configuration OR booking tool enabled
    const agents = (allAgents || []).filter(agent => {
      const hasGhlApiKey = !!agent.ghl_api_key;
      const hasGhlCalendar = !!agent.ghl_calendar_id;
      const hasBookingTool = agent.allowed_tools?.includes('book_ghl_appointment');

      return hasGhlApiKey || hasGhlCalendar || hasBookingTool;
    }).map(agent => ({
      id: agent.id,
      name: agent.name,
      organization_id: agent.organization_id
    }));

    console.log("[Reports API] Found agents:", {
      organizationId,
      agentCount: agents?.length || 0,
      isSuperAdmin
    });

    return NextResponse.json({
      agents: agents || [],
      organizationId
    });

  } catch (error: any) {
    console.error("[Reports API] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
