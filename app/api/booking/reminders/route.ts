import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { sendWhatsAppMessage } from "@/app/lib/services/twilio";

// This endpoint should be called by a cron job every hour
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get classes starting in the next 2 hours
    const now = new Date();
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    // Fetch upcoming classes with bookings
    const { data: upcomingClasses, error } = await supabase
      .from("class_sessions")
      .select(
        `
        *,
        program:programs(name),
        bookings:class_bookings(
          *,
          customer:customers(*)
        )
      `,
      )
      .gte("starts_at", now.toISOString())
      .lte("starts_at", twoHoursFromNow.toISOString())
      .eq("is_active", true)
      .eq("bookings.status", "confirmed");

    if (error) {
      console.error("Error fetching upcoming classes:", error);
      return NextResponse.json(
        { error: "Failed to fetch classes" },
        { status: 500 },
      );
    }

    let remindersSent = 0;
    const errors = [];

    // Send reminders for each booking
    for (const classSession of upcomingClasses || []) {
      for (const booking of classSession.bookings || []) {
        // Skip if no phone number or reminder already sent
        if (!booking.customer?.phone || booking.reminder_sent) {
          continue;
        }

        const classTime = new Date(classSession.starts_at);
        const minutesUntilClass = Math.round(
          (classTime.getTime() - now.getTime()) / (1000 * 60),
        );

        const reminderMessage = `⏰ Class Reminder!

Hi ${booking.customer.name || "there"},

Your ${classSession.program.name} class starts in ${minutesUntilClass} minutes!

📅 Today at ${classTime.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        })}
📍 ${classSession.location || "Main Studio"}
👤 ${classSession.instructor_name}

See you there! 💪

Can't make it? Cancel at: ${process.env.NEXT_PUBLIC_URL}/booking/cancel/${booking.id}

Atlas Fitness`;

        try {
          await sendWhatsAppMessage({
            to: booking.customer.phone,
            body: reminderMessage,
          });

          // Mark reminder as sent
          await supabase
            .from("class_bookings")
            .update({ reminder_sent: true })
            .eq("id", booking.id);

          remindersSent++;
        } catch (error) {
          console.error(
            `Failed to send reminder for booking ${booking.id}:`,
            error,
          );
          errors.push(`Booking ${booking.id}: ${error.message}`);
        }
      }
    }

    return NextResponse.json({
      message: `Sent ${remindersSent} reminders`,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Error in reminder service:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Get reminder status
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;
    const organizationId = searchParams.get("organizationId");

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID required" },
        { status: 400 },
      );
    }

    // Get reminder statistics
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: stats } = await supabase
      .from("class_bookings")
      .select("reminder_sent", { count: "exact" })
      .gte("created_at", today.toISOString())
      .eq("reminder_sent", true);

    const { data: pending } = await supabase
      .from("class_bookings")
      .select("*", { count: "exact" })
      .gte("created_at", today.toISOString())
      .eq("reminder_sent", false)
      .eq("status", "confirmed");

    return NextResponse.json({
      remindersSentToday: stats?.length || 0,
      pendingReminders: pending?.length || 0,
      lastRun: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error getting reminder stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
