import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

export const runtime = "nodejs";

// Get calendar settings
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get calendar settings
    const { data: settings, error } = await supabase
      .from("calendar_settings")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows returned
      console.error("Error fetching calendar settings:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Check if Google Calendar is connected
    const { data: integration } = await supabase
      .from("calendar_integrations")
      .select("id, is_active, calendar_email, last_synced_at")
      .eq("user_id", user.id)
      .eq("provider", "google")
      .single();

    // Return settings with defaults
    return NextResponse.json({
      id: settings?.id,
      workingHours: settings?.working_hours || {
        monday: { enabled: true, start: "09:00", end: "17:00" },
        tuesday: { enabled: true, start: "09:00", end: "17:00" },
        wednesday: { enabled: true, start: "09:00", end: "17:00" },
        thursday: { enabled: true, start: "09:00", end: "17:00" },
        friday: { enabled: true, start: "09:00", end: "17:00" },
        saturday: { enabled: false, start: "09:00", end: "12:00" },
        sunday: { enabled: false, start: "09:00", end: "12:00" },
      },
      slotDuration: settings?.slot_duration || 30,
      bufferTime: settings?.buffer_time || 15,
      timezone: settings?.timezone || "Europe/London",
      googleCalendarConnected: settings?.google_calendar_connected || false,
      bookingConfirmationEnabled:
        settings?.booking_confirmation_enabled ?? true,
      reminderEnabled: settings?.reminder_enabled ?? true,
      reminderTime: settings?.reminder_time || 24,
      googleCalendarIntegration: integration
        ? {
            isActive: integration.is_active,
            calendarEmail: integration.calendar_email,
            lastSyncedAt: integration.last_synced_at,
          }
        : null,
    });
  } catch (error) {
    console.error("Error getting calendar settings:", error);
    return NextResponse.json(
      {
        error: "Failed to get calendar settings",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// Update calendar settings
export async function PATCH(request: NextRequest) {
  try {
    const supabase = createClient();
    const body = await request.json();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organizationId = user.user_metadata?.organization_id || user.id;

    // Prepare update data
    const updateData: any = {
      user_id: user.id,
      organization_id: organizationId,
    };

    if (body.workingHours !== undefined)
      updateData.working_hours = body.workingHours;
    if (body.slotDuration !== undefined)
      updateData.slot_duration = body.slotDuration;
    if (body.bufferTime !== undefined) updateData.buffer_time = body.bufferTime;
    if (body.timezone !== undefined) updateData.timezone = body.timezone;
    if (body.googleCalendarConnected !== undefined)
      updateData.google_calendar_connected = body.googleCalendarConnected;
    if (body.bookingConfirmationEnabled !== undefined)
      updateData.booking_confirmation_enabled = body.bookingConfirmationEnabled;
    if (body.reminderEnabled !== undefined)
      updateData.reminder_enabled = body.reminderEnabled;
    if (body.reminderTime !== undefined)
      updateData.reminder_time = body.reminderTime;

    // Upsert settings
    const { data: settings, error } = await supabase
      .from("calendar_settings")
      .upsert(updateData)
      .select()
      .single();

    if (error) {
      console.error("Error updating calendar settings:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (error) {
    console.error("Error updating calendar settings:", error);
    return NextResponse.json(
      {
        error: "Failed to update calendar settings",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// Disconnect Google Calendar
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Delete Google Calendar integration
    const { error: deleteError } = await supabase
      .from("calendar_integrations")
      .delete()
      .eq("user_id", user.id)
      .eq("provider", "google");

    if (deleteError) {
      console.error("Error deleting calendar integration:", deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    // Update settings to reflect disconnection
    const { error: updateError } = await supabase
      .from("calendar_settings")
      .update({ google_calendar_connected: false })
      .eq("user_id", user.id);

    if (updateError) {
      console.error("Error updating calendar settings:", updateError);
    }

    return NextResponse.json({
      success: true,
      message: "Google Calendar disconnected successfully",
    });
  } catch (error) {
    console.error("Error disconnecting Google Calendar:", error);
    return NextResponse.json(
      {
        error: "Failed to disconnect Google Calendar",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
