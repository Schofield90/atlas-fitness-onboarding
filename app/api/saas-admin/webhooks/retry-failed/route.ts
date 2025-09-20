import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

interface WebhookRetryResult {
  totalFailed: number;
  retried: number;
  successful: number;
  stillFailing: number;
  errors: string[];
}

interface FailedWebhook {
  id: string;
  endpoint: string;
  payload: any;
  headers: Record<string, string>;
  tenant_id: string;
  tenant_name: string;
  failure_reason: string;
  created_at: string;
  retry_count: number;
  last_attempt: string;
}

export async function POST(request: NextRequest) {
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

    const { webhookType, maxRetries = 3 } = await request.json();

    const result = await retryFailedWebhooks(supabase, webhookType, maxRetries);

    // Log the retry operation
    await supabase.from("webhook_retry_logs").insert({
      webhook_type: webhookType || "all",
      result: result,
      retried_by: user.id,
      retried_at: new Date().toISOString(),
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Webhook retry error:", error);
    return NextResponse.json(
      { error: "Webhook retry failed" },
      { status: 500 },
    );
  }
}

async function retryFailedWebhooks(
  supabase: any,
  webhookType?: string,
  maxRetries: number = 3,
): Promise<WebhookRetryResult> {
  const errors: string[] = [];
  let retried = 0;
  let successful = 0;
  let stillFailing = 0;

  try {
    // Get failed webhooks that haven't exceeded max retries
    let query = supabase
      .from("webhook_failures")
      .select(
        `
        *,
        organizations!inner(name)
      `,
      )
      .lt("retry_count", maxRetries)
      .eq("resolved", false);

    if (webhookType) {
      query = query.eq("webhook_type", webhookType);
    }

    const { data: failedWebhooks, error } = await query.order("created_at", {
      ascending: true,
    });

    if (error) throw error;

    const totalFailed = failedWebhooks?.length || 0;

    for (const webhook of failedWebhooks || []) {
      try {
        retried++;

        // Attempt to resend the webhook
        const success = await attemptWebhookDelivery(webhook);

        if (success) {
          successful++;

          // Mark as resolved
          await supabase
            .from("webhook_failures")
            .update({
              resolved: true,
              resolved_at: new Date().toISOString(),
              retry_count: webhook.retry_count + 1,
            })
            .eq("id", webhook.id);

          // Log successful retry
          await supabase.from("webhook_delivery_logs").insert({
            webhook_id: webhook.id,
            tenant_id: webhook.tenant_id,
            endpoint: webhook.endpoint,
            status: "success",
            response_code: 200,
            message: "Retry successful",
            created_at: new Date().toISOString(),
          });
        } else {
          stillFailing++;

          // Update retry count
          await supabase
            .from("webhook_failures")
            .update({
              retry_count: webhook.retry_count + 1,
              last_attempt: new Date().toISOString(),
            })
            .eq("id", webhook.id);
        }
      } catch (retryError) {
        stillFailing++;
        const errorMessage =
          retryError instanceof Error ? retryError.message : "Unknown error";
        errors.push(`Webhook ${webhook.id}: ${errorMessage}`);

        // Update retry count and log error
        await supabase
          .from("webhook_failures")
          .update({
            retry_count: webhook.retry_count + 1,
            last_attempt: new Date().toISOString(),
            failure_reason: errorMessage,
          })
          .eq("id", webhook.id);

        // Log failed retry
        await supabase.from("webhook_delivery_logs").insert({
          webhook_id: webhook.id,
          tenant_id: webhook.tenant_id,
          endpoint: webhook.endpoint,
          status: "error",
          response_code: 0,
          message: errorMessage,
          created_at: new Date().toISOString(),
        });
      }

      // Add small delay between retries to avoid overwhelming endpoints
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return {
      totalFailed,
      retried,
      successful,
      stillFailing,
      errors,
    };
  } catch (error) {
    return {
      totalFailed: 0,
      retried: 0,
      successful: 0,
      stillFailing: 0,
      errors: [error instanceof Error ? error.message : "Unknown error"],
    };
  }
}

async function attemptWebhookDelivery(
  webhook: FailedWebhook,
): Promise<boolean> {
  try {
    const response = await fetch(webhook.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Atlas-Fitness-Webhook/1.0",
        ...webhook.headers,
      },
      body: JSON.stringify(webhook.payload),
      // Add timeout to prevent hanging
      signal: AbortSignal.timeout(30000), // 30 seconds
    });

    // Consider 2xx status codes as successful
    return response.ok;
  } catch (error) {
    console.error(`Webhook delivery failed for ${webhook.endpoint}:`, error);
    return false;
  }
}

// Get webhook failure statistics
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const authorizedEmails = ["sam@atlas-gyms.co.uk", "sam@gymleadhub.co.uk"];
    if (!authorizedEmails.includes(user.email?.toLowerCase() || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get("timeRange") || "24h";

    // Calculate time filter
    const now = new Date();
    let timeFilter = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago

    switch (timeRange) {
      case "7d":
        timeFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        timeFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    // Get webhook statistics
    const [failuresResult, deliveriesResult, retryLogsResult] =
      await Promise.all([
        // Get webhook failures
        supabase
          .from("webhook_failures")
          .select(
            `
          *,
          organizations!inner(name)
        `,
          )
          .gte("created_at", timeFilter.toISOString())
          .order("created_at", { ascending: false }),

        // Get successful deliveries
        supabase
          .from("webhook_delivery_logs")
          .select("*")
          .gte("created_at", timeFilter.toISOString())
          .eq("status", "success"),

        // Get retry logs
        supabase
          .from("webhook_retry_logs")
          .select("*")
          .gte("retried_at", timeFilter.toISOString())
          .order("retried_at", { ascending: false }),
      ]);

    if (failuresResult.error) throw failuresResult.error;
    if (deliveriesResult.error) throw deliveriesResult.error;
    if (retryLogsResult.error) throw retryLogsResult.error;

    // Calculate statistics
    const failures = failuresResult.data || [];
    const deliveries = deliveriesResult.data || [];
    const retryLogs = retryLogsResult.data || [];

    const totalAttempts = failures.length + deliveries.length;
    const successRate =
      totalAttempts > 0 ? (deliveries.length / totalAttempts) * 100 : 100;

    // Group failures by type
    const failuresByType = failures.reduce(
      (acc: Record<string, number>, failure) => {
        acc[failure.webhook_type] = (acc[failure.webhook_type] || 0) + 1;
        return acc;
      },
      {},
    );

    // Group failures by tenant
    const failuresByTenant = failures.reduce(
      (acc: Record<string, any>, failure) => {
        const tenantName = failure.organizations.name;
        if (!acc[tenantName]) {
          acc[tenantName] = {
            name: tenantName,
            id: failure.tenant_id,
            count: 0,
          };
        }
        acc[tenantName].count++;
        return acc;
      },
      {},
    );

    return NextResponse.json({
      statistics: {
        totalFailures: failures.length,
        totalDeliveries: deliveries.length,
        successRate: Math.round(successRate * 100) / 100,
        pendingRetries: failures.filter((f) => !f.resolved && f.retry_count < 3)
          .length,
      },
      failuresByType,
      failuresByTenant: Object.values(failuresByTenant),
      recentFailures: failures.slice(0, 20),
      retryHistory: retryLogs,
    });
  } catch (error) {
    console.error("Get webhook stats error:", error);
    return NextResponse.json(
      { error: "Failed to get webhook statistics" },
      { status: 500 },
    );
  }
}
