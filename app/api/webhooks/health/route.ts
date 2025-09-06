import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

export const runtime = "nodejs";

interface WebhookHealth {
  status: "healthy" | "degraded" | "unknown";
  webhook_url: string;
  verify_token_configured: boolean;
  app_secret_configured: boolean;
  last_received: {
    timestamp: string | null;
    leadgen_id: string | null;
    page_id: string | null;
    status: string | null;
  };
  recent_events: {
    last_hour: number;
    last_24_hours: number;
    last_7_days: number;
  };
  page_subscriptions: {
    status: "unknown" | "checking" | "subscribed" | "not_subscribed" | "error";
    pages?: Array<{
      page_id: string;
      page_name: string;
      is_subscribed: boolean;
    }>;
    error?: string;
  };
  database: {
    connected: boolean;
    webhook_table_exists: boolean;
    recent_errors: number;
  };
}

export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now();

    // Check if user is authenticated (optional - make this public if needed for monitoring)
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Use admin client for broader access
    const admin = createAdminClient();

    // Base health info
    const health: WebhookHealth = {
      status: "unknown",
      webhook_url: `${process.env.NEXT_PUBLIC_BASE_URL || "https://atlas-fitness-onboarding.vercel.app"}/api/webhooks/facebook-leads`,
      verify_token_configured: !!(
        process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN ||
        process.env.META_WEBHOOK_VERIFY_TOKEN
      ),
      app_secret_configured: !!(
        process.env.FACEBOOK_APP_SECRET || process.env.META_WEBHOOK_SECRET
      ),
      last_received: {
        timestamp: null,
        leadgen_id: null,
        page_id: null,
        status: null,
      },
      recent_events: {
        last_hour: 0,
        last_24_hours: 0,
        last_7_days: 0,
      },
      page_subscriptions: {
        status: "unknown",
      },
      database: {
        connected: false,
        webhook_table_exists: false,
        recent_errors: 0,
      },
    };

    // Check database connectivity and get recent webhooks
    try {
      // Get most recent webhook
      const { data: lastWebhook, error: lastError } = await admin
        .from("facebook_webhooks")
        .select(
          "webhook_id, event_type, event_data, processing_status, created_at, received_at",
        )
        .eq("event_type", "leadgen")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!lastError && lastWebhook) {
        health.database.connected = true;
        health.database.webhook_table_exists = true;

        const eventData = lastWebhook.event_data as any;
        health.last_received = {
          timestamp: lastWebhook.received_at || lastWebhook.created_at,
          leadgen_id: eventData?.leadgen_id || null,
          page_id: eventData?.page_id || null,
          status: lastWebhook.processing_status,
        };
      } else if (lastError?.code === "PGRST116") {
        // No rows found
        health.database.connected = true;
        health.database.webhook_table_exists = true;
      }

      // Count recent events
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Last hour
      const { count: hourCount } = await admin
        .from("facebook_webhooks")
        .select("*", { count: "exact", head: true })
        .eq("event_type", "leadgen")
        .gte("created_at", oneHourAgo.toISOString());

      health.recent_events.last_hour = hourCount || 0;

      // Last 24 hours
      const { count: dayCount } = await admin
        .from("facebook_webhooks")
        .select("*", { count: "exact", head: true })
        .eq("event_type", "leadgen")
        .gte("created_at", oneDayAgo.toISOString());

      health.recent_events.last_24_hours = dayCount || 0;

      // Last 7 days
      const { count: weekCount } = await admin
        .from("facebook_webhooks")
        .select("*", { count: "exact", head: true })
        .eq("event_type", "leadgen")
        .gte("created_at", sevenDaysAgo.toISOString());

      health.recent_events.last_7_days = weekCount || 0;

      // Count recent errors
      const { count: errorCount } = await admin
        .from("facebook_webhooks")
        .select("*", { count: "exact", head: true })
        .eq("event_type", "leadgen")
        .eq("processing_status", "error")
        .gte("created_at", oneDayAgo.toISOString());

      health.database.recent_errors = errorCount || 0;
    } catch (dbError) {
      console.error("Database health check error:", dbError);
      health.database.connected = false;
    }

    // Check page subscriptions if user is authenticated
    if (user) {
      try {
        health.page_subscriptions.status = "checking";

        // Get user's organization
        const { data: orgMember } = await supabase
          .from("organization_members")
          .select("organization_id")
          .eq("user_id", user.id)
          .single();

        if (orgMember) {
          // Get Facebook integration
          const { data: integration } = await supabase
            .from("facebook_integrations")
            .select("access_token")
            .eq("organization_id", orgMember.organization_id)
            .eq("is_active", true)
            .single();

          if (integration?.access_token) {
            // Get connected pages
            const { data: pages } = await supabase
              .from("facebook_pages")
              .select("facebook_page_id, page_name, access_token")
              .eq("organization_id", orgMember.organization_id)
              .eq("is_active", true);

            if (pages && pages.length > 0) {
              health.page_subscriptions.pages = [];

              for (const page of pages) {
                try {
                  // Check subscriptions for each page
                  const token = page.access_token || integration.access_token;
                  const response = await fetch(
                    `https://graph.facebook.com/v18.0/${page.facebook_page_id}/subscribed_apps?access_token=${token}`,
                  );

                  const data = await response.json();
                  const isSubscribed =
                    data.data?.some((app: any) =>
                      app.subscribed_fields?.includes("leadgen"),
                    ) || false;

                  health.page_subscriptions.pages.push({
                    page_id: page.facebook_page_id,
                    page_name: page.page_name,
                    is_subscribed: isSubscribed,
                  });
                } catch (pageError) {
                  console.error(
                    `Failed to check subscription for page ${page.facebook_page_id}:`,
                    pageError,
                  );
                }
              }

              const hasSubscribed = health.page_subscriptions.pages.some(
                (p) => p.is_subscribed,
              );
              health.page_subscriptions.status = hasSubscribed
                ? "subscribed"
                : "not_subscribed";
            } else {
              health.page_subscriptions.status = "not_subscribed";
              health.page_subscriptions.error = "No pages connected";
            }
          } else {
            health.page_subscriptions.status = "not_subscribed";
            health.page_subscriptions.error = "Facebook integration not active";
          }
        }
      } catch (subError) {
        console.error("Subscription check error:", subError);
        health.page_subscriptions.status = "error";
        health.page_subscriptions.error = (subError as Error).message;
      }
    }

    // Determine overall health status
    if (health.database.connected && health.recent_events.last_24_hours > 0) {
      health.status = "healthy";
    } else if (health.database.connected) {
      health.status = "degraded";
    } else {
      health.status = "unknown";
    }

    // Add response time
    const responseTime = Date.now() - startTime;

    return NextResponse.json({
      ...health,
      check_timestamp: new Date().toISOString(),
      response_time_ms: responseTime,
      environment: process.env.NODE_ENV || "production",
    });
  } catch (error) {
    console.error("Webhook health check error:", error);
    return NextResponse.json(
      {
        status: "error",
        error: "Failed to check webhook health",
        message: (error as Error).message,
      },
      { status: 500 },
    );
  }
}
