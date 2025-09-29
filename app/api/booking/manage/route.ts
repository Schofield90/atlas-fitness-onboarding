import { NextRequest, NextResponse } from "next/server";
import { availabilityEngine } from "@/app/lib/availability-engine";
import { googleCalendarService } from "@/app/lib/google-calendar-enhanced";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { z } from "zod";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

export const runtime = "nodejs";

// Validation schema for booking management
const rescheduleBookingSchema = z.object({
  token: z.string().min(1, "Token is required"),
  new_start_time: z.string().datetime(),
  new_end_time: z.string().datetime(),
  reason: z.string().optional(),
});

const cancelBookingSchema = z.object({
  token: z.string().min(1, "Token is required"),
  reason: z.string().optional(),
});

// GET /api/booking/manage?token= - Get booking details for management
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        {
          error: "Token is required",
        },
        { status: 400 },
      );
    }

    const adminSupabase = createAdminClient();

    // Find booking by confirmation or cancellation token
    const { data: booking, error: bookingError } = await adminSupabase
      .from("bookings")
      .select(
        `
        *,
        appointment_type:appointment_types(*),
        assigned_staff:users!assigned_to(id, full_name),
        organization:organizations(id, name, slug)
      `,
      )
      .or(`confirmation_token.eq.${token},cancellation_token.eq.${token}`)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        {
          error: "Booking not found or invalid token",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      booking: {
        id: booking.id,
        title: booking.title,
        description: booking.description,
        start_time: booking.start_time,
        end_time: booking.end_time,
        status: booking.booking_status,
        attendee_name: booking.attendee_name,
        attendee_email: booking.attendee_email,
        attendee_phone: booking.attendee_phone,
        location_type: booking.location_type,
        location_details: booking.location_details,
        timezone: booking.timezone,
        reschedule_count: booking.reschedule_count,
        appointment_type: booking.appointment_type
          ? {
              id: booking.appointment_type.id,
              name: booking.appointment_type.name,
              duration_minutes: booking.appointment_type.duration_minutes,
              description: booking.appointment_type.description,
            }
          : null,
        staff: booking.assigned_staff
          ? {
              id: booking.assigned_staff.id,
              name: booking.assigned_staff.full_name,
            }
          : null,
        organization: booking.organization
          ? {
              id: booking.organization.id,
              name: booking.organization.name,
              slug: booking.organization.slug,
            }
          : null,
        can_reschedule:
          booking.booking_status === "confirmed" &&
          booking.reschedule_count < 3,
        can_cancel: booking.booking_status === "confirmed",
      },
    });
  } catch (error) {
    console.error("Error getting booking:", error);
    return NextResponse.json(
      {
        error: "Failed to get booking",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// PUT /api/booking/manage - Reschedule booking
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = rescheduleBookingSchema.parse(body);
    const { token, new_start_time, new_end_time, reason } = validatedData;

    const adminSupabase = createAdminClient();

    // Find booking by token
    const { data: booking, error: bookingError } = await adminSupabase
      .from("bookings")
      .select(
        `
        *,
        appointment_type:appointment_types(*),
        organization:organizations(id)
      `,
      )
      .or(`confirmation_token.eq.${token},cancellation_token.eq.${token}`)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        {
          error: "Booking not found or invalid token",
        },
        { status: 404 },
      );
    }

    // Check if booking can be rescheduled
    if (booking.booking_status !== "confirmed") {
      return NextResponse.json(
        {
          error: "Booking cannot be rescheduled in its current status",
        },
        { status: 400 },
      );
    }

    if (booking.reschedule_count >= 3) {
      return NextResponse.json(
        {
          error:
            "Maximum reschedule limit reached. Please contact us directly.",
        },
        { status: 400 },
      );
    }

    // Check if new slot is available
    const isAvailable = await availabilityEngine.isSlotAvailable(
      booking.assigned_to,
      booking.organization_id,
      new_start_time,
      new_end_time,
      booking.appointment_type_id,
    );

    if (!isAvailable) {
      return NextResponse.json(
        {
          error: "New time slot is not available",
        },
        { status: 409 },
      );
    }

    // Update booking
    const { data: updatedBooking, error: updateError } = await adminSupabase
      .from("bookings")
      .update({
        start_time: new_start_time,
        end_time: new_end_time,
        reschedule_count: booking.reschedule_count + 1,
        notes: booking.notes
          ? `${booking.notes}\n\nRescheduled on ${new Date().toISOString()}: ${reason || "No reason provided"}`
          : `Rescheduled on ${new Date().toISOString()}: ${reason || "No reason provided"}`,
      })
      .eq("id", booking.id)
      .select("*")
      .single();

    if (updateError || !updatedBooking) {
      return NextResponse.json(
        {
          error: "Failed to reschedule booking",
        },
        { status: 500 },
      );
    }

    // Update Google Calendar event
    try {
      if (booking.google_event_id) {
        await googleCalendarService.updateBookingEvent(
          booking.assigned_to,
          booking.google_event_id,
          {
            start_time: new_start_time,
            end_time: new_end_time,
            timezone: booking.timezone,
          },
        );
      }
    } catch (calendarError) {
      console.error("Failed to update Google Calendar event:", calendarError);
      // Continue without failing the reschedule
    }

    // Send reschedule notification
    try {
      await adminSupabase.from("notifications").insert({
        organization_id: booking.organization_id,
        booking_id: booking.id,
        type: "email",
        template: "booking_rescheduled",
        recipient_email: booking.attendee_email,
        recipient_name: booking.attendee_name,
        subject: `Booking Rescheduled: ${booking.title}`,
        body: generateRescheduleConfirmationEmail(
          updatedBooking,
          booking.appointment_type,
        ),
        send_at: new Date().toISOString(),
      });
    } catch (notificationError) {
      console.error(
        "Failed to send reschedule notification:",
        notificationError,
      );
    }

    return NextResponse.json({
      success: true,
      message: "Booking successfully rescheduled",
      booking: {
        id: updatedBooking.id,
        start_time: updatedBooking.start_time,
        end_time: updatedBooking.end_time,
        reschedule_count: updatedBooking.reschedule_count,
      },
    });
  } catch (error) {
    console.error("Error rescheduling booking:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid request data",
          details: error.errors,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error: "Failed to reschedule booking",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// DELETE /api/booking/manage - Cancel booking
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = cancelBookingSchema.parse(body);
    const { token, reason } = validatedData;

    const adminSupabase = createAdminClient();

    // Find booking by token
    const { data: booking, error: bookingError } = await adminSupabase
      .from("bookings")
      .select(
        `
        *,
        appointment_type:appointment_types(*),
        organization:organizations(id)
      `,
      )
      .or(`confirmation_token.eq.${token},cancellation_token.eq.${token}`)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        {
          error: "Booking not found or invalid token",
        },
        { status: 404 },
      );
    }

    // Check if booking can be cancelled
    if (booking.booking_status === "cancelled") {
      return NextResponse.json(
        {
          error: "Booking is already cancelled",
        },
        { status: 400 },
      );
    }

    if (
      booking.booking_status === "completed" ||
      booking.booking_status === "attended"
    ) {
      return NextResponse.json(
        {
          error: "Cannot cancel a completed booking",
        },
        { status: 400 },
      );
    }

    // Update booking status
    const { data: cancelledBooking, error: updateError } = await adminSupabase
      .from("bookings")
      .update({
        booking_status: "cancelled",
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason,
        notes: booking.notes
          ? `${booking.notes}\n\nCancelled on ${new Date().toISOString()}: ${reason || "No reason provided"}`
          : `Cancelled on ${new Date().toISOString()}: ${reason || "No reason provided"}`,
      })
      .eq("id", booking.id)
      .select("*")
      .single();

    if (updateError || !cancelledBooking) {
      return NextResponse.json(
        {
          error: "Failed to cancel booking",
        },
        { status: 500 },
      );
    }

    // Delete Google Calendar event
    try {
      if (booking.google_event_id) {
        await googleCalendarService.deleteBookingEvent(
          booking.assigned_to,
          booking.google_event_id,
        );
      }
    } catch (calendarError) {
      console.error("Failed to delete Google Calendar event:", calendarError);
      // Continue without failing the cancellation
    }

    // Send cancellation notification
    try {
      await adminSupabase.from("notifications").insert({
        organization_id: booking.organization_id,
        booking_id: booking.id,
        type: "email",
        template: "booking_cancelled",
        recipient_email: booking.attendee_email,
        recipient_name: booking.attendee_name,
        subject: `Booking Cancelled: ${booking.title}`,
        body: generateCancellationConfirmationEmail(
          cancelledBooking,
          booking.appointment_type,
        ),
        send_at: new Date().toISOString(),
      });
    } catch (notificationError) {
      console.error(
        "Failed to send cancellation notification:",
        notificationError,
      );
    }

    return NextResponse.json({
      success: true,
      message: "Booking successfully cancelled",
      booking: {
        id: cancelledBooking.id,
        status: cancelledBooking.booking_status,
        cancelled_at: cancelledBooking.cancelled_at,
      },
    });
  } catch (error) {
    console.error("Error cancelling booking:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid request data",
          details: error.errors,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error: "Failed to cancel booking",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// Helper function to generate reschedule confirmation email
function generateRescheduleConfirmationEmail(
  booking: any,
  appointmentType: any,
): string {
  return `
    <h2>Your booking has been rescheduled</h2>
    <p>Hi ${booking.attendee_name},</p>
    <p>Your ${appointmentType?.name || "appointment"} has been successfully rescheduled.</p>
    
    <h3>New Booking Details:</h3>
    <ul>
      <li><strong>Date:</strong> ${new Date(booking.start_time).toLocaleDateString()}</li>
      <li><strong>Time:</strong> ${new Date(booking.start_time).toLocaleTimeString()} - ${new Date(booking.end_time).toLocaleTimeString()}</li>
      <li><strong>Duration:</strong> ${appointmentType?.duration_minutes || "30"} minutes</li>
      ${booking.location_details ? `<li><strong>Location:</strong> ${booking.location_details}</li>` : ""}
    </ul>
    
    <p>Need to make another change? <a href="${process.env.NEXT_PUBLIC_APP_URL}/booking/manage/${booking.cancellation_token}">Click here</a></p>
    
    <p>We look forward to seeing you at your new appointment time!</p>
  `;
}

// Helper function to generate cancellation confirmation email
function generateCancellationConfirmationEmail(
  booking: any,
  appointmentType: any,
): string {
  return `
    <h2>Your booking has been cancelled</h2>
    <p>Hi ${booking.attendee_name},</p>
    <p>Your ${appointmentType?.name || "appointment"} scheduled for ${new Date(booking.start_time).toLocaleDateString()} at ${new Date(booking.start_time).toLocaleTimeString()} has been cancelled as requested.</p>
    
    <p>If you'd like to book a new appointment, please visit our booking page.</p>
    
    <p>Thank you for your understanding.</p>
  `;
}
