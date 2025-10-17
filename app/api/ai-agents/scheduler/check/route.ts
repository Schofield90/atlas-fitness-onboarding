/**
 * API endpoint to manually trigger a scheduler check
 * POST /api/ai-agents/scheduler/check
 */

import { NextRequest, NextResponse } from "next/server";
import { agentScheduler } from "@/lib/ai-agents/scheduler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Manually trigger a scheduler check
 * Useful for testing or forcing immediate task queue evaluation
 */
export async function POST(request: NextRequest) {
  try {
    const statusBefore = agentScheduler.getStatus();

    // Trigger check
    await agentScheduler.checkScheduledTasks();

    const statusAfter = agentScheduler.getStatus();

    // Calculate tasks queued in this check
    const tasksQueued =
      statusAfter.metrics.tasksQueued - statusBefore.metrics.tasksQueued;
    const tasksFailed =
      statusAfter.metrics.tasksFailed - statusBefore.metrics.tasksFailed;

    return NextResponse.json({
      success: true,
      message: "Scheduler check completed",
      check: {
        tasksQueued,
        tasksFailed,
        timestamp: new Date().toISOString(),
      },
      status: statusAfter,
    });
  } catch (error) {
    console.error("[API] Error triggering scheduler check:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to trigger scheduler check",
      },
      { status: 500 },
    );
  }
}
