import { createClient } from "@/app/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Validation schemas
const createBookingSchema = z.object({
  schedule_id: z.string().uuid(),
  client_id: z.string().uuid(),
  booking_type: z
    .enum(["single", "recurring", "package", "drop_in"])
    .default("single"),
  payment_method_id: z.string().optional(),
  special_requirements: z.string().optional(),
  use_package_id: z.string().uuid().optional(),
  metadata: z.record(z.any()).optional(),
});

const createMultipleBookingsSchema = z.object({
  bookings: z.array(
    z.object({
      schedule_id: z.string().uuid(),
      payment_method_id: z.string(),
    }),
  ),
  client_id: z.string().uuid(),
  special_requirements: z.string().optional(),
});

const cancelBookingSchema = z.object({
  booking_id: z.string().uuid(),
  cancellation_reason: z.string().optional(),
});

// Helper functions
const canBookClass = async (
  supabase: any,
  scheduleId: string,
  clientId: string,
) => {
  // Check if class exists and has capacity
  const { data: schedule, error: scheduleError } = await supabase
    .from("class_schedules")
    .select("*")
    .eq("id", scheduleId)
    .single();

  if (scheduleError || !schedule) {
    return { canBook: false, error: "Class not found" };
  }

  // Check if class is full
  if (schedule.current_bookings >= schedule.max_capacity) {
    return { canBook: false, error: "Class is full" };
  }

  // Check if client is already booked
  const { data: existingBooking } = await supabase
    .from("class_bookings")
    .select("id")
    .eq("schedule_id", scheduleId)
    .eq("client_id", clientId)
    .eq("status", "confirmed")
    .single();

  if (existingBooking) {
    return { canBook: false, error: "Already booked for this class" };
  }

  // Check booking cutoff time
  const classStartTime = new Date(schedule.start_time);
  const now = new Date();
  const hoursUntilClass =
    (classStartTime.getTime() - now.getTime()) / (1000 * 60 * 60);
  const cutoffHours = schedule.booking_cutoff_hours || 2;

  if (hoursUntilClass < cutoffHours) {
    return {
      canBook: false,
      error: `Booking closes ${cutoffHours} hours before class`,
    };
  }

  return { canBook: true, schedule };
};

const processPackagePayment = async (
  supabase: any,
  packageId: string,
  organizationId: string,
  clientId: string,
) => {
  const { data: packageData, error: packageError } = await supabase
    .from("customer_class_packages")
    .select("*")
    .eq("id", packageId)
    .eq("organization_id", organizationId)
    .eq("client_id", clientId)
    .eq("status", "active")
    .gt("classes_remaining", 0)
    .single();

  if (packageError || !packageData) {
    throw new Error("Package not found or has no remaining classes");
  }

  // Update package usage
  const { error: updateError } = await supabase
    .from("customer_class_packages")
    .update({
      classes_remaining: packageData.classes_remaining - 1,
      classes_used: packageData.classes_used + 1,
    })
    .eq("id", packageId);

  if (updateError) throw updateError;

  return packageData;
};

// GET - List bookings for a client/organization
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const clientId = searchParams.get("client_id");
    const organizationId = searchParams.get("organization_id");
    const status = searchParams.get("status");
    const type = searchParams.get("type"); // 'upcoming', 'history', 'all'
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    if (!clientId || !organizationId) {
      return NextResponse.json(
        { error: "client_id and organization_id are required" },
        { status: 400 },
      );
    }

    let query = supabase
      .from("class_bookings")
      .select(
        `
        *,
        class_schedule:class_schedules(
          *,
          class_type:class_types(*)
        ),
        recurring_booking:recurring_bookings(*)
      `,
      )
      .eq("client_id", clientId)
      .eq("organization_id", organizationId);

    if (status) {
      query = query.eq("status", status);
    }

    if (type === "upcoming") {
      query = query
        .eq("status", "confirmed")
        .gte("class_schedule.start_time", new Date().toISOString());
    } else if (type === "history") {
      query = query.or(
        `status.neq.confirmed,class_schedule.start_time.lt.${new Date().toISOString()}`,
      );
    }

    const { data, error, count } = await query
      .order("booked_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        limit,
        offset,
        total: count,
      },
    });
  } catch (error) {
    console.error("Error fetching class bookings:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch bookings" },
      { status: 500 },
    );
  }
}

// POST - Create new booking(s)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    // Check if this is a multiple booking request
    if (body.bookings && Array.isArray(body.bookings)) {
      const validated = createMultipleBookingsSchema.parse(body);

      // Process each booking
      const results = [];
      const errors = [];

      for (const bookingData of validated.bookings) {
        try {
          // Check if class can be booked
          const {
            canBook,
            error: canBookError,
            schedule,
          } = await canBookClass(
            supabase,
            bookingData.schedule_id,
            validated.client_id,
          );

          if (!canBook) {
            errors.push({
              schedule_id: bookingData.schedule_id,
              error: canBookError,
            });
            continue;
          }

          // Determine payment processing based on method
          let paymentStatus = "succeeded";
          let paymentAmount = 0;
          let bookingType = "single";
          let metadata = {};

          // Handle package payment
          if (bookingData.payment_method_id.startsWith("package_")) {
            const packageId = bookingData.payment_method_id.replace(
              "package_",
              "",
            );
            await processPackagePayment(
              supabase,
              packageId,
              schedule.organization_id,
              validated.client_id,
            );
            bookingType = "package";
            metadata = { package_id: packageId };
          } else if (
            bookingData.payment_method_id === "card" &&
            schedule.price_pennies > 0
          ) {
            paymentStatus = "pending";
            paymentAmount = schedule.price_pennies;
          }

          // Create booking
          const { data: booking, error: bookingError } = await supabase
            .from("class_bookings")
            .insert({
              organization_id: schedule.organization_id,
              schedule_id: bookingData.schedule_id,
              client_id: validated.client_id,
              booking_type: bookingType,
              status: "confirmed",
              payment_status: paymentStatus,
              payment_amount_pennies: paymentAmount,
              special_requirements: validated.special_requirements,
              metadata,
            })
            .select()
            .single();

          if (bookingError) throw bookingError;

          results.push(booking);
        } catch (bookingError) {
          errors.push({
            schedule_id: bookingData.schedule_id,
            error:
              bookingError instanceof Error
                ? bookingError.message
                : "Unknown error",
          });
        }
      }

      return NextResponse.json({
        success: true,
        data: {
          successful_bookings: results,
          failed_bookings: errors,
          total_requested: validated.bookings.length,
          successful_count: results.length,
          failed_count: errors.length,
        },
      });
    } else {
      // Single booking
      const validated = createBookingSchema.parse(body);

      // Check if class can be booked
      const {
        canBook,
        error: canBookError,
        schedule,
      } = await canBookClass(
        supabase,
        validated.schedule_id,
        validated.client_id,
      );

      if (!canBook) {
        return NextResponse.json(
          { success: false, error: canBookError },
          { status: 400 },
        );
      }

      // Determine payment processing
      let paymentStatus = "succeeded";
      let paymentAmount = 0;
      let bookingType = validated.booking_type;
      let metadata = validated.metadata || {};

      // Handle package payment
      if (validated.use_package_id) {
        await processPackagePayment(
          supabase,
          validated.use_package_id,
          schedule.organization_id,
          validated.client_id,
        );
        bookingType = "package";
        metadata = { ...metadata, package_id: validated.use_package_id };
      } else if (
        validated.payment_method_id === "card" &&
        schedule.price_pennies > 0
      ) {
        paymentStatus = "pending";
        paymentAmount = schedule.price_pennies;
      }

      // Create booking
      const { data: booking, error: bookingError } = await supabase
        .from("class_bookings")
        .insert({
          organization_id: schedule.organization_id,
          schedule_id: validated.schedule_id,
          client_id: validated.client_id,
          booking_type: bookingType,
          status: "confirmed",
          payment_status: paymentStatus,
          payment_amount_pennies: paymentAmount,
          special_requirements: validated.special_requirements,
          metadata,
        })
        .select(
          `
          *,
          class_schedule:class_schedules(
            *,
            class_type:class_types(*)
          )
        `,
        )
        .single();

      if (bookingError) throw bookingError;

      return NextResponse.json({
        success: true,
        data: booking,
      });
    }
  } catch (error) {
    console.error("Error creating booking:", error);

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
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to create booking",
      },
      { status: 500 },
    );
  }
}

// DELETE - Cancel booking
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const validated = cancelBookingSchema.parse(body);

    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from("class_bookings")
      .select(
        `
        *,
        class_schedule:class_schedules(*)
      `,
      )
      .eq("id", validated.booking_id)
      .eq("status", "confirmed")
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { success: false, error: "Booking not found or already cancelled" },
        { status: 404 },
      );
    }

    // Check cancellation cutoff time
    const classStartTime = new Date(booking.class_schedule.start_time);
    const now = new Date();
    const hoursUntilClass =
      (classStartTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    const cutoffHours = booking.class_schedule.cancellation_cutoff_hours || 24;

    if (hoursUntilClass < cutoffHours) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot cancel less than ${cutoffHours} hours before class`,
        },
        { status: 400 },
      );
    }

    // Cancel booking
    const { error: updateError } = await supabase
      .from("class_bookings")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        cancellation_reason: validated.cancellation_reason,
      })
      .eq("id", validated.booking_id);

    if (updateError) throw updateError;

    // If it was a package booking, refund the credit
    if (booking.booking_type === "package" && booking.metadata?.package_id) {
      await supabase
        .from("customer_class_packages")
        .update({
          classes_remaining: supabase.rpc("increment"),
          classes_used: supabase.rpc("decrement"),
        })
        .eq("id", booking.metadata.package_id);
    }

    return NextResponse.json({
      success: true,
      message: "Booking cancelled successfully",
    });
  } catch (error) {
    console.error("Error cancelling booking:", error);

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
      { success: false, error: "Failed to cancel booking" },
      { status: 500 },
    );
  }
}
