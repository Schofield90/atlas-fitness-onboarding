import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { format } from "date-fns";

function formatICSDate(date: Date): string {
  // Format date to YYYYMMDDTHHmmssZ
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

function generateICS(booking: any, calendar: any): string {
  const now = new Date();
  const startDate = new Date(booking.start_time);
  const endDate = new Date(booking.end_time);

  // Build the ICS content
  const icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Atlas Fitness//Booking System//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${booking.ics_uid}`,
    `DTSTAMP:${formatICSDate(now)}`,
    `DTSTART:${formatICSDate(startDate)}`,
    `DTEND:${formatICSDate(endDate)}`,
    `SUMMARY:${calendar.name}`,
    `DESCRIPTION:Your booking for ${calendar.name}${booking.staff?.name ? ` with ${booking.staff.name}` : ""}`,
    `LOCATION:${calendar.location || "TBD"}`,
    `ORGANIZER;CN=${calendar.name}:mailto:bookings@atlas-fitness.com`,
    `ATTENDEE;CN=${booking.contact_name};RSVP=TRUE:mailto:${booking.contact_email}`,
    `STATUS:${booking.status === "confirmed" ? "CONFIRMED" : "TENTATIVE"}`,
    "SEQUENCE:0",
    "BEGIN:VALARM",
    "TRIGGER:-PT1H",
    "ACTION:DISPLAY",
    "DESCRIPTION:Reminder: Your booking is in 1 hour",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return icsContent;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await createClient();

    // Fetch booking with calendar and staff details
    const { data: booking, error } = await supabase
      .from("bookings")
      .select(
        `
        *,
        calendars(*),
        staff(name, email)
      `,
      )
      .eq("id", params.id)
      .single();

    if (error || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Generate ICS content
    const icsContent = generateICS(booking, booking.calendars);

    // Return ICS file
    return new NextResponse(icsContent, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="booking-${booking.id}.ics"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Error generating ICS file:", error);
    return NextResponse.json(
      { error: "Failed to generate calendar invite" },
      { status: 500 },
    );
  }
}
