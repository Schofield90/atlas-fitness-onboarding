import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/app/lib/api/auth-check";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { z } from "zod";

const updateConversationSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  status: z.enum(["active", "archived", "deleted"]).optional(),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/ai-agents/conversations/[id]
 * Get conversation with full details
 */
export async function GET(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const { organizationId } = await requireAuth();
    const supabase = createAdminClient();
    const { id } = await context.params;

    const { data: conversation, error } = await supabase
      .from("ai_agent_conversations")
      .select(
        `
        *,
        agent:ai_agents!inner(id, name, role, avatar_url, description, system_prompt, model, temperature, max_tokens, allowed_tools),
        user:users(id, email, full_name)
      `,
      )
      .eq("id", id)
      .single();

    if (error || !conversation) {
      return NextResponse.json(
        { success: false, error: "Conversation not found" },
        { status: 404 },
      );
    }

    // Verify belongs to user's organization
    if (conversation.organization_id !== organizationId) {
      return NextResponse.json(
        { success: false, error: "Access denied" },
        { status: 403 },
      );
    }

    return NextResponse.json({ success: true, conversation });
  } catch (error: any) {
    console.error("Error in GET /api/ai-agents/conversations/[id]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: error.status || 500 },
    );
  }
}

/**
 * PUT /api/ai-agents/conversations/[id]
 * Update conversation (title, status)
 */
export async function PUT(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const { organizationId } = await requireAuth();
    const supabase = createAdminClient();
    const { id } = await context.params;

    // Verify conversation exists and belongs to organization
    const { data: existingConversation, error: fetchError } = await supabase
      .from("ai_agent_conversations")
      .select("id, organization_id, status")
      .eq("id", id)
      .single();

    if (fetchError || !existingConversation) {
      return NextResponse.json(
        { success: false, error: "Conversation not found" },
        { status: 404 },
      );
    }

    if (existingConversation.organization_id !== organizationId) {
      return NextResponse.json(
        { success: false, error: "Access denied" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const validatedData = updateConversationSchema.parse(body);

    // Build update object with only provided fields
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (validatedData.title !== undefined) {
      updateData.title = validatedData.title;
    }

    if (validatedData.status !== undefined) {
      updateData.status = validatedData.status;
    }

    const { data: conversation, error: updateError } = await supabase
      .from("ai_agent_conversations")
      .update(updateData)
      .eq("id", id)
      .select(
        `
        *,
        agent:ai_agents!inner(id, name, role, avatar_url),
        user:users(id, email, full_name)
      `,
      )
      .single();

    if (updateError) {
      console.error("Error updating conversation:", updateError);
      return NextResponse.json(
        { success: false, error: "Failed to update conversation" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, conversation });
  } catch (error: any) {
    console.error("Error in PUT /api/ai-agents/conversations/[id]:", error);

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

/**
 * DELETE /api/ai-agents/conversations/[id]
 * Soft delete conversation (set status = 'deleted')
 * Use ?hard=true query param for hard delete with CASCADE
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const { organizationId } = await requireAuth();
    const supabase = createAdminClient();
    const { id } = await context.params;

    const hardDelete = request.nextUrl.searchParams.get("hard") === "true";

    // Verify conversation exists and belongs to organization
    const { data: existingConversation, error: fetchError } = await supabase
      .from("ai_agent_conversations")
      .select("id, organization_id")
      .eq("id", id)
      .single();

    if (fetchError || !existingConversation) {
      return NextResponse.json(
        { success: false, error: "Conversation not found" },
        { status: 404 },
      );
    }

    if (existingConversation.organization_id !== organizationId) {
      return NextResponse.json(
        { success: false, error: "Access denied" },
        { status: 403 },
      );
    }

    if (hardDelete) {
      // Hard delete - messages and activity logs will CASCADE
      const { error: deleteError } = await supabase
        .from("ai_agent_conversations")
        .delete()
        .eq("id", id);

      if (deleteError) {
        console.error("Error hard deleting conversation:", deleteError);
        return NextResponse.json(
          { success: false, error: "Failed to delete conversation" },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        message: "Conversation permanently deleted",
      });
    } else {
      // Soft delete - set status to 'deleted'
      const { error: updateError } = await supabase
        .from("ai_agent_conversations")
        .update({
          status: "deleted",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (updateError) {
        console.error("Error soft deleting conversation:", updateError);
        return NextResponse.json(
          { success: false, error: "Failed to delete conversation" },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        message: "Conversation marked as deleted",
      });
    }
  } catch (error: any) {
    console.error("Error in DELETE /api/ai-agents/conversations/[id]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: error.status || 500 },
    );
  }
}
