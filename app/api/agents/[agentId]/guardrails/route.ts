import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

/**
 * Agent Guardrails API
 *
 * GET    /api/agents/[agentId]/guardrails - Get all guardrails for an agent
 * PUT    /api/agents/[agentId]/guardrails - Update agent's guardrails (replace all)
 */

/**
 * GET /api/agents/[agentId]/guardrails
 * Get all guardrails linked to a specific agent (ordered by sort_order)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params;
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

    // Verify agent exists and belongs to organization
    const { data: agent, error: agentError } = await supabase
      .from("ai_agents")
      .select("id")
      .eq("id", agentId)
      .eq("organization_id", organizationId)
      .single();

    if (agentError || !agent) {
      return NextResponse.json(
        { error: "Agent not found" },
        { status: 404 }
      );
    }

    // Fetch all guardrails for this agent (ordered by sort_order)
    const { data: agentGuardrails, error: guardrailsError } = await supabase
      .from("agent_guardrails")
      .select(`
        sort_order,
        guardrail:guardrails(
          id,
          name,
          description,
          type,
          config,
          enabled,
          created_at,
          updated_at
        )
      `)
      .eq("agent_id", agentId)
      .order("sort_order", { ascending: true });

    if (guardrailsError) {
      console.error("[Agent Guardrails API] Error fetching guardrails:", guardrailsError);
      return NextResponse.json(
        { error: "Failed to fetch agent guardrails" },
        { status: 500 }
      );
    }

    // Transform data to flat structure
    const guardrails = (agentGuardrails || []).map((ag: any) => ({
      ...ag.guardrail,
      sort_order: ag.sort_order,
    }));

    return NextResponse.json({
      success: true,
      data: guardrails,
      total: guardrails.length,
    });

  } catch (error: any) {
    console.error("[Agent Guardrails API] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/agents/[agentId]/guardrails
 * Replace all guardrails for an agent
 *
 * Request body:
 * {
 *   "guardrails": [
 *     { "guardrailId": "uuid-1", "sortOrder": 0 },
 *     { "guardrailId": "uuid-2", "sortOrder": 1 }
 *   ]
 * }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params;
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

    // Verify agent exists and belongs to organization
    const { data: agent, error: agentError } = await supabase
      .from("ai_agents")
      .select("id")
      .eq("id", agentId)
      .eq("organization_id", organizationId)
      .single();

    if (agentError || !agent) {
      return NextResponse.json(
        { error: "Agent not found" },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { guardrails } = body;

    if (!Array.isArray(guardrails)) {
      return NextResponse.json(
        { error: "Invalid guardrails array" },
        { status: 400 }
      );
    }

    // Verify all guardrails exist and belong to organization
    const guardrailIds = guardrails.map((g) => g.guardrailId).filter(Boolean);

    if (guardrailIds.length > 0) {
      const { data: validGuardrails, error: validateError } = await supabase
        .from("guardrails")
        .select("id")
        .eq("organization_id", organizationId)
        .in("id", guardrailIds);

      if (validateError || !validGuardrails || validGuardrails.length !== guardrailIds.length) {
        return NextResponse.json(
          { error: "One or more guardrails not found or do not belong to your organization" },
          { status: 404 }
        );
      }
    }

    // Delete all existing agent_guardrails links for this agent
    const { error: deleteError } = await supabase
      .from("agent_guardrails")
      .delete()
      .eq("agent_id", agentId);

    if (deleteError) {
      console.error("[Agent Guardrails API] Error deleting existing links:", deleteError);
      return NextResponse.json(
        { error: "Failed to update agent guardrails" },
        { status: 500 }
      );
    }

    // Insert new links (if any)
    if (guardrails.length > 0) {
      const links = guardrails.map((g, index) => ({
        agent_id: agentId,
        guardrail_id: g.guardrailId,
        sort_order: g.sortOrder !== undefined ? g.sortOrder : index,
      }));

      const { error: insertError } = await supabase
        .from("agent_guardrails")
        .insert(links);

      if (insertError) {
        console.error("[Agent Guardrails API] Error inserting new links:", insertError);
        return NextResponse.json(
          { error: "Failed to update agent guardrails" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: `Agent guardrails updated (${guardrails.length} guardrail(s))`,
    });

  } catch (error: any) {
    console.error("[Agent Guardrails API] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
