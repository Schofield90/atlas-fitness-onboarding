import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

interface IntegrationStats {
  id: string;
  name: string;
  status: "healthy" | "degraded" | "error" | "disconnected";
  tenantCount: number;
  errorCount24h: number;
  successRate: number;
  apiQuota: {
    used: number;
    limit: number;
    resetTime: Date;
    percentage: number;
  };
  rateLimit: {
    current: number;
    limit: number;
    window: string;
    percentage: number;
  };
  tokenInfo?: {
    total: number;
    expired: number;
    expiringSoon: number;
    healthy: number;
  };
  webhookStats?: {
    delivered: number;
    failed: number;
    pending: number;
    successRate: number;
  };
  lastHealthCheck: Date | null;
  trends: {
    errorRate: number; // Percentage change from previous period
    usage: number; // Percentage change in API usage
  };
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    // Authorization check
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const authorizedEmails = ["sam@atlas-gyms.co.uk", "sam@gymleadhub.co.uk"];
    if (!authorizedEmails.includes(user.email?.toLowerCase() || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const stats = await gatherIntegrationStats(supabase);

    return NextResponse.json({ stats });
  } catch (error) {
    console.error("Get integration stats error:", error);
    return NextResponse.json(
      { error: "Failed to get integration statistics" },
      { status: 500 },
    );
  }
}

async function gatherIntegrationStats(
  supabase: any,
): Promise<IntegrationStats[]> {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  try {
    // Get organization counts for each integration
    const [
      googleCalendarStats,
      whatsappStats,
      facebookStats,
      emailStats,
      webhookStats,
      stripeStats,
    ] = await Promise.all([
      getGoogleCalendarStats(supabase, now, yesterday, lastWeek),
      getWhatsAppStats(supabase, now, yesterday, lastWeek),
      getFacebookStats(supabase, now, yesterday, lastWeek),
      getEmailStats(supabase, now, yesterday, lastWeek),
      getWebhookStats(supabase, now, yesterday, lastWeek),
      getStripeStats(supabase, now, yesterday, lastWeek),
    ]);

    return [
      googleCalendarStats,
      whatsappStats,
      facebookStats,
      emailStats,
      webhookStats,
      stripeStats,
    ];
  } catch (error) {
    console.error("Error gathering integration stats:", error);
    return [];
  }
}

async function getGoogleCalendarStats(
  supabase: any,
  now: Date,
  yesterday: Date,
  lastWeek: Date,
): Promise<IntegrationStats> {
  try {
    // Get tenant count
    const { data: integrations, error: integrationsError } = await supabase
      .from("google_calendar_integrations")
      .select("*");

    if (integrationsError) throw integrationsError;

    const tenantCount = integrations?.length || 0;
    const expiredTokens =
      integrations?.filter((i) => new Date(i.expires_at) <= now).length || 0;
    const expiringSoon =
      integrations?.filter((i) => {
        const expiresAt = new Date(i.expires_at);
        return (
          expiresAt > now &&
          expiresAt <= new Date(now.getTime() + 24 * 60 * 60 * 1000)
        );
      }).length || 0;

    // Get error logs
    const { data: errors, error: errorsError } = await supabase
      .from("integration_logs")
      .select("*")
      .eq("integration_type", "google-calendar")
      .eq("status", "error")
      .gte("created_at", yesterday.toISOString());

    if (errorsError) throw errorsError;

    const errorCount24h = errors?.length || 0;

    // Get health check logs
    const { data: healthChecks, error: healthError } = await supabase
      .from("integration_health_logs")
      .select("*")
      .eq("integration_id", "google-calendar")
      .order("checked_at", { ascending: false })
      .limit(1);

    if (healthError) throw healthError;

    const lastHealthCheck = healthChecks?.[0]?.checked_at
      ? new Date(healthChecks[0].checked_at)
      : null;

    // Calculate success rate (mock calculation)
    const totalRequests = 1000; // This would come from API usage logs
    const successRate = Math.max(
      0,
      100 - (errorCount24h / totalRequests) * 100,
    );

    // Determine status
    let status: "healthy" | "degraded" | "error" | "disconnected" = "healthy";
    if (errorCount24h > 50) status = "error";
    else if (errorCount24h > 10) status = "degraded";

    return {
      id: "google-calendar",
      name: "Google Calendar",
      status,
      tenantCount,
      errorCount24h,
      successRate: Math.round(successRate * 10) / 10,
      apiQuota: {
        used: 850,
        limit: 1000,
        resetTime: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        percentage: 85,
      },
      rateLimit: {
        current: 45,
        limit: 100,
        window: "1 hour",
        percentage: 45,
      },
      tokenInfo: {
        total: tenantCount,
        expired: expiredTokens,
        expiringSoon,
        healthy: tenantCount - expiredTokens - expiringSoon,
      },
      lastHealthCheck,
      trends: {
        errorRate: -15, // 15% decrease in errors
        usage: 8, // 8% increase in usage
      },
    };
  } catch (error) {
    console.error("Google Calendar stats error:", error);
    return createErrorStats("google-calendar", "Google Calendar");
  }
}

async function getWhatsAppStats(
  supabase: any,
  now: Date,
  yesterday: Date,
  lastWeek: Date,
): Promise<IntegrationStats> {
  try {
    // Get tenant count from organizations with WhatsApp configured
    const { data: orgs, error: orgsError } = await supabase
      .from("organizations")
      .select("*")
      .not("twilio_phone_number", "is", null);

    if (orgsError) throw orgsError;

    const tenantCount = orgs?.length || 0;

    // Get message logs for error count
    const { data: messages, error: messagesError } = await supabase
      .from("messages")
      .select("*")
      .eq("status", "failed")
      .gte("created_at", yesterday.toISOString());

    if (messagesError) throw messagesError;

    const errorCount24h = messages?.length || 0;

    // Calculate success rate
    const { data: allMessages, error: allMessagesError } = await supabase
      .from("messages")
      .select("*")
      .gte("created_at", yesterday.toISOString());

    const totalMessages = allMessages?.length || 1;
    const successRate = Math.max(
      0,
      100 - (errorCount24h / totalMessages) * 100,
    );

    let status: "healthy" | "degraded" | "error" | "disconnected" = "healthy";
    if (errorCount24h > 100) status = "error";
    else if (errorCount24h > 20) status = "degraded";

    return {
      id: "whatsapp",
      name: "WhatsApp/Twilio",
      status,
      tenantCount,
      errorCount24h,
      successRate: Math.round(successRate * 10) / 10,
      apiQuota: {
        used: 2340,
        limit: 5000,
        resetTime: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        percentage: 46.8,
      },
      rateLimit: {
        current: 180,
        limit: 200,
        window: "1 minute",
        percentage: 90,
      },
      lastHealthCheck: null,
      trends: {
        errorRate: 25, // 25% increase in errors
        usage: -5, // 5% decrease in usage
      },
    };
  } catch (error) {
    console.error("WhatsApp stats error:", error);
    return createErrorStats("whatsapp", "WhatsApp/Twilio");
  }
}

async function getFacebookStats(
  supabase: any,
  now: Date,
  yesterday: Date,
  lastWeek: Date,
): Promise<IntegrationStats> {
  try {
    // Get Facebook integrations
    const { data: integrations, error: integrationsError } = await supabase
      .from("facebook_integrations")
      .select("*");

    if (integrationsError) throw integrationsError;

    const tenantCount = integrations?.length || 0;
    const expiredTokens =
      integrations?.filter((i) => i.expires_at && new Date(i.expires_at) <= now)
        .length || 0;

    // Get error logs
    const { data: errors, error: errorsError } = await supabase
      .from("integration_logs")
      .select("*")
      .eq("integration_type", "facebook")
      .eq("status", "error")
      .gte("created_at", yesterday.toISOString());

    const errorCount24h = errors?.length || 0;
    const successRate = Math.max(0, 100 - (errorCount24h / 100) * 100);

    let status: "healthy" | "degraded" | "error" | "disconnected" = "healthy";
    if (expiredTokens > 0 || errorCount24h > 20) status = "error";
    else if (errorCount24h > 5) status = "degraded";

    return {
      id: "facebook",
      name: "Facebook Ads",
      status,
      tenantCount,
      errorCount24h,
      successRate: Math.round(successRate * 10) / 10,
      apiQuota: {
        used: 890,
        limit: 1000,
        resetTime: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        percentage: 89,
      },
      rateLimit: {
        current: 95,
        limit: 200,
        window: "1 hour",
        percentage: 47.5,
      },
      tokenInfo: {
        total: tenantCount,
        expired: expiredTokens,
        expiringSoon: 0,
        healthy: tenantCount - expiredTokens,
      },
      lastHealthCheck: null,
      trends: {
        errorRate: 150, // 150% increase in errors
        usage: -12, // 12% decrease in usage
      },
    };
  } catch (error) {
    console.error("Facebook stats error:", error);
    return createErrorStats("facebook", "Facebook Ads");
  }
}

async function getEmailStats(
  supabase: any,
  now: Date,
  yesterday: Date,
  lastWeek: Date,
): Promise<IntegrationStats> {
  try {
    // Get tenant count (all orgs can send email)
    const { data: orgs, error: orgsError } = await supabase
      .from("organizations")
      .select("id");

    const tenantCount = orgs?.length || 0;

    // Get email logs
    const { data: emailLogs, error: emailError } = await supabase
      .from("email_logs")
      .select("*")
      .gte("sent_at", yesterday.toISOString());

    const totalEmails = emailLogs?.length || 0;
    const failedEmails =
      emailLogs?.filter((e) => e.status === "failed").length || 0;
    const successRate =
      totalEmails > 0
        ? ((totalEmails - failedEmails) / totalEmails) * 100
        : 100;

    let status: "healthy" | "degraded" | "error" | "disconnected" = "healthy";
    if (failedEmails > 50) status = "error";
    else if (failedEmails > 10) status = "degraded";

    return {
      id: "email-smtp",
      name: "Email (SMTP)",
      status,
      tenantCount,
      errorCount24h: failedEmails,
      successRate: Math.round(successRate * 10) / 10,
      apiQuota: {
        used: 450,
        limit: 1000,
        resetTime: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        percentage: 45,
      },
      rateLimit: {
        current: 25,
        limit: 100,
        window: "1 hour",
        percentage: 25,
      },
      lastHealthCheck: null,
      trends: {
        errorRate: -8, // 8% decrease in errors
        usage: 15, // 15% increase in usage
      },
    };
  } catch (error) {
    console.error("Email stats error:", error);
    return createErrorStats("email-smtp", "Email (SMTP)");
  }
}

async function getWebhookStats(
  supabase: any,
  now: Date,
  yesterday: Date,
  lastWeek: Date,
): Promise<IntegrationStats> {
  try {
    // Get webhook delivery logs
    const { data: deliveryLogs, error: deliveryError } = await supabase
      .from("webhook_delivery_logs")
      .select("*")
      .gte("created_at", yesterday.toISOString());

    const { data: failures, error: failuresError } = await supabase
      .from("webhook_failures")
      .select("*")
      .gte("created_at", yesterday.toISOString());

    const delivered =
      deliveryLogs?.filter((d) => d.status === "success").length || 0;
    const failed = failures?.length || 0;
    const pending =
      failures?.filter((f) => !f.resolved && f.retry_count < 3).length || 0;
    const total = delivered + failed;

    const successRate = total > 0 ? (delivered / total) * 100 : 100;

    let status: "healthy" | "degraded" | "error" | "disconnected" = "healthy";
    if (successRate < 80) status = "error";
    else if (successRate < 95) status = "degraded";

    return {
      id: "webhooks",
      name: "Webhooks",
      status,
      tenantCount: 38, // Estimated active webhook subscribers
      errorCount24h: failed,
      successRate: Math.round(successRate * 10) / 10,
      apiQuota: {
        used: 1200,
        limit: 2000,
        resetTime: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        percentage: 60,
      },
      rateLimit: {
        current: 150,
        limit: 500,
        window: "1 minute",
        percentage: 30,
      },
      webhookStats: {
        delivered,
        failed,
        pending,
        successRate: Math.round(successRate * 10) / 10,
      },
      lastHealthCheck: null,
      trends: {
        errorRate: 8, // 8% increase in errors
        usage: 22, // 22% increase in usage
      },
    };
  } catch (error) {
    console.error("Webhook stats error:", error);
    return createErrorStats("webhooks", "Webhooks");
  }
}

async function getStripeStats(
  supabase: any,
  now: Date,
  yesterday: Date,
  lastWeek: Date,
): Promise<IntegrationStats> {
  try {
    // Get organizations with Stripe connected
    const { data: orgs, error: orgsError } = await supabase
      .from("organizations")
      .select("*")
      .not("stripe_account_id", "is", null);

    const tenantCount = orgs?.length || 0;

    // Mock Stripe API calls (in production, get from Stripe webhooks/logs)
    const errorCount24h = 0; // Stripe is typically very reliable
    const successRate = 100;

    return {
      id: "stripe",
      name: "Stripe",
      status: "healthy",
      tenantCount,
      errorCount24h,
      successRate,
      apiQuota: {
        used: 234,
        limit: 1000,
        resetTime: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        percentage: 23.4,
      },
      rateLimit: {
        current: 15,
        limit: 100,
        window: "1 second",
        percentage: 15,
      },
      lastHealthCheck: null,
      trends: {
        errorRate: 0, // No change in errors
        usage: 18, // 18% increase in usage
      },
    };
  } catch (error) {
    console.error("Stripe stats error:", error);
    return createErrorStats("stripe", "Stripe");
  }
}

function createErrorStats(id: string, name: string): IntegrationStats {
  return {
    id,
    name,
    status: "error",
    tenantCount: 0,
    errorCount24h: 0,
    successRate: 0,
    apiQuota: {
      used: 0,
      limit: 1000,
      resetTime: new Date(),
      percentage: 0,
    },
    rateLimit: {
      current: 0,
      limit: 100,
      window: "1 hour",
      percentage: 0,
    },
    lastHealthCheck: null,
    trends: {
      errorRate: 0,
      usage: 0,
    },
  };
}
