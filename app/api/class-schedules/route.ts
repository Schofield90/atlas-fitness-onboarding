import { createClient } from "@/app/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Validation schemas
const getSchedulesSchema = z.object({
  organization_id: z.string().uuid(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  class_type_id: z.string().uuid().optional(),
  instructor_id: z.string().uuid().optional(),
  available_only: z
    .string()
    .optional()
    .transform((val) => val === "true"),
  limit: z
    .string()
    .optional()
    .transform((val) => parseInt(val || "50")),
  offset: z
    .string()
    .optional()
    .transform((val) => parseInt(val || "0")),
});

const createScheduleSchema = z.object({
  organization_id: z.string().uuid(),
  class_type_id: z.string().uuid(),
  instructor_id: z.string().uuid().optional(),
  start_time: z.string().datetime(),
  end_time: z.string().datetime(),
  max_capacity: z.number().int().min(1).max(200),
  price_pennies: z.number().int().min(0).default(0),
  room_location: z.string().optional(),
  equipment_needed: z.array(z.string()).optional(),
  class_level: z
    .enum(["beginner", "intermediate", "advanced", "all"])
    .default("all"),
  booking_cutoff_hours: z.number().int().min(0).default(2),
  cancellation_cutoff_hours: z.number().int().min(0).default(24),
  waitlist_enabled: z.boolean().default(true),
  requires_booking: z.boolean().default(true),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),

  // Recurring options
  recurrence_type: z
    .enum(["none", "weekly", "biweekly", "monthly"])
    .default("none"),
  recurrence_pattern: z.record(z.any()).optional(),
  recurrence_end_date: z.string().date().optional(),
  is_recurring_template: z.boolean().default(false),
});

const updateScheduleSchema = z.object({
  schedule_id: z.string().uuid(),
  class_type_id: z.string().uuid().optional(),
  instructor_id: z.string().uuid().optional(),
  start_time: z.string().datetime().optional(),
  end_time: z.string().datetime().optional(),
  max_capacity: z.number().int().min(1).max(200).optional(),
  price_pennies: z.number().int().min(0).optional(),
  room_location: z.string().optional(),
  equipment_needed: z.array(z.string()).optional(),
  class_level: z
    .enum(["beginner", "intermediate", "advanced", "all"])
    .optional(),
  booking_cutoff_hours: z.number().int().min(0).optional(),
  cancellation_cutoff_hours: z.number().int().min(0).optional(),
  waitlist_enabled: z.boolean().optional(),
  requires_booking: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
  status: z.enum(["scheduled", "cancelled", "completed"]).optional(),
});

// Helper function to check conflicts
const checkInstructorConflicts = async (
  supabase: any,
  instructorId: string,
  startTime: string,
  endTime: string,
  excludeScheduleId?: string,
) => {
  let query = supabase
    .from("class_schedules")
    .select("id, start_time, end_time")
    .eq("instructor_id", instructorId)
    .eq("status", "scheduled")
    .or(`start_time.lt.${endTime},end_time.gt.${startTime}`);

  if (excludeScheduleId) {
    query = query.neq("id", excludeScheduleId);
  }

  const { data: conflicts } = await query;

  return conflicts && conflicts.length > 0;
};

// GET - List class schedules
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { searchParams } = new URL(request.url);

    const params = getSchedulesSchema.parse(
      Object.fromEntries(searchParams.entries()),
    );

    let query = supabase
      .from("class_schedules")
      .select(
        `
        *,
        class_type:class_types(*),
        instructor:users!class_schedules_instructor_id_fkey(
          id,
          email,
          raw_user_meta_data
        )
      `,
      )
      .eq("organization_id", params.organization_id)
      .order("start_time", { ascending: true });

    // Apply filters
    if (params.start_date) {
      query = query.gte("start_time", params.start_date);
    }

    if (params.end_date) {
      query = query.lte("start_time", params.end_date);
    }

    if (params.class_type_id) {
      query = query.eq("class_type_id", params.class_type_id);
    }

    if (params.instructor_id) {
      query = query.eq("instructor_id", params.instructor_id);
    }

    if (params.available_only) {
      query = query
        .eq("status", "scheduled")
        .gte("start_time", new Date().toISOString())
        .filter("current_bookings", "lt", "max_capacity");
    }

    // Apply pagination
    const { data, error, count } = await query.range(
      params.offset,
      params.offset + params.limit - 1,
    );

    if (error) throw error;

    // Format instructor data
    const formattedData = data?.map((schedule) => ({
      ...schedule,
      instructor: schedule.instructor
        ? {
            id: schedule.instructor.id,
            name:
              schedule.instructor.raw_user_meta_data?.full_name ||
              schedule.instructor.email,
            email: schedule.instructor.email,
          }
        : null,
    }));

    return NextResponse.json({
      success: true,
      data: formattedData,
      pagination: {
        limit: params.limit,
        offset: params.offset,
        total: count,
      },
    });
  } catch (error) {
    console.error("Error fetching class schedules:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid query parameters",
          details: error.errors,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { success: false, error: "Failed to fetch class schedules" },
      { status: 500 },
    );
  }
}

// POST - Create new class schedule
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const body = await request.json();
    const validated = createScheduleSchema.parse(body);

    // Validate start/end times
    const startTime = new Date(validated.start_time);
    const endTime = new Date(validated.end_time);

    if (endTime <= startTime) {
      return NextResponse.json(
        { success: false, error: "End time must be after start time" },
        { status: 400 },
      );
    }

    // Check for instructor conflicts if instructor is specified
    if (validated.instructor_id) {
      const hasConflicts = await checkInstructorConflicts(
        supabase,
        validated.instructor_id,
        validated.start_time,
        validated.end_time,
      );

      if (hasConflicts) {
        return NextResponse.json(
          { success: false, error: "Instructor has conflicting schedule" },
          { status: 400 },
        );
      }
    }

    // Create the schedule
    const { data: schedule, error: scheduleError } = await supabase
      .from("class_schedules")
      .insert({
        organization_id: validated.organization_id,
        class_type_id: validated.class_type_id,
        instructor_id: validated.instructor_id,
        start_time: validated.start_time,
        end_time: validated.end_time,
        max_capacity: validated.max_capacity,
        price_pennies: validated.price_pennies,
        room_location: validated.room_location,
        equipment_needed: validated.equipment_needed,
        class_level: validated.class_level,
        booking_cutoff_hours: validated.booking_cutoff_hours,
        cancellation_cutoff_hours: validated.cancellation_cutoff_hours,
        waitlist_enabled: validated.waitlist_enabled,
        requires_booking: validated.requires_booking,
        tags: validated.tags,
        metadata: validated.metadata,
        recurrence_type: validated.recurrence_type,
        recurrence_pattern: validated.recurrence_pattern,
        recurrence_end_date: validated.recurrence_end_date,
        is_recurring_template: validated.is_recurring_template,
        status: "scheduled",
        current_bookings: 0,
      })
      .select(
        `
        *,
        class_type:class_types(*),
        instructor:users!class_schedules_instructor_id_fkey(
          id,
          email,
          raw_user_meta_data
        )
      `,
      )
      .single();

    if (scheduleError) throw scheduleError;

    return NextResponse.json({
      success: true,
      data: {
        ...schedule,
        instructor: schedule.instructor
          ? {
              id: schedule.instructor.id,
              name:
                schedule.instructor.raw_user_meta_data?.full_name ||
                schedule.instructor.email,
              email: schedule.instructor.email,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("Error creating class schedule:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request data",
          details: error.errors,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { success: false, error: "Failed to create class schedule" },
      { status: 500 },
    );
  }
}

// PUT - Update class schedule
export async function PUT(request: NextRequest) {
  try {
    const supabase = createClient();
    const body = await request.json();
    const validated = updateScheduleSchema.parse(body);

    // Get current schedule details
    const { data: currentSchedule, error: fetchError } = await supabase
      .from("class_schedules")
      .select("*")
      .eq("id", validated.schedule_id)
      .single();

    if (fetchError || !currentSchedule) {
      return NextResponse.json(
        { success: false, error: "Schedule not found" },
        { status: 404 },
      );
    }

    // Check if there are any confirmed bookings if changing start time significantly
    if (
      validated.start_time &&
      new Date(validated.start_time).getTime() !==
        new Date(currentSchedule.start_time).getTime()
    ) {
      const { data: bookings } = await supabase
        .from("class_bookings")
        .select("id")
        .eq("schedule_id", validated.schedule_id)
        .eq("status", "confirmed");

      if (bookings && bookings.length > 0) {
        // Only allow minor time adjustments (up to 30 minutes) if there are bookings
        const currentTime = new Date(currentSchedule.start_time);
        const newTime = new Date(validated.start_time);
        const timeDiffMinutes =
          Math.abs(newTime.getTime() - currentTime.getTime()) / (1000 * 60);

        if (timeDiffMinutes > 30) {
          return NextResponse.json(
            {
              success: false,
              error:
                "Cannot change class time by more than 30 minutes when bookings exist",
            },
            { status: 400 },
          );
        }
      }
    }

    // Validate start/end times if both are provided
    if (validated.start_time && validated.end_time) {
      const startTime = new Date(validated.start_time);
      const endTime = new Date(validated.end_time);

      if (endTime <= startTime) {
        return NextResponse.json(
          { success: false, error: "End time must be after start time" },
          { status: 400 },
        );
      }
    }

    // Check for instructor conflicts if instructor or time is being changed
    if (validated.instructor_id || validated.start_time || validated.end_time) {
      const instructorId =
        validated.instructor_id || currentSchedule.instructor_id;
      const startTime = validated.start_time || currentSchedule.start_time;
      const endTime = validated.end_time || currentSchedule.end_time;

      if (instructorId) {
        const hasConflicts = await checkInstructorConflicts(
          supabase,
          instructorId,
          startTime,
          endTime,
          validated.schedule_id,
        );

        if (hasConflicts) {
          return NextResponse.json(
            { success: false, error: "Instructor has conflicting schedule" },
            { status: 400 },
          );
        }
      }
    }

    // Update the schedule
    const updateData = Object.fromEntries(
      Object.entries(validated).filter(
        ([key, value]) => key !== "schedule_id" && value !== undefined,
      ),
    );

    const { data: schedule, error: updateError } = await supabase
      .from("class_schedules")
      .update(updateData)
      .eq("id", validated.schedule_id)
      .select(
        `
        *,
        class_type:class_types(*),
        instructor:users!class_schedules_instructor_id_fkey(
          id,
          email,
          raw_user_meta_data
        )
      `,
      )
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      data: {
        ...schedule,
        instructor: schedule.instructor
          ? {
              id: schedule.instructor.id,
              name:
                schedule.instructor.raw_user_meta_data?.full_name ||
                schedule.instructor.email,
              email: schedule.instructor.email,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("Error updating class schedule:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request data",
          details: error.errors,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { success: false, error: "Failed to update class schedule" },
      { status: 500 },
    );
  }
}

// DELETE - Delete/Cancel class schedule
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createClient();
    const { searchParams } = new URL(request.url);
    const scheduleId = searchParams.get("schedule_id");

    if (!scheduleId) {
      return NextResponse.json(
        { success: false, error: "schedule_id is required" },
        { status: 400 },
      );
    }

    // Check if there are any confirmed bookings
    const { data: bookings } = await supabase
      .from("class_bookings")
      .select("id")
      .eq("schedule_id", scheduleId)
      .eq("status", "confirmed");

    if (bookings && bookings.length > 0) {
      // Cancel the class instead of deleting it
      const { error: updateError } = await supabase
        .from("class_schedules")
        .update({ status: "cancelled" })
        .eq("id", scheduleId);

      if (updateError) throw updateError;

      // Optionally notify customers about cancellation
      // This could trigger a notification system

      return NextResponse.json({
        success: true,
        message: "Class cancelled due to existing bookings",
      });
    } else {
      // No bookings, safe to delete
      const { error: deleteError } = await supabase
        .from("class_schedules")
        .delete()
        .eq("id", scheduleId);

      if (deleteError) throw deleteError;

      return NextResponse.json({
        success: true,
        message: "Class schedule deleted successfully",
      });
    }
  } catch (error) {
    console.error("Error deleting class schedule:", error);

    return NextResponse.json(
      { success: false, error: "Failed to delete class schedule" },
      { status: 500 },
    );
  }
}
