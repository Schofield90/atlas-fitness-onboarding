/**
 * API endpoint to manually start the AI Agent Scheduler
 * POST /api/ai-agents/scheduler/start
 */

import { NextRequest, NextResponse } from "next/server";
import { agentScheduler } from "@/lib/ai-agents/scheduler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Start the scheduler
 */
export async function POST(request: NextRequest) {
  try {
    // Get current status
    const statusBefore = agentScheduler.getStatus();

    if (statusBefore.isRunning) {
      return NextResponse.json(
        {
          success: false,
          error: "Scheduler is already running",
          status: statusBefore,
        },
        { status: 400 },
      );
    }

    // Start the scheduler
    await agentScheduler.start();

    // Get updated status
    const statusAfter = agentScheduler.getStatus();

    return NextResponse.json({
      success: true,
      message: "Scheduler started successfully",
      status: statusAfter,
    });
  } catch (error) {
    console.error("[API] Error starting scheduler:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to start scheduler",
      },
      { status: 500 },
    );
  }
}

/**
 * Get scheduler status
 */
export async function GET(request: NextRequest) {
  try {
    const status = agentScheduler.getStatus();

    return NextResponse.json({
      success: true,
      status,
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
