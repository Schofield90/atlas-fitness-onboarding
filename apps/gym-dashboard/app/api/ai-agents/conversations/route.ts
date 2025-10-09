import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/app/lib/api/auth-check";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { z } from "zod";

const createConversationSchema = z.object({
  agent_id: z.string().uuid(),
  title: z.string().min(1).max(255).optional(),
});

const conversationsQuerySchema = z.object({
  agent_id: z.string().uuid().optional(),
  status: z.enum(["active", "archived", "deleted"]).optional(),
  user_id: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * GET /api/ai-agents/conversations
 * List conversations for user's organization with filtering and pagination
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { organizationId, id: userId } = await requireAuth();
    const supabase = createAdminClient();

    // Parse query parameters
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const query = conversationsQuerySchema.parse(searchParams);

    const { agent_id, status, user_id, page, limit } = query;
    const offset = (page - 1) * limit;

    // Build query
    let queryBuilder = supabase
      .from("ai_agent_conversations")
      .select(
        `
        *,
        agent:ai_agents!inner(id, name, role, avatar_url),
        user:users(id, email, full_name)
      `,
        { count: "exact" },
      )
      .eq("organization_id", organizationId);

    // Apply filters
    if (agent_id) {
      queryBuilder = queryBuilder.eq("agent_id", agent_id);
    }

    if (status) {
      queryBuilder = queryBuilder.eq("status", status);
    } else {
      // Default: exclude deleted conversations
      queryBuilder = queryBuilder.neq("status", "deleted");
    }

    if (user_id) {
      queryBuilder = queryBuilder.eq("user_id", user_id);
    }

    // Apply ordering and pagination
    const {
      data: conversations,
      error,
      count,
    } = await queryBuilder
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Error fetching conversations:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch conversations" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      conversations: conversations || [],
      total: count || 0,
      page,
      limit,
      hasMore: (count || 0) > offset + limit,
    });
  } catch (error: any) {
    console.error("Error in GET /api/ai-agents/conversations:", error);

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
 * POST /api/ai-agents/conversations
 * Create new conversation
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { organizationId, id: userId } = await requireAuth();
    const supabase = createAdminClient();

    const body = await request.json();
    const validatedData = createConversationSchema.parse(body);

    const { agent_id, title } = validatedData;

    // Verify agent exists and belongs to organization or is default
    const { data: agent, error: agentError } = await supabase
      .from("ai_agents")
      .select("id, name, organization_id, is_default")
      .eq("id", agent_id)
      .single();

    if (agentError || !agent) {
      return NextResponse.json(
        { success: false, error: "Agent not found" },
        { status: 404 },
      );
    }

    // Verify access: must be default agent OR belong to user's organization
    if (!agent.is_default && agent.organization_id !== organizationId) {
      return NextResponse.json(
        { success: false, error: "Access denied to this agent" },
        { status: 403 },
      );
    }

    // Generate title if not provided
    const conversationTitle =
      title ||
      `Conversation with ${agent.name} - ${new Date().toLocaleDateString()}`;

    // Create conversation
    const { data: conversation, error: createError } = await supabase
      .from("ai_agent_conversations")
      .insert({
        agent_id,
        organization_id: organizationId,
        user_id: userId,
        title: conversationTitle,
        status: "active",
        message_count: 0,
        total_tokens_used: 0,
        total_cost_usd: 0,
      })
      .select(
        `
        *,
        agent:ai_agents!inner(id, name, role, avatar_url, system_prompt, model, temperature, max_tokens, allowed_tools)
      `,
      )
      .single();

    if (createError) {
      console.error("Error creating conversation:", createError);
      return NextResponse.json(
        { success: false, error: "Failed to create conversation" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, conversation }, { status: 201 });
  } catch (error: any) {
    console.error("Error in POST /api/ai-agents/conversations:", error);

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
