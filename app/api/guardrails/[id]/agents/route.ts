import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

/**
 * Guardrails-Agent Linking API
 *
 * POST   /api/guardrails/[id]/agents  - Link guardrail to agent(s)
 * DELETE /api/guardrails/[id]/agents  - Unlink guardrail from agent(s)
 */

/**
 * POST /api/guardrails/[id]/agents
 * Link a guardrail to one or more agents
 *
 * Request body:
 * {
 *   "agentIds": ["agent-uuid-1", "agent-uuid-2"],
 *   "sortOrder": 0  // Optional: order in which guardrails are checked (default: 0)
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: guardrailId } = await params;
    const supabase = createAdminClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get user's organization
    const { data: userOrg, error: orgError } = await supabase
      .from("user_organizations")
      .select("organization_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (orgError || !userOrg) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    const organizationId = userOrg.organization_id;

    // Verify guardrail exists and belongs to organization
    const { data: guardrail, error: guardrailError } = await supabase
      .from("guardrails")
      .select("id")
      .eq("id", guardrailId)
      .eq("organization_id", organizationId)
      .single();

    if (guardrailError || !guardrail) {
      return NextResponse.json(
        { error: "Guardrail not found" },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { agentIds, sortOrder } = body;

    if (!agentIds || !Array.isArray(agentIds) || agentIds.length === 0) {
      return NextResponse.json(
        { error: "Missing or invalid agentIds array" },
        { status: 400 }
      );
    }

    // Verify all agents belong to the organization
    const { data: agents, error: agentsError } = await supabase
      .from("ai_agents")
      .select("id")
      .eq("organization_id", organizationId)
      .in("id", agentIds);

    if (agentsError || !agents || agents.length !== agentIds.length) {
      return NextResponse.json(
        { error: "One or more agents not found or do not belong to your organization" },
        { status: 404 }
      );
    }

    // Create agent_guardrails links
    const links = agentIds.map((agentId) => ({
      agent_id: agentId,
      guardrail_id: guardrailId,
      sort_order: sortOrder !== undefined ? sortOrder : 0,
    }));

    const { data: createdLinks, error: linkError } = await supabase
      .from("agent_guardrails")
      .upsert(links, {
        onConflict: 'agent_id,guardrail_id',
        ignoreDuplicates: false, // Update sort_order if link already exists
      })
      .select();

    if (linkError) {
      console.error("[Guardrails API] Error creating agent links:", linkError);
      return NextResponse.json(
        { error: "Failed to link guardrail to agents" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: createdLinks,
      message: `Guardrail linked to ${createdLinks?.length || 0} agent(s)`,
    });

  } catch (error: any) {
    console.error("[Guardrails API] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/guardrails/[id]/agents
 * Unlink a guardrail from one or more agents
 *
 * Request body:
 * {
 *   "agentIds": ["agent-uuid-1", "agent-uuid-2"]
 * }
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: guardrailId } = await params;
    const supabase = createAdminClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get user's organization
    const { data: userOrg, error: orgError } = await supabase
      .from("user_organizations")
      .select("organization_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (orgError || !userOrg) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    const organizationId = userOrg.organization_id;

    // Verify guardrail exists and belongs to organization
    const { data: guardrail, error: guardrailError } = await supabase
      .from("guardrails")
      .select("id")
      .eq("id", guardrailId)
      .eq("organization_id", organizationId)
      .single();

    if (guardrailError || !guardrail) {
      return NextResponse.json(
        { error: "Guardrail not found" },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { agentIds } = body;

    if (!agentIds || !Array.isArray(agentIds) || agentIds.length === 0) {
      return NextResponse.json(
        { error: "Missing or invalid agentIds array" },
        { status: 400 }
      );
    }

    // Delete agent_guardrails links
    const { error: deleteError } = await supabase
      .from("agent_guardrails")
      .delete()
      .eq("guardrail_id", guardrailId)
      .in("agent_id", agentIds);

    if (deleteError) {
      console.error("[Guardrails API] Error deleting agent links:", deleteError);
      return NextResponse.json(
        { error: "Failed to unlink guardrail from agents" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Guardrail unlinked from ${agentIds.length} agent(s)`,
    });

  } catch (error: any) {
    console.error("[Guardrails API] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
