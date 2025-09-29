import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { listCalendarEvents } from "@/app/lib/google/calendar";
import { requireAuth } from "@/app/lib/api/auth-check";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // SECURITY: Use organization-scoped authentication
    const user = await requireAuth();
    const supabase = await createClient();
    const adminSupabase = createAdminClient();
    const { searchParams } = new URL(request.url);

    const start = searchParams.get("start");
    const end = searchParams.get("end");

    // SECURITY: Get Google Calendar tokens with organization validation
    const { data: tokenData, error: tokenError } = await adminSupabase
      .from("google_calendar_tokens")
      .select("*")
      .eq("user_id", user.id)
      .eq("organization_id", user.organizationId) // SECURITY: Ensure organization ownership
      .single();

    if (tokenError || !tokenData) {
      console.log("No Google Calendar connection found for organization");
      return NextResponse.json({
        events: [],
        message: "Google Calendar not connected",
      });
    }

    // SECURITY: Get sync settings with organization validation
    const { data: settings } = await supabase
      .from("calendar_sync_settings")
      .select("google_calendar_id")
      .eq("user_id", user.id)
      .eq("organization_id", user.organizationId) // SECURITY: Ensure organization ownership
      .single();

    const calendarId = settings?.google_calendar_id || "primary";

    try {
      // Fetch events from Google Calendar
      const events = await listCalendarEvents(
        tokenData,
        calendarId,
        start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // Default: 30 days ago
        end || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // Default: 90 days ahead
      );

      // Transform Google Calendar events to our format
      const transformedEvents = events.map((event: any) => ({
        id: event.id,
        title: event.summary || "Untitled Event",
        description: event.description || "",
        startTime: event.start?.dateTime || event.start?.date,
        endTime: event.end?.dateTime || event.end?.date,
        attendees:
          event.attendees?.map((a: any) => ({
            email: a.email,
            name: a.displayName || a.email,
          })) || [],
        location: event.location || "",
        status: event.status || "confirmed",
        googleEventId: event.id,
        colorId: event.colorId,
      }));

      console.log(
        `Fetched ${transformedEvents.length} events from Google Calendar`,
      );
      console.log("Date range:", {
        start:
          start ||
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        end:
          end || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      });
      console.log(
        "Sample events:",
        transformedEvents.slice(0, 3).map((e) => ({
          title: e.title,
          start: e.startTime,
          end: e.endTime,
        })),
      );

      return NextResponse.json({
        events: transformedEvents,
        total: transformedEvents.length,
      });
    } catch (error: any) {
      console.error("Error fetching Google Calendar events:", error);

      // Check if token needs refresh
      if (error.code === 401) {
        return NextResponse.json(
          {
            error: "Google Calendar authentication expired",
            needsReauth: true,
          },
          { status: 401 },
        );
      }

      return NextResponse.json(
        {
          error: "Failed to fetch events from Google Calendar",
          details: error.message,
        },
        { status: 500 },
      );
    }
  } catch (error: any) {
    console.error("Error in google-events endpoint:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch events",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
