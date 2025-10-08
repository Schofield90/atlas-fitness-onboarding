import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/app/lib/api/auth-check";
import { createAdminClient } from "@/app/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface ClassToImport {
  name: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  instructor?: string;
  location?: string;
  capacity: number;
  recurring: boolean;
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
 * POST /api/classes/import/teamup-pdf/import
 * Import extracted classes into database
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const organizationId = user.organizationId;

    const body = await request.json();
    const { classes } = body;

    if (!classes || !Array.isArray(classes)) {
      return NextResponse.json(
        { error: "Invalid classes data" },
        { status: 400 },
      );
    }

    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    let classTypesCreated = 0;
    let schedulesCreated = 0;
    const errors: string[] = [];
    const classTypeMap = new Map<string, string>(); // name -> id

    for (const classData of classes as ClassToImport[]) {
      try {
        // 1. Get or create program (class type)
        let programId = classTypeMap.get(classData.name);

        if (!programId) {
          // Check if program exists
          const { data: existingProgram } = await supabaseAdmin
            .from("programs")
            .select("id")
            .eq("organization_id", organizationId)
            .eq("name", classData.name)
            .maybeSingle();

          if (existingProgram) {
            programId = existingProgram.id;
          } else {
            // Calculate duration from start/end times
            const [startHour, startMin] = classData.startTime
              .split(":")
              .map(Number);
            const [endHour, endMin] = classData.endTime.split(":").map(Number);
            const durationMinutes =
              endHour * 60 + endMin - (startHour * 60 + startMin);

            // Create new program
            const { data: newProgram, error: programError } = await supabaseAdmin
              .from("programs")
              .insert({
                organization_id: organizationId,
                name: classData.name,
                description: `Imported from TeamUp schedule`,
                duration_minutes: durationMinutes > 0 ? durationMinutes : 60,
                max_participants: classData.capacity,
                default_capacity: classData.capacity,
                price_pennies: 0,
                is_active: true,
                metadata: {
                  source: "teamup_pdf_import",
                  imported_at: new Date().toISOString(),
                },
              })
              .select("id")
              .single();

            if (programError || !newProgram) {
              errors.push(
                `Failed to create program "${classData.name}": ${programError?.message}`,
              );
              continue;
            }

            programId = newProgram.id;
            classTypesCreated++;
          }

          classTypeMap.set(classData.name, programId);
        }

        // 2. Create class schedule
        const dayOfWeekNum = DAY_MAP[classData.dayOfWeek];
        if (dayOfWeekNum === undefined) {
          errors.push(
            `Invalid day of week "${classData.dayOfWeek}" for class "${classData.name}"`,
          );
          continue;
        }

        // Check if schedule already exists (prevent duplicates)
        const { data: existingSchedule } = await supabaseAdmin
          .from("class_schedules")
          .select("id")
          .eq("program_id", programId)
          .eq("day_of_week", dayOfWeekNum)
          .eq("start_time", classData.startTime)
          .eq("room_location", classData.location || "Unknown")
          .maybeSingle();

        if (existingSchedule) {
          // Schedule already exists, skip
          continue;
        }

        const { error: scheduleError } = await supabaseAdmin
          .from("class_schedules")
          .insert({
            program_id: programId,
            day_of_week: dayOfWeekNum,
            start_time: classData.startTime,
            end_time: classData.endTime,
            instructor_name: classData.instructor || null,
            room_location: classData.location || "Unknown",
            max_participants: classData.capacity,
            is_recurring: true,
            is_active: true,
            metadata: {
              source: "teamup_pdf_import",
              imported_at: new Date().toISOString(),
            },
          });

        if (scheduleError) {
          errors.push(
            `Failed to create schedule for "${classData.name}" on ${classData.dayOfWeek}: ${scheduleError.message}`,
          );
        } else {
          schedulesCreated++;
        }
      } catch (error: any) {
        errors.push(`Error processing "${classData.name}": ${error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        classTypesCreated,
        schedulesCreated,
        totalProcessed: classes.length,
        errors: errors.length > 0 ? errors : undefined,
        importedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Class import error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to import classes" },
      { status: 500 },
    );
  }
}
