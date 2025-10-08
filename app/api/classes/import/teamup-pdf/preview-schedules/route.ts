import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/app/lib/api/auth-check";

export const dynamic = "force-dynamic";

interface ClassToPreview {
  name: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  instructor?: string;
  location?: string;
  capacity: number;
  recurring: boolean;
}

interface SchedulePreview {
  className: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  instructor?: string;
  location?: string;
  capacity: number;
  sessions: Array<{
    date: string; // ISO date string
    dayName: string; // "Monday", "Tuesday", etc.
    startDateTime: string; // Full ISO datetime
    endDateTime: string;
  }>;
}

const DAY_MAP: Record<string, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

/**
 * POST /api/classes/import/teamup-pdf/preview-schedules
 * Generate schedule preview for the next 4 weeks WITHOUT importing to database
 */
export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    const body = await request.json();
    const { classes } = body;

    if (!classes || !Array.isArray(classes)) {
      return NextResponse.json(
        { error: "Invalid classes data" },
        { status: 400 },
      );
    }

    const schedules: SchedulePreview[] = [];
    const weeksToGenerate = 4;

    for (const classData of classes as ClassToPreview[]) {
      const dayOfWeekNum = DAY_MAP[classData.dayOfWeek];
      if (dayOfWeekNum === undefined) {
        console.warn(`Invalid day: ${classData.dayOfWeek}`);
        continue;
      }

      const sessions: SchedulePreview["sessions"] = [];
      const startDate = new Date();
      startDate.setHours(0, 0, 0, 0);

      for (let week = 0; week < weeksToGenerate; week++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + week * 7);

        // Find next occurrence of this day
        let daysUntilTarget = dayOfWeekNum - currentDate.getDay();
        if (daysUntilTarget < 0) {
          daysUntilTarget += 7;
        }
        const targetDate = new Date(currentDate);
        targetDate.setDate(currentDate.getDate() + daysUntilTarget);

        // Skip past dates
        if (targetDate < new Date()) continue;

        // Set the time
        const [hours, minutes] = classData.startTime.split(":").map(Number);
        const [endHours, endMinutes] = classData.endTime.split(":").map(Number);
        targetDate.setHours(hours, minutes, 0, 0);

        const endTime = new Date(targetDate);
        const duration = endHours * 60 + endMinutes - (hours * 60 + minutes);
        endTime.setMinutes(targetDate.getMinutes() + (duration > 0 ? duration : 60));

        sessions.push({
          date: targetDate.toISOString().split("T")[0], // "2025-10-15"
          dayName: classData.dayOfWeek,
          startDateTime: targetDate.toISOString(),
          endDateTime: endTime.toISOString(),
        });
      }

      schedules.push({
        className: classData.name,
        dayOfWeek: classData.dayOfWeek,
        startTime: classData.startTime,
        endTime: classData.endTime,
        instructor: classData.instructor,
        location: classData.location,
        capacity: classData.capacity,
        sessions,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        schedules,
        totalClasses: classes.length,
        totalSessions: schedules.reduce((sum, s) => sum + s.sessions.length, 0),
        weeksGenerated: weeksToGenerate,
      },
    });
  } catch (error: any) {
    console.error("Schedule preview error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate preview" },
      { status: 500 },
    );
  }
}
