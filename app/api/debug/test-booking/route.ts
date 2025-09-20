import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        {
          error: "Unauthorized",
          authError: authError?.message,
        },
        { status: 401 },
      );
    }

    console.log("Debug - User:", {
      id: user.id,
      email: user.email,
      metadata: user.user_metadata,
    });

    // Check if organizationId is properly set
    const organizationId = user.user_metadata?.organization_id || user.id;
    console.log("Debug - Organization ID:", organizationId);

    // Prepare test event data
    const eventData = {
      title: body.title || "Test Event",
      description: body.description || "Test description",
      start_time: body.startTime || new Date().toISOString(),
      end_time:
        body.endTime || new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      attendees: body.attendees || [],
      meeting_url: body.meetingUrl,
      status: "confirmed",
      lead_id: body.leadId || null,
      organization_id: organizationId,
      created_by: user.id,
      google_event_id: null,
    };

    console.log("Debug - Event data to insert:", eventData);

    // Try to insert the event
    const { data: newEvent, error: insertError } = await supabase
      .from("calendar_events")
      .insert(eventData)
      .select()
      .single();

    if (insertError) {
      console.error("Debug - Insert error:", insertError);
      return NextResponse.json(
        {
          error: "Failed to create event",
          details: insertError.message,
          code: insertError.code,
          hint: insertError.hint,
          eventData,
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      event: newEvent,
      debug: {
        userId: user.id,
        organizationId,
        eventData,
      },
    });
  } catch (error: any) {
    console.error("Debug - Endpoint error:", error);
    return NextResponse.json(
      {
        error: "Test booking failed",
        details: error.message,
        stack: error.stack,
      },
      { status: 500 },
    );
  }
}
