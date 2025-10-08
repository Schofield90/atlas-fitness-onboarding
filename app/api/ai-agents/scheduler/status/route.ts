/**
 * API endpoint to get AI Agent Scheduler status and metrics
 * GET /api/ai-agents/scheduler/status
 */

import { NextRequest, NextResponse } from "next/server";
import { agentScheduler } from "@/lib/ai-agents/scheduler";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Get comprehensive scheduler status
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();

    // Get scheduler status
    const status = agentScheduler.getStatus();

    // Get upcoming scheduled tasks
    const { data: upcomingTasks, error: upcomingError } = await supabase
      .from("ai_agent_tasks")
      .select("id, name, next_run_at, schedule_cron, schedule_timezone")
      .eq("task_type", "scheduled")
      .eq("status", "pending")
      .not("next_run_at", "is", null)
      .order("next_run_at", { ascending: true })
      .limit(10);

    if (upcomingError) {
      console.error("[API] Error fetching upcoming tasks:", upcomingError);
    }

    // Get overdue tasks
    const { data: overdueTasks, error: overdueError } = await supabase
      .from("ai_agent_tasks")
      .select("id, name, next_run_at, schedule_cron")
      .eq("task_type", "scheduled")
      .eq("status", "pending")
      .not("next_run_at", "is", null)
      .lt("next_run_at", new Date().toISOString())
      .order("next_run_at", { ascending: true })
      .limit(10);

    if (overdueError) {
      console.error("[API] Error fetching overdue tasks:", overdueError);
    }

    // Get task statistics
    const { data: taskStats, error: statsError } = await supabase
      .from("ai_agent_tasks")
      .select("task_type, status")
      .eq("task_type", "scheduled");

    if (statsError) {
      console.error("[API] Error fetching task stats:", statsError);
    }

    // Calculate statistics
    const totalScheduledTasks = taskStats?.length || 0;
    const pendingScheduledTasks =
      taskStats?.filter((t) => t.status === "pending").length || 0;
    const activeScheduledTasks =
      taskStats?.filter((t) => t.status === "running" || t.status === "queued")
        .length || 0;

    // Format upcoming tasks with human-readable cron descriptions
    const formattedUpcomingTasks = upcomingTasks?.map((task) => ({
      ...task,
      cronDescription: task.schedule_cron
        ? agentScheduler.describeCronExpression(task.schedule_cron)
        : null,
      dueIn: task.next_run_at
        ? Math.round((new Date(task.next_run_at).getTime() - Date.now()) / 1000)
        : null,
    }));

    const formattedOverdueTasks = overdueTasks?.map((task) => ({
      ...task,
      cronDescription: task.schedule_cron
        ? agentScheduler.describeCronExpression(task.schedule_cron)
        : null,
      overdueBy: task.next_run_at
        ? Math.round((Date.now() - new Date(task.next_run_at).getTime()) / 1000)
        : null,
    }));

    return NextResponse.json({
      success: true,
      scheduler: status,
      tasks: {
        total: totalScheduledTasks,
        pending: pendingScheduledTasks,
        active: activeScheduledTasks,
        upcoming: formattedUpcomingTasks || [],
        overdue: formattedOverdueTasks || [],
      },
    });
  } catch (error) {
    console.error("[API] Error getting scheduler status:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get scheduler status",
      },
      { status: 500 },
    );
  }
}
