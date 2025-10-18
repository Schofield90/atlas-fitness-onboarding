/**
 * Utility Tools for AI Agents
 * Provides basic utility functions like getting current date/time
 */

import { z } from "zod";
import { BaseTool, ToolExecutionContext, ToolExecutionResult } from "./types";

class GetCurrentDateTimeTool extends BaseTool {
  id = "get_current_datetime";
  name = "get_current_datetime";
  description = "Get the current date and time in Europe/London timezone. Use this to know what day it is today, what day tomorrow is, what day of the week it is, etc. Always call this before making calendar bookings or when you need to know the current date.";
  category = "utility" as const;

  parametersSchema = z.object({});

  isSystem = true;
  enabled = true;

  async execute(
    params: any,
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    const now = new Date();

    // Get UK time details
    const ukDate = now.toLocaleDateString('en-GB', {
      timeZone: 'Europe/London',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const ukTime = now.toLocaleTimeString('en-GB', {
      timeZone: 'Europe/London',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    const ukDateTime = now.toLocaleString('en-GB', {
      timeZone: 'Europe/London',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    // Get day of week as number (0 = Sunday, 6 = Saturday)
    const dayOfWeek = now.toLocaleDateString('en-GB', {
      timeZone: 'Europe/London',
      weekday: 'long',
    });

    // Calculate tomorrow
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDate = tomorrow.toLocaleDateString('en-GB', {
      timeZone: 'Europe/London',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    // ISO format for easy parsing
    const isoDate = now.toISOString().split('T')[0]; // YYYY-MM-DD

    return {
      success: true,
      data: {
        currentDateTime: ukDateTime,
        currentDate: ukDate,
        currentTime: ukTime,
        dayOfWeek: dayOfWeek,
        tomorrow: tomorrowDate,
        isoDate: isoDate,
        timezone: 'Europe/London',
      },
      message: `Current date/time: ${ukDateTime} (${dayOfWeek})`,
    };
  }
}

export const UTILITY_TOOLS: AgentTool[] = [
  new GetCurrentDateTimeTool(),
];
