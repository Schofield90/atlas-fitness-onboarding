/**
 * API endpoint to manually stop the AI Agent Scheduler
 * POST /api/ai-agents/scheduler/stop
 */

import { NextRequest, NextResponse } from "next/server";
import { agentScheduler } from "@/lib/ai-agents/scheduler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Stop the scheduler
 */
export async function POST(request: NextRequest) {
  try {
    // Get current status
    const statusBefore = agentScheduler.getStatus();

    if (!statusBefore.isRunning) {
      return NextResponse.json(
        {
          success: false,
          error: "Scheduler is not running",
          status: statusBefore,
        },
        { status: 400 },
      );
    }

    // Stop the scheduler
    await agentScheduler.stop();

    // Get updated status
    const statusAfter = agentScheduler.getStatus();

    return NextResponse.json({
      success: true,
      message: "Scheduler stopped successfully",
      status: statusAfter,
    });
  } catch (error) {
    console.error("[API] Error stopping scheduler:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to stop scheduler",
      },
      { status: 500 },
    );
  }
}
