/**
 * API endpoint to validate cron expressions and preview execution times
 * POST /api/ai-agents/scheduler/validate
 */

import { NextRequest, NextResponse } from "next/server";
import { agentScheduler } from "@/lib/ai-agents/scheduler";
import { parseExpression } from "cron-parser";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface ValidateRequest {
  cronExpression: string;
  timezone?: string;
  previewCount?: number;
}

/**
 * Validate cron expression and preview execution times
 */
export async function POST(request: NextRequest) {
  try {
    const body: ValidateRequest = await request.json();
    const { cronExpression, timezone = "UTC", previewCount = 5 } = body;

    if (!cronExpression) {
      return NextResponse.json(
        {
          success: false,
          error: "cronExpression is required",
        },
        { status: 400 },
      );
    }

    // Validate cron expression
    let isValid = true;
    let errorMessage: string | null = null;

    try {
      agentScheduler.validateCronExpression(cronExpression);
    } catch (error) {
      isValid = false;
      errorMessage =
        error instanceof Error ? error.message : "Invalid cron expression";
    }

    if (!isValid) {
      return NextResponse.json({
        success: true,
        valid: false,
        error: errorMessage,
        cronExpression,
      });
    }

    // Get human-readable description
    const description = agentScheduler.describeCronExpression(cronExpression);

    // Calculate next execution times
    const nextExecutions: Array<{
      date: string;
      timestamp: number;
      fromNow: number;
    }> = [];

    try {
      const interval = parseExpression(cronExpression, {
        currentDate: new Date(),
        tz: timezone,
      });

      for (let i = 0; i < Math.min(previewCount, 20); i++) {
        const nextDate = interval.next().toDate();
        nextExecutions.push({
          date: nextDate.toISOString(),
          timestamp: nextDate.getTime(),
          fromNow: Math.round((nextDate.getTime() - Date.now()) / 1000),
        });
      }
    } catch (error) {
      console.error("[API] Error calculating next executions:", error);
    }

    // Calculate next run using scheduler
    const nextRun = agentScheduler.calculateNextRun(cronExpression, timezone);

    return NextResponse.json({
      success: true,
      valid: true,
      cronExpression,
      timezone,
      description,
      nextRun: {
        date: nextRun.toISOString(),
        timestamp: nextRun.getTime(),
        fromNow: Math.round((nextRun.getTime() - Date.now()) / 1000),
      },
      preview: nextExecutions,
    });
  } catch (error) {
    console.error("[API] Error validating cron expression:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to validate cron expression",
      },
      { status: 500 },
    );
  }
}

/**
 * Get common cron expression examples
 */
export async function GET(request: NextRequest) {
  const examples = [
    {
      expression: "0 * * * *",
      description: "Every hour at minute 0",
      timezone: "UTC",
    },
    {
      expression: "0 0 * * *",
      description: "Every day at midnight",
      timezone: "UTC",
    },
    {
      expression: "0 9 * * 1-5",
      description: "Every weekday at 9:00 AM",
      timezone: "UTC",
    },
    {
      expression: "*/15 * * * *",
      description: "Every 15 minutes",
      timezone: "UTC",
    },
    {
      expression: "0 0 1 * *",
      description: "First day of every month at midnight",
      timezone: "UTC",
    },
    {
      expression: "0 12 * * 0",
      description: "Every Sunday at noon",
      timezone: "UTC",
    },
    {
      expression: "30 8 * * 1",
      description: "Every Monday at 8:30 AM",
      timezone: "UTC",
    },
    {
      expression: "0 */4 * * *",
      description: "Every 4 hours",
      timezone: "UTC",
    },
    {
      expression: "0 0 * * 6",
      description: "Every Saturday at midnight",
      timezone: "UTC",
    },
    {
      expression: "0 22 * * *",
      description: "Every day at 10:00 PM",
      timezone: "UTC",
    },
  ];

  // Add human-readable descriptions using scheduler
  const formattedExamples = examples.map((example) => ({
    ...example,
    readableDescription: agentScheduler.describeCronExpression(
      example.expression,
    ),
  }));

  return NextResponse.json({
    success: true,
    examples: formattedExamples,
  });
}
