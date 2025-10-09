import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/app/lib/api/auth-check";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { AgentOrchestrator } from "@/lib/ai-agents/orchestrator";
import { z } from "zod";

const sendMessageSchema = z.object({
  content: z.string().min(1, "Message content is required"),
});

const messagesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/ai-agents/conversations/[id]/messages
 * List messages for conversation
 */
export async function GET(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const { organizationId } = await requireAuth();
    const supabase = createAdminClient();
    const { id: conversationId } = await context.params;

    // Verify conversation belongs to organization
    const { data: conversation, error: convError } = await supabase
      .from("ai_agent_conversations")
      .select("id, organization_id")
      .eq("id", conversationId)
      .single();

    if (convError || !conversation) {
      return NextResponse.json(
        { success: false, error: "Conversation not found" },
        { status: 404 },
      );
    }

    if (conversation.organization_id !== organizationId) {
      return NextResponse.json(
        { success: false, error: "Access denied" },
        { status: 403 },
      );
    }

    // Parse query parameters
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const query = messagesQuerySchema.parse(searchParams);

    const { page, limit } = query;
    const offset = (page - 1) * limit;

    // Get messages with pagination
    const {
      data: messages,
      error,
      count,
    } = await supabase
      .from("ai_agent_messages")
      .select("*", { count: "exact" })
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Error fetching messages:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch messages" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      messages: messages || [],
      conversationId,
      total: count || 0,
      page,
      limit,
      hasMore: (count || 0) > offset + limit,
    });
  } catch (error: any) {
    console.error(
      "Error in GET /api/ai-agents/conversations/[id]/messages:",
      error,
    );

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid query parameters",
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

/**
 * POST /api/ai-agents/conversations/[id]/messages
 * Send message to agent and get response
 */
export async function POST(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const { organizationId, id: userId } = await requireAuth();
    const supabase = createAdminClient();
    const { id: conversationId } = await context.params;

    // Verify conversation belongs to organization
    const { data: conversation, error: convError } = await supabase
      .from("ai_agent_conversations")
      .select(
        `
        id,
        organization_id,
        status,
        agent:ai_agents!inner(id, name, enabled)
      `,
      )
      .eq("id", conversationId)
      .single();

    if (convError || !conversation) {
      return NextResponse.json(
        { success: false, error: "Conversation not found" },
        { status: 404 },
      );
    }

    if (conversation.organization_id !== organizationId) {
      return NextResponse.json(
        { success: false, error: "Access denied" },
        { status: 403 },
      );
    }

    // Check conversation is active
    if (conversation.status === "deleted") {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot send messages to deleted conversations",
        },
        { status: 400 },
      );
    }

    // Check agent is enabled
    const agent = conversation.agent as any;
    if (!agent.enabled) {
      return NextResponse.json(
        { success: false, error: "Agent is currently disabled" },
        { status: 400 },
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = sendMessageSchema.parse(body);

    // Execute conversation message via orchestrator
    const orchestrator = new AgentOrchestrator();
    const result = await orchestrator.executeConversationMessage({
      conversationId,
      userMessage: validatedData.content,
      organizationId,
      userId,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Failed to execute message",
        },
        { status: 500 },
      );
    }

    // Return both user and assistant messages with cost information
    return NextResponse.json({
      success: true,
      userMessage: result.userMessage,
      assistantMessage: result.assistantMessage,
      cost: {
        inputTokens: result.cost.inputTokens,
        outputTokens: result.cost.outputTokens,
        totalTokens: result.cost.totalTokens,
        costUsd: result.cost.costBilledCents / 100,
        model: result.cost.model,
      },
      conversationId,
    });
  } catch (error: any) {
    console.error(
      "Error in POST /api/ai-agents/conversations/[id]/messages:",
      error,
    );

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
