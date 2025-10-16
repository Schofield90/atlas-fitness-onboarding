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

    // Try user_organizations first
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

    if (!userOrg?.organization_id) {
      return NextResponse.json({ agents: [] }, { status: 200 });
    }

    // Fetch agents for this organization using admin client
    const { data: agents, error: agentsError } = await supabaseAdmin
      .from("ai_agents")
      .select("id, name, organization_id")
      .eq("organization_id", userOrg.organization_id)
      .order("name");

    if (agentsError) {
      console.error("[Reports API] Error fetching agents:", agentsError);
      return NextResponse.json({ error: "Failed to fetch agents" }, { status: 500 });
    }

    return NextResponse.json({
      agents: agents || [],
      organizationId: userOrg.organization_id
    });

  } catch (error: any) {
    console.error("[Reports API] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
