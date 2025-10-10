import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/app/lib/api/auth-check";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { z } from "zod";
import { parseExpression } from "cron-parser";

// Validation schema
const updateTaskSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  status: z
    .enum(["pending", "queued", "running", "completed", "failed", "cancelled"])
    .optional(),
  schedule_cron: z.string().optional(),
  schedule_timezone: z.string().optional(),
  priority: z.number().min(0).max(10).optional(),
  context: z.record(z.any()).optional(),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/ai-agents/tasks/[id]
 * Get task with full details
 */
export async function GET(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const user = await requireAuth();
    const supabase = createAdminClient();
    const { id } = await context.params;

    const { data: task, error } = await supabase
      .from("ai_agent_tasks")
      .select("*")
      .eq("id", id)
      .eq("organization_id", user.organizationId)
      .single();

    if (error || !task) {
      return NextResponse.json(
        { success: false, error: "Task not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, task });
  } catch (error: any) {
    console.error("Error in GET /api/ai-agents/tasks/[id]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: error.status || 500 },
    );
  }
}

/**
 * PUT /api/ai-agents/tasks/[id]
 * Update task details
 */
export async function PUT(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const user = await requireAuth();
    const supabase = createAdminClient();
    const { id } = await context.params;

    // Fetch existing task
    const { data: existingTask, error: fetchError } = await supabase
      .from("ai_agent_tasks")
      .select("*")
      .eq("id", id)
      .eq("organization_id", user.organizationId)
      .single();

    if (fetchError || !existingTask) {
      return NextResponse.json(
        { success: false, error: "Task not found" },
        { status: 404 },
      );
    }

    const body = await request.json();
    const validatedData = updateTaskSchema.parse(body);

    // Build update object
    const updateData: any = {};

    if (validatedData.title !== undefined) {
      updateData.title = validatedData.title;
    }
    if (validatedData.description !== undefined) {
      updateData.description = validatedData.description;
    }
    if (validatedData.status !== undefined) {
      updateData.status = validatedData.status;
    }
    if (validatedData.priority !== undefined) {
      updateData.priority = validatedData.priority;
    }
    if (validatedData.context !== undefined) {
      updateData.context = validatedData.context;
    }
    if (validatedData.schedule_timezone !== undefined) {
      updateData.schedule_timezone = validatedData.schedule_timezone;
    }

    // Handle cron expression update
    if (
      validatedData.schedule_cron !== undefined &&
      validatedData.schedule_cron !== null &&
      validatedData.schedule_cron.trim() !== ""
    ) {
      if (existingTask.task_type !== "scheduled") {
        return NextResponse.json(
          {
            success: false,
            error: "Cannot set cron schedule on non-scheduled task",
          },
          { status: 400 },
        );
      }

      // Validate cron expression and calculate next run
      try {
        const timezone =
          validatedData.schedule_timezone ||
          existingTask.schedule_timezone ||
          "UTC";
        const interval = parseExpression(validatedData.schedule_cron, {
          tz: timezone,
        });
        const nextRunAt = interval.next().toDate();

        updateData.schedule_cron = validatedData.schedule_cron;
        updateData.next_run_at = nextRunAt.toISOString();
      } catch (cronError) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid cron expression",
            details: cronError instanceof Error ? cronError.message : "Unknown",
          },
          { status: 400 },
        );
      }
    }

    // Perform update
    const { data: task, error: updateError } = await supabase
      .from("ai_agent_tasks")
      .update(updateData)
      .eq("id", id)
      .eq("organization_id", user.organizationId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating task:", updateError);
      return NextResponse.json(
        { success: false, error: "Failed to update task" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, task });
  } catch (error: any) {
    console.error("Error in PUT /api/ai-agents/tasks/[id]:", error);

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
 * DELETE /api/ai-agents/tasks/[id]
 * Delete task
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const user = await requireAuth();
    const supabase = createAdminClient();
    const { id } = await context.params;

    // Fetch existing task
    const { data: existingTask, error: fetchError } = await supabase
      .from("ai_agent_tasks")
      .select("status")
      .eq("id", id)
      .eq("organization_id", user.organizationId)
      .single();

    if (fetchError || !existingTask) {
      return NextResponse.json(
        { success: false, error: "Task not found" },
        { status: 404 },
      );
    }

    // Prevent deletion of running tasks
    if (existingTask.status === "running") {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot delete task that is currently running",
        },
        { status: 409 },
      );
    }

    // TODO: Remove from queue if status is 'pending' or 'queued'
    // This would be implemented when the queue system is set up
    // Example:
    // if (existingTask.status === 'pending' || existingTask.status === 'queued') {
    //   await agentTaskQueue.removeTask(id);
    // }

    // Delete the task
    const { error: deleteError } = await supabase
      .from("ai_agent_tasks")
      .delete()
      .eq("id", id)
      .eq("organization_id", user.organizationId);

    if (deleteError) {
      console.error("Error deleting task:", deleteError);
      return NextResponse.json(
        { success: false, error: "Failed to delete task" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in DELETE /api/ai-agents/tasks/[id]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: error.status || 500 },
    );
  }
}
