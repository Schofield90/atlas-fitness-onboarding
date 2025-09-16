import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import {
  requireAuthWithOrg,
  createErrorResponse,
} from "@/app/lib/api/auth-check-org";
import { sendWhatsAppMessage } from "@/app/lib/services/twilio";
import { z } from "zod";

// Input validation schemas
const createBookingSchema = z.object({
  classSessionId: z.string().uuid(),
  customerId: z.string().uuid(),
  customerName: z.string().min(1).max(100),
  customerEmail: z.string().email(),
  customerPhone: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Check authentication and get organization
    const user = await requireAuthWithOrg();

    const supabase = createClient();
    const body = await request.json();

    // Validate input
    const validatedData = createBookingSchema.parse(body);
    const {
      classSessionId,
      customerId,
      customerName,
      customerEmail,
      customerPhone,
    } = validatedData;

    // SECURITY: Verify class session belongs to user's organization
    const { data: classSession, error: sessionError } = await supabase
      .from("class_sessions")
      .select(
        `
        *,
        program:programs!inner(
          name, 
          description, 
          price_pennies,
          organization_id
        )
      `,
      )
      .eq("id", classSessionId)
      .eq("program.organization_id", user.organizationId) // CRITICAL: Organization check
      .single();

    if (sessionError || !classSession) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    // SECURITY: Verify customer belongs to user's organization
    const { data: customer, error: customerError } = await supabase
      .from("clients")
      .select("id")
      .eq("id", customerId)
      .eq("organization_id", user.organizationId) // CRITICAL: Organization check
      .single();

    if (customerError || !customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 },
      );
    }

    // Check if class is full
    const { count: bookingCount } = await supabase
      .from("class_bookings")
      .select("*", { count: "exact", head: true })
      .eq("class_session_id", classSessionId)
      .eq("status", "confirmed");

    if (bookingCount && bookingCount >= classSession.capacity) {
      return NextResponse.json({ error: "Class is full" }, { status: 400 });
    }

    // Check for duplicate booking
    const { data: existingBooking } = await supabase
      .from("class_bookings")
      .select("id")
      .eq("class_session_id", classSessionId)
      .eq("customer_id", customerId)
      .eq("status", "confirmed")
      .single();

    if (existingBooking) {
      return NextResponse.json(
        { error: "Customer already booked for this class" },
        { status: 400 },
      );
    }

    // Create booking with organization reference
    const { data: booking, error: bookingError } = await supabase
      .from("class_bookings")
      .insert({
        class_session_id: classSessionId,
        customer_id: customerId,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        status: "confirmed",
        organization_id: user.organizationId, // Add organization reference
      })
      .select()
      .single();

    if (bookingError) {
      console.error("Booking error:", bookingError);
      return NextResponse.json(
        { error: "Failed to create booking" },
        { status: 500 },
      );
    }

    // Send WhatsApp confirmation if phone provided
    if (customerPhone) {
      const classDate = new Date(classSession.starts_at).toLocaleDateString();
      const classTime = new Date(classSession.starts_at).toLocaleTimeString(
        [],
        {
          hour: "2-digit",
          minute: "2-digit",
        },
      );

      const confirmationMessage = `🎯 Booking Confirmed!\n\nClass: ${classSession.program.name}\nDate: ${classDate}\nTime: ${classTime}\n\nWe look forward to seeing you! Reply CANCEL to cancel your booking (24hr notice required).`;

      try {
        await sendWhatsAppMessage({
          to: customerPhone,
          body: confirmationMessage,
        });
      } catch (whatsappError) {
        console.error("WhatsApp notification failed:", whatsappError);
      }
    }

    // Log in CRM
    try {
      await supabase.from("client_activities").insert({
        client_id: customerId,
        organization_id: user.organizationId,
        activity_type: "class_booked",
        description: `Booked ${classSession.program.name} for ${new Date(classSession.starts_at).toLocaleDateString()}`,
        metadata: {
          class_session_id: classSessionId,
          booking_id: booking.id,
        },
      });
    } catch (crmError) {
      console.error("CRM logging failed:", crmError);
    }

    return NextResponse.json({
      message: "Booking confirmed",
      booking,
      whatsappSent: !!customerPhone,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }
    return createErrorResponse(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Check authentication and get organization
    const user = await requireAuthWithOrg();

    const supabase = createClient();
    const searchParams = request.nextUrl.searchParams;
    const bookingId = searchParams.get("bookingId");
    const customerPhone = searchParams.get("customerPhone");

    if (!bookingId) {
      return NextResponse.json(
        { error: "Booking ID required" },
        { status: 400 },
      );
    }

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(bookingId)) {
      return NextResponse.json(
        { error: "Invalid booking ID format" },
        { status: 400 },
      );
    }

    // SECURITY: Get booking with organization check via join
    const { data: booking, error: fetchError } = await supabase
      .from("class_bookings")
      .select(
        `
        *,
        class_session:class_sessions!inner(
          *,
          program:programs!inner(
            name,
            organization_id
          )
        )
      `,
      )
      .eq("id", bookingId)
      .eq("class_session.program.organization_id", user.organizationId) // CRITICAL: Organization check
      .single();

    if (fetchError || !booking) {
      // Don't reveal if booking exists in another organization
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Check 24-hour cancellation policy
    const classStartTime = new Date(booking.class_session.starts_at);
    const now = new Date();
    const hoursUntilClass =
      (classStartTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilClass < 24) {
      return NextResponse.json(
        {
          error: "Cannot cancel within 24 hours of class start time",
        },
        { status: 400 },
      );
    }

    // SECURITY: Cancel booking with organization check
    const { error: cancelError } = await supabase
      .from("class_bookings")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        cancelled_by: user.id,
      })
      .eq("id", bookingId)
      .eq("organization_id", user.organizationId); // CRITICAL: Organization check

    if (cancelError) {
      console.error("Cancellation error:", cancelError);
      return NextResponse.json(
        { error: "Failed to cancel booking" },
        { status: 500 },
      );
    }

    // Send WhatsApp cancellation confirmation
    if (customerPhone) {
      const classDate = new Date(
        booking.class_session.starts_at,
      ).toLocaleDateString();
      const cancellationMessage = `✅ Booking Cancelled\n\nYour booking for ${booking.class_session.program.name} on ${classDate} has been cancelled.\n\nWe hope to see you in another class soon!`;

      try {
        await sendWhatsAppMessage({
          to: customerPhone,
          body: cancellationMessage,
        });
      } catch (whatsappError) {
        console.error(
          "WhatsApp cancellation notification failed:",
          whatsappError,
        );
      }
    }

    // Check waitlist and promote if available
    const { data: waitlistEntry } = await supabase
      .from("class_waitlist")
      .select("*")
      .eq("class_session_id", booking.class_session_id)
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    if (waitlistEntry) {
      // Move from waitlist to booking
      const { error: promoteError } = await supabase
        .from("class_bookings")
        .insert({
          class_session_id: waitlistEntry.class_session_id,
          customer_id: waitlistEntry.customer_id,
          customer_name: waitlistEntry.customer_name,
          customer_email: waitlistEntry.customer_email,
          customer_phone: waitlistEntry.customer_phone,
          status: "confirmed",
          organization_id: user.organizationId,
          promoted_from_waitlist: true,
        });

      if (!promoteError) {
        // Remove from waitlist
        await supabase
          .from("class_waitlist")
          .delete()
          .eq("id", waitlistEntry.id);

        // Notify promoted customer
        if (waitlistEntry.customer_phone) {
          try {
            await sendWhatsAppMessage({
              to: waitlistEntry.customer_phone,
              body: `🎉 Good news! A spot has opened up in ${booking.class_session.program.name}. You've been automatically enrolled from the waitlist!`,
            });
          } catch (e) {
            console.error("Waitlist promotion notification failed:", e);
          }
        }
      }
    }

    return NextResponse.json({
      message: "Booking cancelled successfully",
      waitlistPromoted: !!waitlistEntry,
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}
