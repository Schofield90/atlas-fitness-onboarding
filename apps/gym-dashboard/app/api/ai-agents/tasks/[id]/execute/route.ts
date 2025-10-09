import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/app/lib/api/auth-check";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { agentOrchestrator } from "@/lib/ai-agents/orchestrator";
import parseExpression from "cron-parser";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * POST /api/ai-agents/tasks/[id]/execute
 * Manually trigger task execution (bypass queue)
 */
export async function POST(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const user = await requireAuth();
    const supabase = createAdminClient();
    const { id } = await context.params;

    // Fetch task
    const { data: task, error: fetchError } = await supabase
      .from("ai_agent_tasks")
      .select("*")
      .eq("id", id)
      .eq("organization_id", user.organizationId)
      .single();

    if (fetchError || !task) {
      return NextResponse.json(
        { success: false, error: "Task not found" },
        { status: 404 },
      );
    }

    // Check if task is already running
    if (task.status === "running") {
      return NextResponse.json(
        {
          success: false,
          error: "Task is already running",
        },
        { status: 409 },
      );
    }

    // Update task to running state
    await supabase
      .from("ai_agent_tasks")
      .update({
        status: "running",
        last_run_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    // Execute task via orchestrator
    const result = await agentOrchestrator.executeTask(id);

    // Update task based on result
    const updateData: any = {
      last_run_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (result.success) {
      updateData.status = "completed";
      updateData.result = result.result;
      updateData.execution_time_ms = result.executionTimeMs;
      updateData.tokens_used = result.tokensUsed;
      updateData.cost_usd = result.costUsd;
      updateData.completed_at = new Date().toISOString();
      updateData.error_message = null;

      // For scheduled tasks, calculate next run time
      if (task.task_type === "scheduled" && task.schedule_cron) {
        try {
          const interval = parseExpression(task.schedule_cron, {
            tz: task.schedule_timezone || "UTC",
          });
          const nextRunAt = interval.next().toDate();
          updateData.next_run_at = nextRunAt.toISOString();
          updateData.status = "pending"; // Reset to pending for next run
        } catch (cronError) {
          console.error("Error calculating next run time:", cronError);
        }
      }
    } else {
      // Task failed
      updateData.status = "failed";
      updateData.error_message = result.error;
      updateData.execution_time_ms = result.executionTimeMs;
      updateData.retry_count = task.retry_count + 1;

      // Check if should retry
      if (task.retry_count + 1 < task.max_retries) {
        // For scheduled tasks, calculate next retry time
        if (task.task_type === "scheduled" && task.schedule_cron) {
          try {
            const interval = parseExpression(task.schedule_cron, {
              tz: task.schedule_timezone || "UTC",
            });
            const nextRunAt = interval.next().toDate();
            updateData.next_run_at = nextRunAt.toISOString();
            updateData.status = "pending"; // Will retry on next schedule
          } catch (cronError) {
            console.error("Error calculating retry time:", cronError);
          }
        } else {
          // For adhoc tasks, set to pending for immediate retry
          updateData.status = "pending";
        }
      }
    }

    // Update task with results
    const { data: updatedTask, error: updateError } = await supabase
      .from("ai_agent_tasks")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating task after execution:", updateError);
      return NextResponse.json(
        {
          success: false,
          error: "Task executed but failed to update record",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: result.success,
      task: updatedTask,
      result: result.result,
      error: result.error,
      executionTimeMs: result.executionTimeMs,
      tokensUsed: result.tokensUsed,
      costUsd: result.costUsd,
    });
  } catch (error: any) {
    console.error("Error in POST /api/ai-agents/tasks/[id]/execute:", error);

    // Try to update task status to failed
    try {
      const user = await requireAuth();
      const supabase = createAdminClient();
      const { id } = await context.params;

      await supabase
        .from("ai_agent_tasks")
        .update({
          status: "failed",
          error_message: error.message || "Internal server error",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("organization_id", user.organizationId);
    } catch (updateError) {
      console.error("Failed to update task status:", updateError);
    }

    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: error.status || 500 },
    );
  }
}
