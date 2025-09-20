import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { google } from "googleapis";
import type { CalendarEvent } from "@/app/lib/types/calendar";

export async function POST(request: NextRequest) {
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
    const { data: tokenData } = await supabase
      .from("google_calendar_tokens")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!tokenData) {
      return NextResponse.json(
        { error: "Google Calendar not connected" },
        { status: 400 },
      );
    }

    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
    );

    oauth2Client.setCredentials({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_type: tokenData.token_type,
      expiry_date: tokenData.expiry_date,
    });

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    // Get sync time range (1 month back to 3 months ahead)
    const now = new Date();
    const timeMin = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1,
    ).toISOString();
    const timeMax = new Date(
      now.getFullYear(),
      now.getMonth() + 3,
      31,
    ).toISOString();

    // Step 1: Fetch all Google Calendar events
    const googleEvents = await fetchAllGoogleEvents(calendar, timeMin, timeMax);
    console.log(`Fetched ${googleEvents.length} events from Google Calendar`);

    // Step 2: Fetch all local CRM events
    const { data: localEvents } = await adminSupabase
      .from("calendar_events")
      .select("*")
      .gte("start_time", timeMin)
      .lte("start_time", timeMax)
      .eq(
        "organization_id",
        user.user_metadata?.organization_id ||
          "63589490-8f55-4157-bd3a-e141594b748e",
      );

    console.log(
      `Fetched ${localEvents?.length || 0} events from local database`,
    );

    let stats = {
      googleToLocal: 0,
      localToGoogle: 0,
      updated: 0,
      deleted: 0,
    };

    // Step 3: Sync Google events to local (handle deletions and updates)
    const googleEventIds = new Set(googleEvents.map((e) => e.id));
    const localEventsByGoogleId = new Map(
      (localEvents || [])
        .filter((e) => e.google_event_id)
        .map((e) => [e.google_event_id, e]),
    );

    // Check for deleted events in Google
    for (const [googleId, localEvent] of localEventsByGoogleId) {
      if (!googleEventIds.has(googleId)) {
        // Event was deleted in Google, delete locally
        console.log(
          `Deleting local event ${localEvent.id} (Google event ${googleId} was deleted)`,
        );

        await adminSupabase
          .from("calendar_events")
          .delete()
          .eq("id", localEvent.id);

        stats.deleted++;
      }
    }

    // Sync Google events to local
    for (const googleEvent of googleEvents) {
      const localEvent = localEventsByGoogleId.get(googleEvent.id!);

      if (googleEvent.status === "cancelled") {
        // Event was cancelled in Google
        if (localEvent) {
          await adminSupabase
            .from("calendar_events")
            .delete()
            .eq("id", localEvent.id);

          stats.deleted++;
        }
        continue;
      }

      const eventData = {
        title: googleEvent.summary || "Untitled Event",
        description: googleEvent.description || "",
        start_time: googleEvent.start?.dateTime || googleEvent.start?.date,
        end_time: googleEvent.end?.dateTime || googleEvent.end?.date,
        google_event_id: googleEvent.id,
        status: "confirmed",
        attendees:
          googleEvent.attendees?.map((a) => ({
            email: a.email!,
            name: a.displayName || a.email!,
          })) || [],
        meeting_url: googleEvent.hangoutLink || null,
      };

      if (localEvent) {
        // Update existing event if changed
        if (hasEventChanged(localEvent, eventData)) {
          await adminSupabase
            .from("calendar_events")
            .update(eventData)
            .eq("id", localEvent.id);

          stats.updated++;
        }
      } else {
        // Create new local event
        await adminSupabase.from("calendar_events").insert({
          ...eventData,
          organization_id:
            user.user_metadata?.organization_id ||
            "63589490-8f55-4157-bd3a-e141594b748e",
          created_by: user.id,
        });

        stats.googleToLocal++;
      }
    }

    // Step 4: Sync local events to Google (only events without google_event_id)
    const localEventsWithoutGoogle = (localEvents || []).filter(
      (e) => !e.google_event_id,
    );

    for (const localEvent of localEventsWithoutGoogle) {
      try {
        const googleEvent = {
          summary: localEvent.title,
          description: localEvent.description || "",
          start: {
            dateTime: localEvent.start_time,
            timeZone: "Europe/London",
          },
          end: {
            dateTime: localEvent.end_time,
            timeZone: "Europe/London",
          },
          attendees: localEvent.attendees?.map((a: any) => ({
            email: a.email,
          })),
        };

        const { data: createdEvent } = await calendar.events.insert({
          calendarId: "primary",
          requestBody: googleEvent,
        });

        // Update local event with Google ID
        await adminSupabase
          .from("calendar_events")
          .update({ google_event_id: createdEvent.id })
          .eq("id", localEvent.id);

        stats.localToGoogle++;
      } catch (error) {
        console.error("Error syncing to Google:", error);
      }
    }

    return NextResponse.json({
      success: true,
      stats,
      message: `Sync complete: ${stats.googleToLocal} from Google, ${stats.localToGoogle} to Google, ${stats.updated} updated, ${stats.deleted} deleted`,
    });
  } catch (error: any) {
    console.error("Error in bidirectional sync:", error);
    return NextResponse.json(
      {
        error: "Failed to sync calendars",
        details: error.message,
      },
      { status: 500 },
    );
  }
}

async function fetchAllGoogleEvents(
  calendar: any,
  timeMin: string,
  timeMax: string,
) {
  const events: any[] = [];
  let pageToken: string | undefined;

  do {
    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin,
      timeMax,
      maxResults: 250,
      singleEvents: true,
      orderBy: "startTime",
      pageToken,
    });

    if (response.data.items) {
      events.push(...response.data.items);
    }

    pageToken = response.data.nextPageToken;
  } while (pageToken);

  return events;
}

function hasEventChanged(localEvent: any, googleEventData: any): boolean {
  return (
    localEvent.title !== googleEventData.title ||
    localEvent.description !== googleEventData.description ||
    localEvent.start_time !== googleEventData.start_time ||
    localEvent.end_time !== googleEventData.end_time ||
    JSON.stringify(localEvent.attendees) !==
      JSON.stringify(googleEventData.attendees)
  );
}
