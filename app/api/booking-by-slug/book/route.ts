import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createGoogleCalendarEvent } from "@/app/lib/google-calendar";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");

    if (!slug) {
      return NextResponse.json({ error: "Slug is required" }, { status: 400 });
    }

    const body = await request.json();
    const {
      appointment_type_id,
      start_time,
      staff_id,
      attendee_name,
      attendee_email,
      attendee_phone,
      notes,
      custom_fields,
      timezone,
    } = body;

    console.log("Booking request received:", {
      slug,
      attendee_name,
      start_time,
    });

    // Validate required fields
    if (!start_time || !attendee_name || !attendee_email) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: start_time, attendee_name, and attendee_email are required",
        },
        { status: 400 },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Get booking link details
    const { data: bookingLink, error: linkError } = await supabase
      .from("booking_links")
      .select("*")
      .eq("slug", slug)
      .eq("is_active", true)
      .single();

    console.log("Booking link query result:", {
      slug,
      found: !!bookingLink,
      error: linkError?.message,
    });

    if (!bookingLink) {
      return NextResponse.json(
        { error: "Booking link not found or inactive" },
        { status: 404 },
      );
    }

    // Calculate end time (default to 30 minutes)
    const startDate = new Date(start_time);
    const endDate = new Date(startDate.getTime() + 30 * 60000); // Add 30 minutes

    // Generate a confirmation token
    const confirmationToken =
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);

    // Create booking submission
    const submissionData = {
      booking_link_id: bookingLink.id,
      organization_id: bookingLink.organization_id,
      attendee_name,
      attendee_email,
      attendee_phone: attendee_phone || null,
      appointment_type_id: appointment_type_id || null,
      start_time: startDate.toISOString(),
      end_time: endDate.toISOString(),
      timezone: timezone || "UTC",
      staff_id: staff_id || null,
      notes: notes || null,
      custom_fields: custom_fields || {},
      status: "pending",
      confirmation_token: confirmationToken,
    };

    console.log("Creating booking submission:", submissionData);

    const { data: submission, error: submissionError } = await supabase
      .from("booking_link_submissions")
      .insert(submissionData)
      .select()
      .single();

    if (submissionError) {
      console.error("Error creating booking submission:", submissionError);
      return NextResponse.json(
        { error: "Failed to create booking submission" },
        { status: 500 },
      );
    }

    console.log("Booking submission created successfully:", submission.id);

    // Return success
    return NextResponse.json({
      success: true,
      message:
        "Your booking request has been received! We will contact you shortly to confirm.",
      booking: {
        id: submission.id,
            confirmation_token: confirmationToken,
            start_time: startDate.toISOString(),
            end_time: endDate.toISOString(),
            status: "pending",
          },
        });
      }

      console.log("Created lead as fallback:", lead);
    }

    // Try to create Google Calendar event if user is connected
    if (linkData.user_id) {
      try {
        const googleEvent = await createGoogleCalendarEvent(linkData.user_id, {
          summary: `Booking: ${attendee_name}`,
          description: `Email: ${attendee_email}\nPhone: ${attendee_phone || "N/A"}\nNotes: ${notes || "N/A"}`,
          start: {
            dateTime: startDate.toISOString(),
            timeZone: timezone || "Europe/London",
          },
          end: {
            dateTime: endDate.toISOString(),
            timeZone: timezone || "Europe/London",
          },
          attendees: [{ email: attendee_email }],
          reminders: {
            useDefault: false,
            overrides: [
              { method: "email", minutes: 1440 }, // 24 hours
              { method: "popup", minutes: 30 },
            ],
          },
        });
        console.log("Google Calendar event created:", googleEvent?.id);
      } catch (gcalError) {
        console.warn("Could not create Google Calendar event:", gcalError);
        // Continue anyway - booking is still successful
      }
    }

    // Return success response
    const successMessage =
      "Your booking has been confirmed! You will receive a confirmation email shortly.";

    return NextResponse.json({
      success: true,
      message: successMessage,
      booking: {
        id: calendarEvent?.id || confirmationToken,
        confirmation_token: confirmationToken,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        status: "confirmed",
      },
    });
  } catch (error: any) {
    console.error("Error processing booking:", error);
    return NextResponse.json(
      {
        error:
          "An error occurred while processing your booking. Please try again.",
        details: error?.message,
      },
      { status: 500 },
    );
  }
}
