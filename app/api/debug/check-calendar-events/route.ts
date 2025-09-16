import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const adminSupabase = createAdminClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    console.log("Checking calendar events for user:", user.id);

    // 1. Check local calendar_events table
    const { data: localEvents, error: localError } = await adminSupabase
      .from("calendar_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);

    console.log("Local calendar events:", localEvents);

    // 2. Check user's organization membership
    const { data: membership } = await supabase
      .from("user_organizations")
      .select("organization_id")
      .eq("user_id", user.id)
      .single();

    // 3. Check events for user's organization
    const { data: orgEvents, error: orgError } = await supabase
      .from("calendar_events")
      .select("*")
      .eq(
        "organization_id",
        membership?.organization_id || user.user_metadata?.organization_id,
      )
      .order("start_time", { ascending: true });

    // 4. Check if Google Calendar is syncing
    const { data: googleTokens } = await adminSupabase
      .from("google_calendar_tokens")
      .select("*")
      .eq("user_id", user.id)
      .single();

    // 5. Get date range for debugging
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    // 6. Check events in current week
    const { data: weekEvents } = await adminSupabase
      .from("calendar_events")
      .select("*")
      .gte("start_time", startOfWeek.toISOString())
      .lte("start_time", endOfWeek.toISOString())
      .order("start_time");

    return NextResponse.json({
      debug: {
        userId: user.id,
        organizationId:
          membership?.organization_id || user.user_metadata?.organization_id,
        currentTime: new Date().toISOString(),
        weekRange: {
          start: startOfWeek.toISOString(),
          end: endOfWeek.toISOString(),
        },
      },
      counts: {
        totalLocalEvents: localEvents?.length || 0,
        userOrgEvents: orgEvents?.length || 0,
        weekEvents: weekEvents?.length || 0,
      },
      recentEvents: localEvents?.slice(0, 5).map((e) => ({
        id: e.id,
        title: e.title,
        startTime: e.start_time,
        endTime: e.end_time,
        organizationId: e.organization_id,
        createdBy: e.created_by,
        createdAt: e.created_at,
      })),
      weeklyEvents: weekEvents?.map((e) => ({
        id: e.id,
        title: e.title,
        startTime: e.start_time,
        dayOfWeek: new Date(e.start_time).toLocaleDateString("en-US", {
          weekday: "long",
        }),
        time: new Date(e.start_time).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        }),
      })),
      googleCalendarConnected: !!googleTokens,
      errors: {
        localError: localError?.message,
        orgError: orgError?.message,
      },
    });
  } catch (error: any) {
    console.error("Debug check failed:", error);
    return NextResponse.json(
      {
        error: "Debug check failed",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
