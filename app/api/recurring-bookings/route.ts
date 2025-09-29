import { createClient } from "@/app/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

// Validation schemas
const createRecurringBookingSchema = z.object({
  organization_id: z.string().uuid(),
  client_id: z.string().uuid(),
  class_type_id: z.string().uuid().optional(),
  instructor_id: z.string().uuid().optional(),
  recurrence_type: z.enum(["weekly", "biweekly", "monthly"]),
  recurrence_pattern: z.object({
    days: z.array(z.number().min(0).max(6)), // 0=Sunday, 6=Saturday
    time: z.string().regex(/^\d{2}:\d{2}$/), // HH:MM format
    duration: z.number().min(30).max(180), // minutes
    weeks: z.array(z.number()).optional(), // For biweekly patterns
    monthlyPattern: z.enum(["date", "day"]).optional(), // For monthly patterns
  }),
  start_date: z.string().date(),
  end_date: z.string().date().optional(),
  max_bookings: z.number().int().min(1).optional(),
  auto_book: z.boolean().default(true),
  payment_method: z
    .enum(["per_class", "monthly", "package"])
    .default("per_class"),
  price_per_class_pennies: z.number().int().min(0).default(0),
});

const updateRecurringBookingSchema = z.object({
  recurring_booking_id: z.string().uuid(),
  recurrence_pattern: z
    .object({
      days: z.array(z.number().min(0).max(6)),
      time: z.string().regex(/^\d{2}:\d{2}$/),
      duration: z.number().min(30).max(180),
      weeks: z.array(z.number()).optional(),
      monthlyPattern: z.enum(["date", "day"]).optional(),
    })
    .optional(),
  end_date: z.string().date().optional(),
  max_bookings: z.number().int().min(1).optional(),
  auto_book: z.boolean().optional(),
  status: z.enum(["active", "paused", "cancelled", "completed"]).optional(),
  price_per_class_pennies: z.number().int().min(0).optional(),
});

// Helper function to check if a date matches the recurring pattern
const doesDateMatchPattern = (
  date: Date,
  pattern: any,
  recurrenceType: string,
  startDate: Date,
) => {
  const dayOfWeek = date.getDay();

  if (!pattern.days.includes(dayOfWeek)) {
    return false;
  }

  if (recurrenceType === "biweekly") {
    const weeksSinceStart = Math.floor(
      (date.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000),
    );
    return weeksSinceStart % 2 === 0;
  }

  if (recurrenceType === "monthly") {
    if (pattern.monthlyPattern === "date") {
      // Same date each month
      return date.getDate() === startDate.getDate();
    } else {
      // Same weekday and week of month
      const startWeekOfMonth = Math.ceil(startDate.getDate() / 7);
      const currentWeekOfMonth = Math.ceil(date.getDate() / 7);
      return startWeekOfMonth === currentWeekOfMonth;
    }
  }

  return true; // Weekly is already checked by day of week
};

// Function to find matching class schedules
const findMatchingSchedules = async (
  supabase: any,
  pattern: any,
  organizationId: string,
  classTypeId?: string,
  instructorId?: string,
) => {
  const [hours, minutes] = pattern.time.split(":").map(Number);
  const preferredTime = hours * 60 + minutes; // Convert to minutes since midnight
  const tolerance = 30; // 30 minute tolerance

  let query = supabase
    .from("class_schedules")
    .select(
      `
      *,
      class_type:class_types(*)
    `,
    )
    .eq("organization_id", organizationId)
    .eq("status", "scheduled")
    .gte("start_time", new Date().toISOString());

  if (classTypeId) {
    query = query.eq("class_type_id", classTypeId);
  }

  if (instructorId) {
    query = query.eq("instructor_id", instructorId);
  }

  const { data: schedules } = await query;

  if (!schedules) return [];

  // Filter by time and availability
  return schedules.filter((schedule) => {
    const scheduleTime = new Date(schedule.start_time);
    const scheduleMinutes =
      scheduleTime.getHours() * 60 + scheduleTime.getMinutes();

    // Check if time is within tolerance
    const timeDiff = Math.abs(scheduleMinutes - preferredTime);
    if (timeDiff > tolerance) return false;

    // Check if class has capacity
    return schedule.current_bookings < schedule.max_capacity;
  });
};

// GET - List recurring bookings
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const clientId = searchParams.get("client_id");
    const organizationId = searchParams.get("organization_id");
    const status = searchParams.get("status");
    const includeUpcoming = searchParams.get("include_upcoming") === "true";

    if (!clientId || !organizationId) {
      return NextResponse.json(
        { error: "client_id and organization_id are required" },
        { status: 400 },
      );
    }

    let query = supabase
      .from("recurring_bookings")
      .select(
        `
        *,
        class_type:class_types(*),
        instructor:users!recurring_bookings_instructor_id_fkey(
          id,
          email,
          raw_user_meta_data
        )
      `,
      )
      .eq("client_id", clientId)
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) throw error;

    let result = data?.map((rb) => ({
      ...rb,
      instructor: rb.instructor
        ? {
            id: rb.instructor.id,
            name:
              rb.instructor.raw_user_meta_data?.full_name ||
              rb.instructor.email,
            email: rb.instructor.email,
          }
        : null,
    }));

    // If requested, include upcoming matching schedules
    if (includeUpcoming && result) {
      for (const rb of result) {
        if (rb.status === "active") {
          const matchingSchedules = await findMatchingSchedules(
            supabase,
            rb.recurrence_pattern,
            organizationId,
            rb.class_type_id,
            rb.instructor_id,
          );
          rb.upcoming_matches = matchingSchedules.slice(0, 5); // Limit to 5 upcoming
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error fetching recurring bookings:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch recurring bookings" },
      { status: 500 },
    );
  }
}

// POST - Create new recurring booking
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const validated = createRecurringBookingSchema.parse(body);

    // Validate that start date is in the future
    const startDate = new Date(validated.start_date);
    if (startDate <= new Date()) {
      return NextResponse.json(
        { success: false, error: "Start date must be in the future" },
        { status: 400 },
      );
    }

    // Validate end date if provided
    if (validated.end_date) {
      const endDate = new Date(validated.end_date);
      if (endDate <= startDate) {
        return NextResponse.json(
          { success: false, error: "End date must be after start date" },
          { status: 400 },
        );
      }
    }

    // Validate pattern days array is not empty
    if (validated.recurrence_pattern.days.length === 0) {
      return NextResponse.json(
        { success: false, error: "At least one day must be selected" },
        { status: 400 },
      );
    }

    // Create the recurring booking
    const { data: recurringBooking, error: recurringError } = await supabase
      .from("recurring_bookings")
      .insert({
        organization_id: validated.organization_id,
        client_id: validated.client_id,
        class_type_id: validated.class_type_id,
        instructor_id: validated.instructor_id,
        recurrence_type: validated.recurrence_type,
        recurrence_pattern: validated.recurrence_pattern,
        start_date: validated.start_date,
        end_date: validated.end_date,
        max_bookings: validated.max_bookings,
        auto_book: validated.auto_book,
        payment_method: validated.payment_method,
        price_per_class_pennies: validated.price_per_class_pennies,
        status: "active",
        current_bookings: 0,
      })
      .select(
        `
        *,
        class_type:class_types(*),
        instructor:users!recurring_bookings_instructor_id_fkey(
          id,
          email,
          raw_user_meta_data
        )
      `,
      )
      .single();

    if (recurringError) throw recurringError;

    // Find immediate matching schedules if auto_book is true
    let immediateBookings = [];
    if (validated.auto_book) {
      const matchingSchedules = await findMatchingSchedules(
        supabase,
        validated.recurrence_pattern,
        validated.organization_id,
        validated.class_type_id,
        validated.instructor_id,
      );

      // Book matching schedules that fit the recurring pattern
      for (const schedule of matchingSchedules.slice(0, 5)) {
        // Limit initial bookings
        const scheduleDate = new Date(schedule.start_time);

        if (
          doesDateMatchPattern(
            scheduleDate,
            validated.recurrence_pattern,
            validated.recurrence_type,
            startDate,
          )
        ) {
          // Check if client is not already booked
          const { data: existingBooking } = await supabase
            .from("class_bookings")
            .select("id")
            .eq("schedule_id", schedule.id)
            .eq("client_id", validated.client_id)
            .eq("status", "confirmed")
            .single();

          if (!existingBooking) {
            const { data: booking, error: bookingError } = await supabase
              .from("class_bookings")
              .insert({
                organization_id: validated.organization_id,
                schedule_id: schedule.id,
                client_id: validated.client_id,
                recurring_booking_id: recurringBooking.id,
                booking_type: "recurring",
                status: "confirmed",
                payment_status: "succeeded",
                payment_amount_pennies: validated.price_per_class_pennies,
              })
              .select()
              .single();

            if (!bookingError && booking) {
              immediateBookings.push(booking);
            }
          }
        }
      }

      // Update current bookings count
      if (immediateBookings.length > 0) {
        await supabase
          .from("recurring_bookings")
          .update({ current_bookings: immediateBookings.length })
          .eq("id", recurringBooking.id);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        ...recurringBooking,
        instructor: recurringBooking.instructor
          ? {
              id: recurringBooking.instructor.id,
              name:
                recurringBooking.instructor.raw_user_meta_data?.full_name ||
                recurringBooking.instructor.email,
              email: recurringBooking.instructor.email,
            }
          : null,
        immediate_bookings: immediateBookings,
      },
    });
  } catch (error) {
    console.error("Error creating recurring booking:", error);

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
      { success: false, error: "Failed to create recurring booking" },
      { status: 500 },
    );
  }
}

// PUT - Update recurring booking
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const validated = updateRecurringBookingSchema.parse(body);

    // Get current recurring booking
    const { data: currentBooking, error: fetchError } = await supabase
      .from("recurring_bookings")
      .select("*")
      .eq("id", validated.recurring_booking_id)
      .single();

    if (fetchError || !currentBooking) {
      return NextResponse.json(
        { success: false, error: "Recurring booking not found" },
        { status: 404 },
      );
    }

    // Validate end date if provided
    if (validated.end_date) {
      const endDate = new Date(validated.end_date);
      const startDate = new Date(currentBooking.start_date);
      if (endDate <= startDate) {
        return NextResponse.json(
          { success: false, error: "End date must be after start date" },
          { status: 400 },
        );
      }
    }

    // Update the recurring booking
    const updateData = Object.fromEntries(
      Object.entries(validated).filter(
        ([key, value]) => key !== "recurring_booking_id" && value !== undefined,
      ),
    );

    const { data: updatedBooking, error: updateError } = await supabase
      .from("recurring_bookings")
      .update(updateData)
      .eq("id", validated.recurring_booking_id)
      .select(
        `
        *,
        class_type:class_types(*),
        instructor:users!recurring_bookings_instructor_id_fkey(
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
        ...updatedBooking,
        instructor: updatedBooking.instructor
          ? {
              id: updatedBooking.instructor.id,
              name:
                updatedBooking.instructor.raw_user_meta_data?.full_name ||
                updatedBooking.instructor.email,
              email: updatedBooking.instructor.email,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("Error updating recurring booking:", error);

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
      { success: false, error: "Failed to update recurring booking" },
      { status: 500 },
    );
  }
}

// DELETE - Cancel recurring booking
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const recurringBookingId = searchParams.get("recurring_booking_id");
    const cancelFutureBookings =
      searchParams.get("cancel_future_bookings") === "true";

    if (!recurringBookingId) {
      return NextResponse.json(
        { success: false, error: "recurring_booking_id is required" },
        { status: 400 },
      );
    }

    // Cancel the recurring booking
    const { error: updateError } = await supabase
      .from("recurring_bookings")
      .update({ status: "cancelled" })
      .eq("id", recurringBookingId);

    if (updateError) throw updateError;

    // Optionally cancel future bookings
    if (cancelFutureBookings) {
      const { error: cancelBookingsError } = await supabase
        .from("class_bookings")
        .update({
          status: "cancelled",
          cancelled_at: new Date().toISOString(),
          cancellation_reason: "Recurring booking cancelled",
        })
        .eq("recurring_booking_id", recurringBookingId)
        .eq("status", "confirmed")
        .gte("class_schedule.start_time", new Date().toISOString());

      if (cancelBookingsError) {
        console.error("Error cancelling future bookings:", cancelBookingsError);
        // Don't fail the main operation if this fails
      }
    }

    return NextResponse.json({
      success: true,
      message: "Recurring booking cancelled successfully",
    });
  } catch (error) {
    console.error("Error cancelling recurring booking:", error);

    return NextResponse.json(
      { success: false, error: "Failed to cancel recurring booking" },
      { status: 500 },
    );
  }
}
