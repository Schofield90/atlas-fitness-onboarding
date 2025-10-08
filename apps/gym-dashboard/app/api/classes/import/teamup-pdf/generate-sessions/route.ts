import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/app/lib/api/auth-check";
import { createAdminClient } from "@/app/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/classes/import/teamup-pdf/generate-sessions
 * Generate class_sessions from class_schedules for calendar display
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const organizationId = user.organizationId;

    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Get all class_schedules for this organization
    const { data: schedules, error: schedulesError } = await supabaseAdmin
      .from("class_schedules")
      .select(
        `
        *,
        class_types!inner(id, name, organization_id),
        programs!inner(id, name, organization_id)
      `,
      )
      .eq("class_types.organization_id", organizationId);

    if (schedulesError) {
      console.error("Error fetching schedules:", schedulesError);
      return NextResponse.json(
        { error: `Failed to fetch schedules: ${schedulesError.message}` },
        { status: 500 },
      );
    }

    if (!schedules || schedules.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No schedules found to generate sessions from",
        data: {
          sessionsCreated: 0,
          schedulesProcessed: 0,
        },
      });
    }

    let sessionsCreated = 0;
    const errors: string[] = [];
    const weeksToGenerate = 4; // Generate 4 weeks ahead

    // Map day names to numbers
    const DAY_MAP: Record<string, number> = {
      Sunday: 0,
      Monday: 1,
      Tuesday: 2,
      Wednesday: 3,
      Thursday: 4,
      Friday: 5,
      Saturday: 6,
    };

    for (const schedule of schedules) {
      try {
        // Get the program for this schedule
        const program = schedule.programs;
        if (!program) {
          errors.push(`No program found for schedule ${schedule.id}`);
          continue;
        }

        // Calculate day of week from schedule (we'll infer from start_time if available)
        // For now, generate for ALL days of the week since class_schedules doesn't store day_of_week
        // We'll generate based on a weekly pattern starting from today

        const startDate = new Date();
        startDate.setHours(0, 0, 0, 0); // Start from today

        // Parse the time from schedule.start_time (format: "HH:MM:SS")
        const [hours, minutes] = schedule.start_time.split(":").map(Number);

        // Calculate duration if we have end_time
        let durationMinutes = 60; // default
        if (schedule.end_time) {
          const [endHours, endMinutes] = schedule.end_time
            .split(":")
            .map(Number);
          durationMinutes =
            endHours * 60 + endMinutes - (hours * 60 + minutes);
        }

        // Generate sessions for each week
        // Since class_schedules doesn't have day_of_week, we'll generate for the CURRENT day of week
        // by looking at today and repeating weekly
        const currentDayOfWeek = startDate.getDay();

        for (let week = 0; week < weeksToGenerate; week++) {
          // Calculate the date for this week
          const targetDate = new Date(startDate);
          targetDate.setDate(startDate.getDate() + week * 7);
          targetDate.setHours(hours, minutes, 0, 0);

          // Skip if the date is in the past
          if (targetDate < new Date()) continue;

          // Check if session already exists
          const { data: existingSession } = await supabaseAdmin
            .from("class_sessions")
            .select("id")
            .eq("program_id", program.id)
            .eq("start_time", targetDate.toISOString())
            .eq("instructor_name", schedule.instructor_name || "")
            .maybeSingle();

          if (existingSession) {
            // Session already exists, skip
            continue;
          }

          // Create class session
          const { error: sessionError } = await supabaseAdmin
            .from("class_sessions")
            .insert({
              organization_id: organizationId,
              program_id: program.id,
              name: schedule.class_types?.name || program.name,
              instructor_name: schedule.instructor_name || "TBD",
              start_time: targetDate.toISOString(),
              duration_minutes: durationMinutes,
              capacity: 20, // Default capacity
              location: schedule.room_location || "Main Studio",
              description: `Imported from TeamUp schedule`,
            });

          if (sessionError) {
            errors.push(
              `Failed to create session for ${schedule.class_types?.name} on ${targetDate.toLocaleDateString()}: ${sessionError.message}`,
            );
          } else {
            sessionsCreated++;
          }
        }
      } catch (error: any) {
        errors.push(
          `Error processing schedule ${schedule.id}: ${error.message}`,
        );
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        sessionsCreated,
        schedulesProcessed: schedules.length,
        weeksGenerated: weeksToGenerate,
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  } catch (error: any) {
    console.error("Session generation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate sessions" },
      { status: 500 },
    );
  }
}
