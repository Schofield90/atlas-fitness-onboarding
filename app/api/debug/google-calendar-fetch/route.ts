import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { listCalendarEvents } from "@/app/lib/google/calendar";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get Google Calendar tokens
    const { data: tokenData, error: tokenError } = await adminSupabase
      .from("google_calendar_tokens")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (tokenError || !tokenData) {
      return NextResponse.json({
        error: "No Google Calendar connection found",
        tokenError,
      });
    }

    // Define date range
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1); // 1 month ago
    const endDate = new Date(now.getFullYear(), now.getMonth() + 3, 31); // 3 months ahead

    console.log("Debug - Date range:", {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      startFormatted: startDate.toLocaleDateString(),
      endFormatted: endDate.toLocaleDateString(),
    });

    // Fetch events directly
    try {
      const events = await listCalendarEvents(
        tokenData,
        "primary",
        startDate.toISOString(),
        endDate.toISOString(),
      );

      // Group events by month
      const eventsByMonth: Record<string, any[]> = {};
      events.forEach((event: any) => {
        const eventDate = new Date(event.start?.dateTime || event.start?.date);
        const monthKey = `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, "0")}`;
        if (!eventsByMonth[monthKey]) {
          eventsByMonth[monthKey] = [];
        }
        eventsByMonth[monthKey].push({
          id: event.id,
          title: event.summary,
          start: event.start?.dateTime || event.start?.date,
          end: event.end?.dateTime || event.end?.date,
          date: eventDate.toLocaleDateString(),
        });
      });

      return NextResponse.json({
        success: true,
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          startFormatted: startDate.toLocaleDateString(),
          endFormatted: endDate.toLocaleDateString(),
        },
        totalEvents: events.length,
        eventsByMonth,
        sampleEvents: events.slice(0, 5).map((e: any) => ({
          title: e.summary,
          start: e.start?.dateTime || e.start?.date,
          end: e.end?.dateTime || e.end?.date,
        })),
        rawApiResponse: {
          timeMin: startDate.toISOString(),
          timeMax: endDate.toISOString(),
          eventCount: events.length,
        },
      });
    } catch (apiError: any) {
      return NextResponse.json(
        {
          error: "Google Calendar API error",
          details: apiError.message,
          code: apiError.code,
          dateRange: {
            start: startDate.toISOString(),
            end: endDate.toISOString(),
          },
        },
        { status: 500 },
      );
    }
  } catch (error: any) {
    console.error("Debug endpoint error:", error);
    return NextResponse.json(
      {
        error: "Debug endpoint failed",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
