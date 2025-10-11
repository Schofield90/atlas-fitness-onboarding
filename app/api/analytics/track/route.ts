import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "edge"; // Use edge runtime for low latency

// Bot detection patterns
const botPatterns = [
  /bot/i,
  /crawler/i,
  /spider/i,
  /scraper/i,
  /facebookexternalhit/i,
  /WhatsApp/i,
  /Slack/i,
  /GoogleBot/i,
  /Bingbot/i,
  /YandexBot/i,
  /DuckDuckBot/i,
];

function isBot(userAgent: string): boolean {
  return botPatterns.some((pattern) => pattern.test(userAgent));
}

/**
 * POST /api/analytics/track
 * Ingestion endpoint for analytics events from landing pages
 *
 * This endpoint is PUBLIC - no authentication required
 * Called by the client-side tracking script (analytics-tracker.js)
 */
export async function POST(request: NextRequest) {
  try {
    const userAgent = request.headers.get("user-agent") || "";

    // Filter out bots
    if (isBot(userAgent)) {
      return NextResponse.json({ status: "ignored" });
    }

    const { events } = await request.json();

    if (!events || !Array.isArray(events) || events.length === 0) {
      return NextResponse.json({ error: "No events provided" }, { status: 400 });
    }

    const supabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Process events by type
    const sessionEvents = events.filter((e: any) => e.eventType === "session_start");
    const interactionEvents = events.filter((e: any) =>
      ["click", "scroll", "form_field_change", "form_submit", "rage_click", "error", "pageview"].includes(
        e.eventType
      )
    );
    const conversionEvents = events.filter((e: any) => e.eventType === "conversion");
    const sessionEndEvents = events.filter((e: any) => e.eventType === "session_end");

    // 1. Create or update sessions
    for (const event of sessionEvents) {
      const { session, pageId, sessionId, timestamp } = event;

      await supabase.from("analytics_sessions").upsert(
        {
          session_id: sessionId,
          page_id: pageId,
          visitor_id: session.visitorId,
          started_at: timestamp,
          user_agent: session.userAgent,
          device_type: session.deviceType,
          screen_width: session.screenWidth,
          screen_height: session.screenHeight,
          timezone: session.timezone,
          referrer: session.referrer,
          utm_source: session.utm_source,
          utm_medium: session.utm_medium,
          utm_campaign: session.utm_campaign,
          utm_term: session.utm_term,
          utm_content: session.utm_content,
        },
        {
          onConflict: "session_id",
          ignoreDuplicates: false,
        }
      );
    }

    // 2. Insert interaction events (resolve session ID to UUID first)
    if (interactionEvents.length > 0) {
      // Get session UUIDs for all events
      const sessionIds = [...new Set(interactionEvents.map((e: any) => e.sessionId))];

      const { data: sessions } = await supabase
        .from("analytics_sessions")
        .select("id, session_id")
        .in("session_id", sessionIds);

      const sessionIdMap = new Map(sessions?.map((s: any) => [s.session_id, s.id]) || []);

      const eventRows = interactionEvents
        .map((event: any) => {
          const sessionUuid = sessionIdMap.get(event.sessionId);
          if (!sessionUuid) return null;

          return {
            session_id: sessionUuid,
            page_id: event.pageId,
            event_type: event.eventType,
            event_name: event.eventType,
            element_selector: event.elementSelector || null,
            element_text: event.elementText || null,
            element_id: event.elementId || null,
            element_classes: event.elementClasses || [],
            x_position: event.xPosition || null,
            y_position: event.yPosition || null,
            scroll_position: event.scrollPosition || null,
            scroll_percentage: event.scrollPercentage || null,
            form_id: event.formId || null,
            field_name: event.fieldName || null,
            timestamp: event.timestamp,
            time_on_page: event.timeOnPage,
            metadata: {
              errorMessage: event.errorMessage,
              errorSource: event.errorSource,
              errorStack: event.errorStack,
              url: event.url,
              title: event.title,
            },
          };
        })
        .filter(Boolean);

      if (eventRows.length > 0) {
        const { error: eventsError } = await supabase.from("analytics_events").insert(eventRows);

        if (eventsError) {
          console.error("[Analytics] Failed to insert events:", eventsError);
        }
      }
    }

    // 3. Update session with engagement metrics on session end
    for (const event of sessionEndEvents) {
      const { sessionId, duration, scrollDepth, clicks, rageClicks } = event;

      await supabase
        .from("analytics_sessions")
        .update({
          ended_at: event.timestamp,
          duration: duration,
          scroll_depth: scrollDepth,
          clicks: clicks,
          rage_clicks: rageClicks,
          updated_at: new Date().toISOString(),
        })
        .eq("session_id", sessionId);
    }

    // 4. Track conversions
    for (const event of conversionEvents) {
      await supabase
        .from("analytics_sessions")
        .update({
          converted: true,
          conversion_type: event.conversionType,
          conversion_value: event.conversionValue || 0,
          updated_at: new Date().toISOString(),
        })
        .eq("session_id", event.sessionId);
    }

    // 5. Aggregate heatmap data (simplified version - run full aggregation async)
    if (interactionEvents.some((e: any) => e.eventType === "click" && e.xPosition && e.yPosition)) {
      await aggregateHeatmapData(supabase, interactionEvents);
    }

    return NextResponse.json({
      success: true,
      processed: events.length,
    });
  } catch (error: any) {
    console.error("[Analytics] Track error:", error);
    return NextResponse.json({ error: "Failed to track events" }, { status: 500 });
  }
}

/**
 * Helper: Aggregate heatmap data from click events
 * Creates/updates daily heatmap records
 */
async function aggregateHeatmapData(supabase: any, events: any[]) {
  const clickEvents = events.filter(
    (e: any) => e.eventType === "click" && e.xPosition && e.yPosition
  );

  if (clickEvents.length === 0) return;

  // Group by page and date
  const groupedData = new Map<string, any>();

  for (const event of clickEvents) {
    const date = new Date(event.timestamp).toISOString().split("T")[0];
    const key = `${event.pageId}_${date}`;

    if (!groupedData.has(key)) {
      groupedData.set(key, {
        pageId: event.pageId,
        date: date,
        clickPoints: [],
      });
    }

    groupedData.get(key).clickPoints.push({
      x: event.xPosition,
      y: event.yPosition,
      element: event.elementSelector,
    });
  }

  // Update heatmap records
  for (const [, data] of groupedData.entries()) {
    // Fetch existing heatmap
    const { data: existing } = await supabase
      .from("analytics_heatmaps")
      .select("data_points, total_interactions")
      .eq("page_id", data.pageId)
      .eq("date", data.date)
      .eq("heatmap_type", "click")
      .eq("viewport_width", 1920)
      .eq("device_type", "desktop")
      .maybeSingle();

    let dataPoints = existing?.data_points || [];
    let totalInteractions = existing?.total_interactions || 0;

    // Add new click points
    for (const point of data.clickPoints) {
      dataPoints.push({
        x: point.x,
        y: point.y,
        weight: 1,
        count: 1,
      });
      totalInteractions++;
    }

    // Upsert heatmap data
    await supabase.from("analytics_heatmaps").upsert(
      {
        page_id: data.pageId,
        date: data.date,
        heatmap_type: "click",
        viewport_width: 1920,
        viewport_height: 1080,
        device_type: "desktop",
        data_points: dataPoints,
        total_interactions: totalInteractions,
      },
      {
        onConflict: "page_id,date,heatmap_type,viewport_width,device_type",
      }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "Analytics endpoint is working. Use POST to track events.",
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
