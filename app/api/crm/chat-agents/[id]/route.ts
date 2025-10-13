import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { requireAuth } from "@/app/lib/api/auth-check";

/**
 * GET /api/crm/chat-agents/[id]
 *
 * Fetch a single AI chat agent by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAuth();
    if (!authResult.success || !authResult.data) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { organization } = authResult.data;
    const { id } = params;

    const supabase = createAdminClient();

    const { data: agent, error } = await supabase
      .from("ai_agents")
      .select("*")
      .eq("id", id)
      .eq("organization_id", organization.id)
      .single();

    if (error || !agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      agent,
    });
  } catch (error: any) {
    console.error("[Chat Agents API] Error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/crm/chat-agents/[id]
 *
 * Update an AI chat agent
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAuth();
    if (!authResult.success || !authResult.data) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { organization } = authResult.data;
    const { id } = params;
    const updates = await request.json();

    const supabase = createAdminClient();

    // Verify agent belongs to organization
    const { data: existingAgent } = await supabase
      .from("ai_agents")
      .select("id")
      .eq("id", id)
      .eq("organization_id", organization.id)
      .single();

    if (!existingAgent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Update agent
    const { data: agent, error } = await supabase
      .from("ai_agents")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[Chat Agents API] Error updating agent:", error);
      return NextResponse.json(
        { error: "Failed to update agent" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      agent,
    });
  } catch (error: any) {
    console.error("[Chat Agents API] Error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/crm/chat-agents/[id]
 *
 * Delete an AI chat agent
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAuth();
    if (!authResult.success || !authResult.data) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { organization } = authResult.data;
    const { id } = params;

    const supabase = createAdminClient();

    // Verify agent belongs to organization
    const { data: existingAgent } = await supabase
      .from("ai_agents")
      .select("id")
      .eq("id", id)
      .eq("organization_id", organization.id)
      .single();

    if (!existingAgent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Delete agent (conversations and messages will cascade if foreign keys set)
    const { error } = await supabase.from("ai_agents").delete().eq("id", id);

    if (error) {
      console.error("[Chat Agents API] Error deleting agent:", error);
      return NextResponse.json(
        { error: "Failed to delete agent" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Agent deleted successfully",
    });
  } catch (error: any) {
    console.error("[Chat Agents API] Error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
