import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { sendWhatsAppMessage } from "@/app/lib/services/twilio";
import {
  formatBritishDate,
  formatBritishDateTime,
} from "@/app/lib/utils/british-format";

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
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

    // Get booking details before cancelling
    const { data: booking, error: fetchError } = await supabase
      .from("class_bookings")
      .select(
        `
        *,
        class_session:class_sessions(
          *,
          program:programs(name)
        )
      `,
      )
      .eq("id", bookingId)
      .single();

    if (fetchError || !booking) {
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

    // Cancel booking
    const { error: cancelError } = await supabase
      .from("class_bookings")
      .update({ status: "cancelled" })
      .eq("id", bookingId);

    if (cancelError) {
      console.error("Cancellation error:", cancelError);
      return NextResponse.json(
        { error: "Failed to cancel booking" },
        { status: 500 },
      );
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
