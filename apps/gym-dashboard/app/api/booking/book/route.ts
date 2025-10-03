import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/app/lib/supabase/server";
import { sendWhatsAppMessage } from "@/app/lib/services/twilio";
import {
  formatBritishDate,
  formatBritishDateTime,
} from "@/app/lib/utils/british-format";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceRoleClient();
    const body = await request.json();

    const {
      classSessionId,
      customerId,
      customerName,
      customerEmail,
      customerPhone,
    } = body;

    if (!classSessionId || !customerId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Get class session details
    const { data: classSession, error: sessionError } = await supabase
      .from("class_sessions")
      .select(
        `
        *,
        program:programs(name, description, price_pennies)
      `,
      )
      .eq("id", classSessionId)
      .single();

    if (sessionError || !classSession) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    // Check if client has an active membership
    const { data: activeMembership, error: membershipError } = await supabase
      .from("customer_memberships")
      .select("*")
      .eq("client_id", customerId)
      .eq("status", "active")
      .gte("end_date", new Date().toISOString().split("T")[0])
      .single();

    if (membershipError || !activeMembership) {
      return NextResponse.json(
        {
          error: "No active membership found",
          message:
            "You need an active membership to book classes. Please contact the gym to activate your membership.",
        },
        { status: 403 },
      );
    }

    // Check if membership has available credits (if applicable)
    if (
      activeMembership.credits_remaining !== null &&
      activeMembership.credits_remaining <= 0
    ) {
      return NextResponse.json(
        {
          error: "No credits remaining",
          message:
            "You have no credits remaining on your membership. Please contact the gym to purchase more credits.",
        },
        { status: 403 },
      );
    }

    // Check for existing booking (duplicate prevention)
    const { data: existingBooking } = await supabase
      .from("bookings")
      .select("id")
      .eq("client_id", customerId)
      .eq("class_session_id", classSessionId)
      .eq("status", "confirmed")
      .maybeSingle();

    const { data: existingClassBooking } = await supabase
      .from("class_bookings")
      .select("id")
      .eq("client_id", customerId)
      .eq("class_session_id", classSessionId)
      .eq("booking_status", "confirmed")
      .maybeSingle();

    if (existingBooking || existingClassBooking) {
      return NextResponse.json(
        { error: "You have already booked this class" },
        { status: 409 },
      );
    }

    // Check if class is full
    const { count: bookingCount } = await supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("class_session_id", classSessionId)
      .eq("status", "confirmed");

    const maxCapacity = classSession.capacity || classSession.max_capacity;
    if (bookingCount && bookingCount >= maxCapacity) {
      return NextResponse.json({ error: "Class is full" }, { status: 400 });
    }

    // Create booking - use client_id for direct client bookings
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        class_session_id: classSessionId,
        client_id: customerId, // Using client_id for client portal bookings
        organization_id: classSession.organization_id,
        status: "confirmed",
        booking_date: new Date().toISOString().split("T")[0],
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

    // Update the booking count on class_sessions
    await supabase
      .from("class_sessions")
      .update({
        current_bookings: (classSession.current_bookings || 0) + 1,
      })
      .eq("id", classSessionId);

    // Deduct credit from membership if applicable
    if (
      activeMembership.credits_remaining !== null &&
      activeMembership.credits_remaining > 0
    ) {
      await supabase
        .from("customer_memberships")
        .update({
          credits_remaining: activeMembership.credits_remaining - 1,
        })
        .eq("id", activeMembership.id);
    }

    // Send WhatsApp confirmation if phone number provided
    if (customerPhone) {
      const classDate = new Date(classSession.start_time);
      const formattedDate = formatBritishDate(classDate);
      const formattedTime = classDate.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });

      const confirmationMessage = `🎉 Booking Confirmed!

Hi ${customerName || "there"},

Your class has been booked:
📍 ${classSession.program?.name || classSession.name || "Class"}
📅 ${formattedDate}
⏰ ${formattedTime}
📍 ${classSession.location || "Main Studio"}
👤 ${classSession.instructor_name || "Instructor"}

We're looking forward to seeing you! 

💡 Tips:
• Arrive 10 minutes early
• Bring water and a towel
• Wear comfortable workout clothes

Need to cancel? Reply CANCEL to this message.

See you there! 💪
Atlas Fitness Team`;

      try {
        await sendWhatsAppMessage({
          to: customerPhone,
          body: confirmationMessage,
        });
      } catch (whatsappError) {
        // Log error but don't fail the booking
        console.error("WhatsApp notification failed:", whatsappError);
      }
    }

    // Also log the booking in the CRM
    try {
      await supabase.from("client_activities").insert({
        client_id: customerId,
        activity_type: "class_booked",
        description: `Booked ${classSession.program?.name || classSession.name || "Class"} for ${formatBritishDate(new Date(classSession.start_time))}`,
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
    console.error("Error in POST /api/booking/book:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServiceRoleClient();
    const searchParams = request.nextUrl.searchParams;
    const bookingId = searchParams.get("bookingId");
    const customerPhone = searchParams.get("customerPhone");

    if (!bookingId) {
      return NextResponse.json(
        { error: "Booking ID required" },
        { status: 400 },
      );
    }

    // Get booking details before cancelling
    const { data: booking, error: fetchError } = await supabase
      .from("bookings")
      .select(
        `
        *,
        class_session:class_sessions(
          *,
          program:programs(name)
        ),
        client:clients(*)
      `,
      )
      .eq("id", bookingId)
      .single();

    if (fetchError || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Check 24-hour cancellation policy
    const classStartTime = new Date(booking.class_session.start_time);
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

    // Cancel booking
    const { error: cancelError } = await supabase
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", bookingId);

    if (cancelError) {
      console.error("Cancellation error:", cancelError);
      return NextResponse.json(
        { error: "Failed to cancel booking" },
        { status: 500 },
      );
    }

    // Update class session booking count
    await supabase
      .from("class_sessions")
      .update({
        current_bookings: Math.max(
          0,
          (booking.class_session.current_bookings || 1) - 1,
        ),
      })
      .eq("id", booking.class_session_id);

    // Restore credit to membership if applicable
    if (booking.client_id) {
      const { data: membership } = await supabase
        .from("customer_memberships")
        .select("*")
        .eq("client_id", booking.client_id)
        .eq("status", "active")
        .single();

      if (membership && membership.credits_remaining !== null) {
        await supabase
          .from("customer_memberships")
          .update({
            credits_remaining: membership.credits_remaining + 1,
          })
          .eq("id", membership.id);
      }
    }

    // Send WhatsApp cancellation confirmation
    if (customerPhone) {
      const cancellationMessage = `✅ Booking Cancelled

Your booking for ${booking.class_session.program.name} on ${formatBritishDate(new Date(booking.class_session.starts_at))} has been cancelled.

We hope to see you in another class soon! 

Browse available classes at: ${process.env.NEXT_PUBLIC_URL}/booking

Atlas Fitness Team`;

      try {
        await sendWhatsAppMessage({
          to: customerPhone,
          body: cancellationMessage,
        });
      } catch (whatsappError) {
        console.error("WhatsApp notification failed:", whatsappError);
      }
    }

    return NextResponse.json({
      message: "Booking cancelled successfully",
      whatsappSent: !!customerPhone,
    });
  } catch (error) {
    console.error("Error in DELETE /api/booking/book:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
