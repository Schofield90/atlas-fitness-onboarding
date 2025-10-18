import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createGoogleCalendarEvent } from "@/app/lib/google-calendar";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

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

    // Use service role to bypass RLS for public booking endpoint
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get booking link details - handle duplicates by getting most recent
    const { data: bookingLinkData, error: linkError } = await supabase
      .from("booking_links")
      .select("*")
      .eq("slug", slug)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    console.log("Booking link query result:", {
      slug,
      count: bookingLinkData?.length || 0,
      error: linkError?.message,
    });

    if (linkError || !bookingLinkData || bookingLinkData.length === 0) {
      console.error("Booking link query error:", linkError);
      return NextResponse.json(
        { error: "Booking link not found or inactive" },
        { status: 404 },
      );
    }

    // Use most recent if multiple exist with same slug
    const bookingLink = bookingLinkData[0];

    // Calculate end time (default to 30 minutes)
    const startDate = new Date(start_time);
    const endDate = new Date(startDate.getTime() + 30 * 60000); // Add 30 minutes

    // Generate a confirmation token
    const confirmationToken =
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);

    // Find or create lead for this booking
    let leadId = null;

    // Check if lead exists by email
    const { data: existingLead } = await supabase
      .from("leads")
      .select("id")
      .eq("organization_id", bookingLink.organization_id)
      .eq("email", attendee_email)
      .maybeSingle();

    if (existingLead) {
      leadId = existingLead.id;
      console.log("Found existing lead:", leadId);
    } else {
      // Create new lead
      const nameParts = attendee_name.split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      const { data: newLead, error: leadError } = await supabase
        .from("leads")
        .insert({
          organization_id: bookingLink.organization_id,
          first_name: firstName,
          last_name: lastName,
          email: attendee_email,
          phone: attendee_phone || null,
          status: "new",
          source: "booking_widget",
          notes: notes || null,
        })
        .select("id")
        .single();

      if (!leadError && newLead) {
        leadId = newLead.id;
        console.log("Created new lead:", leadId);
      } else {
        console.warn("Failed to create lead:", leadError);
      }
    }

    // Create booking submission
    const submissionData = {
      booking_link_id: bookingLink.id,
      organization_id: bookingLink.organization_id,
      lead_id: leadId,
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

    // Trigger workflow for call booking
    try {
      const { workflowService } = await import("@/src/services/workflow.service");
      await workflowService.triggerEvent(
        bookingLink.organization_id,
        "call_booking.created",
        {
          booking_id: submission.id,
          lead_id: leadId,
          attendee_name,
          attendee_email,
          attendee_phone,
          start_time: startDate.toISOString(),
          end_time: endDate.toISOString(),
          notes,
        },
      );
      console.log("Workflow triggered for call booking");
    } catch (error) {
      console.error("Failed to trigger workflow:", error);
      // Don't fail the booking if workflow fails
    }

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
