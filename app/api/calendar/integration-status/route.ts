import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          error: "Not authenticated",
        },
        { status: 401 },
      );
    }

    // Check google_calendar_tokens table
    const { data: googleToken, error: tokenError } = await supabase
      .from("google_calendar_tokens")
      .select(
        "sync_enabled, calendar_id, expiry_date, auto_create_events, created_at, updated_at",
      )
      .eq("user_id", user.id)
      .single();

    // Check if token exists and is valid
    const tokenExists = !!googleToken && !tokenError;
    const isExpired = googleToken?.expiry_date
      ? new Date(googleToken.expiry_date) < new Date()
      : false;

    // Check if there are any calendar events synced
    const { count: eventCount } = await supabase
      .from("calendar_events")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    // Test if we can actually get busy times
    let canFetchBusyTimes = false;
    let busyTimesCount = 0;

    if (tokenExists && !isExpired) {
      try {
        const { getGoogleCalendarBusyTimes } = await import(
          "@/app/lib/google-calendar"
        );
        const now = new Date();
        const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        const busyTimes = await getGoogleCalendarBusyTimes(
          user.id,
          now.toISOString(),
          nextWeek.toISOString(),
        );

        canFetchBusyTimes = true;
        busyTimesCount = busyTimes?.length || 0;
      } catch (error) {
        console.warn("Could not fetch busy times:", error);
      }
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
      },
      integration: {
        connected: tokenExists,
        expired: isExpired,
        needs_reconnect: !tokenExists || isExpired,
        sync_enabled: googleToken?.sync_enabled || false,
        calendar_id: googleToken?.calendar_id || null,
        auto_create_events: googleToken?.auto_create_events || false,
        last_updated: googleToken?.updated_at || null,
        events_synced: eventCount || 0,
        can_fetch_busy_times: canFetchBusyTimes,
        busy_times_next_week: busyTimesCount,
      },
      booking_integration_ready: tokenExists && !isExpired && canFetchBusyTimes,
    });
  } catch (error: any) {
    console.error("Error checking calendar integration status:", error);
    return NextResponse.json(
      {
        error: "Failed to check integration status",
        details: error?.message,
      },
      { status: 500 },
    );
  }
}
