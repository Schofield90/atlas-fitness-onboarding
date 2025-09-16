import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { google } from "googleapis";
import { v4 as uuidv4 } from "uuid";
import { getAppUrl } from "@/lib/env-config";

export async function POST(request: NextRequest) {
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

    // Get user's Google Calendar tokens
    const { data: tokenData, error: tokenError } = await supabase
      .from("google_calendar_tokens")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (tokenError || !tokenData) {
      return NextResponse.json(
        { error: "Google Calendar not connected" },
        { status: 400 },
      );
    }

    // Get calendar ID from request or use primary
    const { calendarId = "primary" } = await request.json();

    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${getAppUrl()}/api/auth/google/callback`,
    );

    oauth2Client.setCredentials({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_type: tokenData.token_type,
      expiry_date: tokenData.expiry_date,
    });

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    // Create a unique channel ID
    const channelId = uuidv4();

    // Set up webhook URL
    const webhookUrl = `${getAppUrl()}/api/webhooks/google-calendar`;

    // Calculate expiration (max 1 month from now)
    const expiration = new Date();
    expiration.setDate(expiration.getDate() + 30);

    try {
      // Set up watch on the calendar
      const watchResponse = await calendar.events.watch({
        calendarId,
        requestBody: {
          id: channelId,
          type: "web_hook",
          address: webhookUrl,
          token: user.id, // Pass user ID as token for identification
          expiration: expiration.getTime().toString(),
        },
      });

      console.log("Watch set up successfully:", watchResponse.data);

      // Store watch info in database
      const { error: watchError } = await supabase
        .from("google_calendar_watches")
        .insert({
          user_id: user.id,
          channel_id: channelId,
          resource_id: watchResponse.data.resourceId,
          resource_uri: watchResponse.data.resourceUri,
          expiration: new Date(
            Number(watchResponse.data.expiration),
          ).toISOString(),
          calendar_id: calendarId,
        });

      if (watchError) {
        console.error("Failed to store watch info:", watchError);
      }

      return NextResponse.json({
        success: true,
        channelId,
        expiration: watchResponse.data.expiration,
        resourceId: watchResponse.data.resourceId,
      });
    } catch (error: any) {
      console.error("Failed to set up calendar watch:", error);

      if (error.code === 401) {
        // Token expired, need to refresh
        return NextResponse.json(
          {
            error: "Google Calendar authentication expired. Please reconnect.",
          },
          { status: 401 },
        );
      }

      return NextResponse.json(
        {
          error: "Failed to set up calendar watch",
          details: error.message,
        },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Error setting up calendar watch:", error);
    return NextResponse.json(
      { error: "Failed to set up calendar watch" },
      { status: 500 },
    );
  }
}

// Stop watching a calendar
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

    const { channelId, resourceId } = await request.json();

    if (!channelId || !resourceId) {
      return NextResponse.json(
        { error: "Channel ID and Resource ID required" },
        { status: 400 },
      );
    }

    // Get user's Google Calendar tokens
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
    });

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    try {
      // Stop watching
      await calendar.channels.stop({
        requestBody: {
          id: channelId,
          resourceId: resourceId,
        },
      });

      // Remove from database
      await supabase
        .from("google_calendar_watches")
        .delete()
        .eq("channel_id", channelId);

      return NextResponse.json({ success: true });
    } catch (error: any) {
      console.error("Failed to stop calendar watch:", error);
      return NextResponse.json(
        { error: "Failed to stop calendar watch" },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Error stopping calendar watch:", error);
    return NextResponse.json(
      { error: "Failed to stop calendar watch" },
      { status: 500 },
    );
  }
}
