import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import {
  WebhookSecurityManager,
  AutomationInputValidator,
  WorkflowExecutor,
} from "@/app/lib/automation/server-only";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // Get organization and webhook ID from headers or query params
    const organizationId =
      request.headers.get("x-organization-id") ||
      request.nextUrl.searchParams.get("organizationId");
    const webhookId =
      request.headers.get("x-webhook-id") ||
      request.nextUrl.searchParams.get("webhookId");

    if (!organizationId || !webhookId) {
      return NextResponse.json(
        { error: "Missing organization or webhook ID" },
        { status: 400 },
      );
    }

    // Get raw body for signature verification
    const rawBody = await request.text();
    const signature = request.headers.get("x-webhook-signature");

    const supabase = createAdminClient();

    // Get webhook configuration
    const { data: webhook, error: webhookError } = await supabase
      .from("automation_webhooks")
      .select("*")
      .eq("id", webhookId)
      .eq("organization_id", organizationId)
      .single();

    if (webhookError || !webhook) {
      console.error("Webhook not found:", webhookError);
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
    }

    if (!webhook.is_active) {
      return NextResponse.json(
        { error: "Webhook is not active" },
        { status: 403 },
      );
    }

    // Check rate limiting
    const rateLimitResult = await WebhookSecurityManager.checkRateLimit(
      organizationId,
      `webhook_${webhookId}`,
      webhook.rate_limit_window_ms || 60000,
      webhook.rate_limit_max_requests || 100,
    );

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          retryAfter: rateLimitResult.resetTime,
        },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil(
              rateLimitResult.resetTime / 1000,
            ).toString(),
          },
        },
      );
    }

    // Validate webhook signature if configured
    if (webhook.secret) {
      const validationResult = await WebhookSecurityManager.validateWebhook(
        rawBody,
        signature,
        webhook.secret,
        organizationId,
        {
          algorithm: webhook.signature_algorithm || "hmac-sha256",
          headerName: webhook.signature_header || "x-webhook-signature",
        },
      );

      if (!validationResult.isValid) {
        console.error("Webhook validation failed:", validationResult.errors);

        // Log security event
        await supabase.from("automation_webhook_logs").insert({
          webhook_id: webhookId,
          organization_id: organizationId,
          status: "failed",
          error_message: validationResult.errors.join(", "),
          request_headers: Object.fromEntries(request.headers.entries()),
          response_status: 401,
        });

        return NextResponse.json(
          { error: "Invalid webhook signature" },
          { status: 401 },
        );
      }
    }

    // Parse and validate body
    let parsedBody: any;
    try {
      parsedBody = rawBody ? JSON.parse(rawBody) : {};
    } catch (error) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    // Validate and sanitize input data
    const validationResult = AutomationInputValidator.validateTriggerData(
      parsedBody,
      organizationId,
    );

    if (!validationResult.isValid) {
      console.error("Webhook data validation failed:", validationResult.errors);
      return NextResponse.json(
        {
          error: "Invalid webhook data",
          details: validationResult.errors,
        },
        { status: 400 },
      );
    }

    const sanitizedData = validationResult.sanitizedData;

    // Create webhook event record
    const { data: event, error: eventError } = await supabase
      .from("automation_webhook_events")
      .insert({
        webhook_id: webhookId,
        organization_id: organizationId,
        payload: sanitizedData,
        headers: Object.fromEntries(request.headers.entries()),
        processed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (eventError) {
      console.error("Error creating webhook event:", eventError);
    }

    // Find and execute related workflows
    const { data: workflows, error: workflowsError } = await supabase
      .from("workflows")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("trigger_type", "webhook")
      .eq("status", "active")
      .contains("trigger_config", { webhook_id: webhookId });

    if (workflowsError) {
      console.error("Error finding workflows:", workflowsError);
    }

    const executionPromises = (workflows || []).map(async (workflow) => {
      try {
        // Create execution record
        const { data: execution, error: execError } = await supabase
          .from("workflow_executions")
          .insert({
            workflow_id: workflow.id,
            organization_id: organizationId,
            status: "running",
            input_data: sanitizedData,
            triggered_by: "webhook",
            trigger_data: {
              webhook_id: webhookId,
              event_id: event?.id,
            },
          })
          .select()
          .single();

        if (execError || !execution) {
          console.error("Error creating execution:", execError);
          return null;
        }

        // Execute workflow asynchronously
        const executor = new WorkflowExecutor(workflow, execution.id);
        executor.execute(sanitizedData).catch((error) => {
          console.error("Workflow execution error:", error);
        });

        return execution.id;
      } catch (error) {
        console.error("Error executing workflow:", error);
        return null;
      }
    });

    const executionIds = await Promise.all(executionPromises);
    const successfulExecutions = executionIds.filter((id) => id !== null);

    // Update webhook stats
    await supabase
      .from("automation_webhooks")
      .update({
        total_requests: webhook.total_requests + 1,
        successful_requests: webhook.successful_requests + 1,
        last_triggered_at: new Date().toISOString(),
      })
      .eq("id", webhookId);

    // Log successful webhook
    await supabase.from("automation_webhook_logs").insert({
      webhook_id: webhookId,
      organization_id: organizationId,
      status: "success",
      request_headers: Object.fromEntries(request.headers.entries()),
      request_body: sanitizedData,
      response_status: 200,
      workflow_executions: successfulExecutions,
    });

    return NextResponse.json({
      success: true,
      event_id: event?.id,
      executions: successfulExecutions,
      message: `Webhook received and ${successfulExecutions.length} workflow(s) triggered`,
    });
  } catch (error) {
    console.error("Error in webhook handler:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
