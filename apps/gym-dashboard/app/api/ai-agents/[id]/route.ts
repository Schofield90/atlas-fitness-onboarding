import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/app/lib/api/auth-check";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { z } from "zod";

const updateAgentSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().min(1).max(500).optional(),
  system_prompt: z.string().min(1).optional(),
  model: z
    .enum([
      "gpt-5",
      "gpt-5-mini",
      "gpt-4o",
      "gpt-4o-mini",
      "claude-sonnet-4-20250514",
      "claude-3-5-sonnet-20241022",
      "claude-3-5-haiku-20241022",
    ])
    .optional(),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().min(1).max(32000).optional(),
  allowed_tools: z.array(z.string()).optional(),
  enabled: z.boolean().optional(),
  role: z
    .enum(["customer_support", "financial", "social_media", "custom"])
    .optional(),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const { id: userId, organizationId } = await requireAuth();
    const supabase = createAdminClient();
    const { id } = await context.params;

    const { data: agent, error } = await supabase
      .from("ai_agents")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !agent) {
      return NextResponse.json(
        { success: false, error: "Agent not found" },
        { status: 404 },
      );
    }

    // Verify access: must be default agent OR belong to user's organization
    if (!agent.is_default && agent.organization_id !== organizationId) {
      return NextResponse.json(
        { success: false, error: "Access denied" },
        { status: 403 },
      );
    }

    return NextResponse.json({ success: true, agent });
  } catch (error: any) {
    console.error("Error in GET /api/ai-agents/[id]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: error.status || 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const { id: userId, organizationId } = await requireAuth();
    const supabase = createAdminClient();
    const { id } = await context.params;

    // Fetch existing agent
    const { data: existingAgent, error: fetchError } = await supabase
      .from("ai_agents")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !existingAgent) {
      return NextResponse.json(
        { success: false, error: "Agent not found" },
        { status: 404 },
      );
    }

    // Verify access
    if (
      !existingAgent.is_default &&
      existingAgent.organization_id !== organizationId
    ) {
      return NextResponse.json(
        { success: false, error: "Access denied" },
        { status: 403 },
      );
    }

    // Prevent modification of default agents
    if (existingAgent.is_default) {
      return NextResponse.json(
        { success: false, error: "Cannot modify default agents" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const validatedData = updateAgentSchema.parse(body);

    // Build update object with only provided fields
    const updateData: any = {};
    if (validatedData.name !== undefined) updateData.name = validatedData.name;
    if (validatedData.description !== undefined)
      updateData.description = validatedData.description;
    if (validatedData.system_prompt !== undefined)
      updateData.system_prompt = validatedData.system_prompt;
    if (validatedData.model !== undefined)
      updateData.model = validatedData.model;
    if (validatedData.temperature !== undefined)
      updateData.temperature = validatedData.temperature;
    if (validatedData.max_tokens !== undefined)
      updateData.max_tokens = validatedData.max_tokens;
    if (validatedData.allowed_tools !== undefined)
      updateData.allowed_tools = validatedData.allowed_tools;
    if (validatedData.enabled !== undefined)
      updateData.enabled = validatedData.enabled;
    if (validatedData.role !== undefined) updateData.role = validatedData.role;

    const { data: agent, error: updateError } = await supabase
      .from("ai_agents")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating agent:", updateError);
      return NextResponse.json(
        { success: false, error: "Failed to update agent" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, agent });
  } catch (error: any) {
    console.error("Error in PUT /api/ai-agents/[id]:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation error",
          details: error.errors,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: error.status || 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const { id: userId, organizationId } = await requireAuth();
    const supabase = createAdminClient();
    const { id } = await context.params;

    // Fetch existing agent
    const { data: existingAgent, error: fetchError } = await supabase
      .from("ai_agents")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !existingAgent) {
      return NextResponse.json(
        { success: false, error: "Agent not found" },
        { status: 404 },
      );
    }

    // Verify access
    if (existingAgent.organization_id !== organizationId) {
      return NextResponse.json(
        { success: false, error: "Access denied" },
        { status: 403 },
      );
    }

    // Prevent deletion of default agents
    if (existingAgent.is_default) {
      return NextResponse.json(
        { success: false, error: "Cannot delete default agents" },
        { status: 403 },
      );
    }

    // Delete related data (CASCADE should handle this, but being explicit)
    await supabase.from("ai_agent_tasks").delete().eq("agent_id", id);
    await supabase.from("ai_agent_activity_logs").delete().eq("agent_id", id);

    // Delete messages for conversations with this agent
    const { data: conversations } = await supabase
      .from("ai_agent_conversations")
      .select("id")
      .eq("agent_id", id);

    if (conversations && conversations.length > 0) {
      const conversationIds = conversations.map((c) => c.id);
      await supabase
        .from("ai_agent_messages")
        .delete()
        .in("conversation_id", conversationIds);
    }

    await supabase.from("ai_agent_conversations").delete().eq("agent_id", id);

    // Delete the agent
    const { error: deleteError } = await supabase
      .from("ai_agents")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("Error deleting agent:", deleteError);
      return NextResponse.json(
        { success: false, error: "Failed to delete agent" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in DELETE /api/ai-agents/[id]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: error.status || 500 },
    );
  }
}
