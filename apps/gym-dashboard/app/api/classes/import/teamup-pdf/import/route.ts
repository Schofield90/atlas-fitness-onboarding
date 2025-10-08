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
        // 1. Get or create class type (for class_schedules)
        let classTypeId = classTypeMap.get(classData.name);

        if (!classTypeId) {
          // Check if class type exists
          const { data: existingType } = await supabaseAdmin
            .from("class_types")
            .select("id")
            .eq("organization_id", organizationId)
            .eq("name", classData.name)
            .maybeSingle();

          if (existingType) {
            classTypeId = existingType.id;
          } else {
            // Create new class type
            const { data: newType, error: typeError } = await supabaseAdmin
              .from("class_types")
              .insert({
                organization_id: organizationId,
                name: classData.name,
                description: `Imported from TeamUp schedule`,
              })
              .select("id")
              .single();

            if (typeError || !newType) {
              errors.push(
                `Failed to create class type "${classData.name}": ${typeError?.message}`,
              );
              continue;
            }

            classTypeId = newType.id;
            classTypesCreated++;

            // ALSO create in programs table (for classes page display)
            const [startHour, startMin] = classData.startTime
              .split(":")
              .map(Number);
            const [endHour, endMin] = classData.endTime.split(":").map(Number);
            const durationMinutes =
              endHour * 60 + endMin - (startHour * 60 + startMin);

            const { data: newProgram, error: programError } =
              await supabaseAdmin
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
                    class_type_id: classTypeId,
                  },
                })
                .select("id")
                .single();

            if (programError || !newProgram) {
              console.error("Failed to create program:", programError);
            }
          }

          classTypeMap.set(classData.name, classTypeId);
        }

        // 2. Create class schedule
        const dayOfWeekNum = DAY_MAP[classData.dayOfWeek];
        if (dayOfWeekNum === undefined) {
          errors.push(
            `Invalid day of week "${classData.dayOfWeek}" for class "${classData.name}"`,
          );
          continue;
        }

        // Format times as HH:MM:SS for PostgreSQL time column
        const startTimeFormatted = `${classData.startTime}:00`; // "06:00" -> "06:00:00"
        const endTimeFormatted = `${classData.endTime}:00`; // "07:00" -> "07:00:00"

        // Check if schedule already exists (include start_time to catch different time slots)
        const { data: existingSchedule } = await supabaseAdmin
          .from("class_schedules")
          .select("id")
          .eq("class_type_id", classTypeId)
          .eq("instructor_name", classData.instructor || "")
          .eq("room_location", classData.location || "Unknown")
          .eq("start_time", startTimeFormatted)
          .maybeSingle();

        if (existingSchedule) {
          // Schedule already exists, skip
          continue;
        }

        // Insert with minimal fields - production table has limited schema
        const insertData: any = {
          class_type_id: classTypeId,
          start_time: startTimeFormatted,
          end_time: endTimeFormatted,
        };

        // Add optional fields only if they exist in schema
        if (classData.instructor) insertData.instructor_name = classData.instructor;
        if (classData.location) insertData.room_location = classData.location;

        const { error: scheduleError } = await supabaseAdmin
          .from("class_schedules")
          .insert(insertData);

        if (scheduleError) {
          errors.push(
            `Failed to create schedule for "${classData.name}" on ${classData.dayOfWeek}: ${scheduleError.message}`,
          );
        } else {
          schedulesCreated++;
        }

        // ALSO generate class_sessions for the next 4 weeks so they appear in the calendar
        // Get the program we just created (or find existing one)
        const { data: programData } = await supabaseAdmin
          .from("programs")
          .select("id")
          .eq("organization_id", organizationId)
          .eq("name", classData.name)
          .single();

        if (programData) {
          const weeksToGenerate = 4;
          const startDate = new Date();
          startDate.setHours(0, 0, 0, 0);

          for (let week = 0; week < weeksToGenerate; week++) {
            // Calculate the date for this occurrence
            const currentDate = new Date(startDate);
            currentDate.setDate(startDate.getDate() + week * 7);

            // Find the next occurrence of this day of the week
            const daysUntilTarget = dayOfWeekNum - currentDate.getDay();
            const targetDate = new Date(currentDate);
            targetDate.setDate(currentDate.getDate() + daysUntilTarget);

            // Skip if the date is in the past
            if (targetDate < new Date()) continue;

            // Set the time
            const [hours, minutes] = classData.startTime.split(":").map(Number);
            const [endHours, endMinutes] = classData.endTime
              .split(":")
              .map(Number);
            targetDate.setHours(hours, minutes, 0, 0);

            // Calculate duration
            const sessionDuration =
              endHours * 60 + endMinutes - (hours * 60 + minutes);

            // Check if session already exists
            const { data: existingSession } = await supabaseAdmin
              .from("class_sessions")
              .select("id")
              .eq("program_id", programData.id)
              .eq("start_time", targetDate.toISOString())
              .maybeSingle();

            if (!existingSession) {
              // Create class session
              const { error: sessionError } = await supabaseAdmin
                .from("class_sessions")
                .insert({
                  organization_id: organizationId,
                  program_id: programData.id,
                  name: classData.name,
                  instructor_name: classData.instructor || "TBD",
                  start_time: targetDate.toISOString(),
                  duration_minutes: sessionDuration > 0 ? sessionDuration : 60,
                  capacity: classData.capacity || 20,
                  location: classData.location || "Main Studio",
                  description: `Imported from TeamUp schedule`,
                });

              if (sessionError) {
                console.error(
                  `Session creation error for ${classData.name}:`,
                  sessionError,
                );
              }
            }
          }
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
