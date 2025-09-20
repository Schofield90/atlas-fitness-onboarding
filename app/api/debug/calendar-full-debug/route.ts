import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

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
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // 1. Check ALL events in the database (admin view)
    const { data: allEvents, error: allEventsError } = await adminSupabase
      .from("calendar_events")
      .select("*")
      .order("created_at", { ascending: false });

    // 2. Check what the regular client can see
    const { data: userEvents, error: userEventsError } = await supabase
      .from("calendar_events")
      .select("*")
      .order("created_at", { ascending: false });

    // 3. Check user's organization membership
    const { data: membership } = await supabase
      .from("user_organizations")
      .select("*")
      .eq("user_id", user.id);

    // 4. Check RLS policies
    const { data: policies } = await adminSupabase
      .rpc("to_json", {
        query: `
          SELECT policyname, cmd, qual 
          FROM pg_policies 
          WHERE tablename = 'calendar_events'
        `,
      })
      .single();

    // 5. Test creating an event with admin client
    const testEvent = {
      organization_id: "63589490-8f55-4157-bd3a-e141594b748e",
      title: "Debug Test Event",
      description: "Created by debug endpoint",
      start_time: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      end_time: new Date(Date.now() + 90000000).toISOString(), // Tomorrow + 1 hour
      attendees: [],
      status: "confirmed",
      created_by: user.id,
    };

    const { data: createdEvent, error: createError } = await adminSupabase
      .from("calendar_events")
      .insert(testEvent)
      .select()
      .single();

    // 6. Check if the created event is visible to regular client
    let visibleToUser = false;
    if (createdEvent) {
      const { data: checkEvent } = await supabase
        .from("calendar_events")
        .select("*")
        .eq("id", createdEvent.id)
        .single();

      visibleToUser = !!checkEvent;

      // Clean up test event
      await adminSupabase
        .from("calendar_events")
        .delete()
        .eq("id", createdEvent.id);
    }

    // 7. Check the actual SQL being generated
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const endDate = new Date(today.getFullYear(), today.getMonth() + 3, 31);

    const { data: dateRangeEvents } = await supabase
      .from("calendar_events")
      .select("*")
      .gte("start_time", startDate.toISOString())
      .lte("start_time", endDate.toISOString())
      .eq("organization_id", "63589490-8f55-4157-bd3a-e141594b748e");

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        metadata: user.user_metadata,
      },
      organizationMembership: membership,
      eventCounts: {
        totalInDatabase: allEvents?.length || 0,
        visibleToUser: userEvents?.length || 0,
        inDateRange: dateRangeEvents?.length || 0,
      },
      allEventsInDb: allEvents?.map((e) => ({
        id: e.id,
        title: e.title,
        organizationId: e.organization_id,
        createdBy: e.created_by,
        startTime: e.start_time,
      })),
      userVisibleEvents: userEvents?.map((e) => ({
        id: e.id,
        title: e.title,
        organizationId: e.organization_id,
      })),
      dateRangeTest: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        events: dateRangeEvents,
      },
      testResults: {
        canCreateEvent: !createError,
        createError: createError?.message,
        eventVisibleToUser: visibleToUser,
      },
      rlsPolicies: policies,
      errors: {
        allEvents: allEventsError?.message,
        userEvents: userEventsError?.message,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Debug failed",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
