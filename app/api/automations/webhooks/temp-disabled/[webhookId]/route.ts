import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { WebhookSecurityManager } from "@/app/lib/automation/security/webhook-security";
import { WorkflowExecutor } from "@/app/lib/automation/execution/executor";

interface WebhookParams {
  organizationId: string;
  webhookId: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<WebhookParams> },
) {
  const startTime = Date.now();
  const { organizationId, webhookId } = await params;

  try {
    // Rate limiting check
    const rateLimit = await WebhookSecurityManager.checkRateLimit(
      organizationId,
      webhookId,
      60000, // 1 minute window
      100, // 100 requests per minute
    );

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          reset_time: rateLimit.resetTime,
          remaining: rateLimit.remaining,
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": "100",
            "X-RateLimit-Remaining": rateLimit.remaining.toString(),
            "X-RateLimit-Reset": rateLimit.resetTime.toString(),
          },
        },
      );
    }

    // Get raw body for signature verification
    const rawBody = await request.text();

    // Check payload size
    if (rawBody.length > 1024 * 1024) {
      // 1MB limit
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }

    // Get signature from headers
    const signature =
      request.headers.get("x-webhook-signature") ||
      request.headers.get("x-signature") ||
      request.headers.get("signature");

    const adminSupabase = createAdminClient();

    // Get webhook configuration
    const { data: webhook, error: webhookError } = await adminSupabase
      .from("workflow_webhooks")
      .select("*")
      .eq("id", webhookId)
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .single();

    if (webhookError || !webhook) {
      console.error("Webhook not found:", {
        organizationId,
        webhookId,
        error: webhookError,
      });
      return NextResponse.json(
        { error: "Webhook not found or inactive" },
        { status: 404 },
      );
    }

    // Validate webhook security
    const validationResult = await WebhookSecurityManager.validateWebhook(
      rawBody,
      signature,
      webhook.secret,
      organizationId,
      {
        requireTimestamp: webhook.require_timestamp || false,
        tolerance: webhook.timestamp_tolerance || 300,
        maxPayloadSize: webhook.max_payload_size || 1024 * 1024,
      },
    );

    if (!validationResult.isValid) {
      console.error("Webhook validation failed:", {
        organizationId,
        webhookId,
        errors: validationResult.errors,
        payloadSize: validationResult.metadata.payloadSize,
      });

      // Log security violation
      await adminSupabase.from("webhook_security_logs").insert({
        organization_id: organizationId,
        webhook_id: webhookId,
        violation_type: "validation_failed",
        details: {
          errors: validationResult.errors,
          signature_valid: validationResult.metadata.signatureValid,
          payload_size: validationResult.metadata.payloadSize,
          source_ip:
            request.headers.get("x-forwarded-for") ||
            request.headers.get("x-real-ip") ||
            "unknown",
        },
        created_at: new Date().toISOString(),
      });

      return NextResponse.json(
        {
          error: "Webhook validation failed",
          details: validationResult.errors,
        },
        { status: 400 },
      );
    }

    // Log warnings if any
    if (validationResult.warnings.length > 0) {
      console.warn("Webhook validation warnings:", {
        organizationId,
        webhookId,
        warnings: validationResult.warnings,
      });
    }

    // Get associated workflow
    const { data: workflow, error: workflowError } = await adminSupabase
      .from("workflows")
      .select("*")
      .eq("id", webhook.workflow_id)
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .single();

    if (workflowError || !workflow) {
      console.error("Associated workflow not found or inactive:", {
        organizationId,
        webhookId,
        workflowId: webhook.workflow_id,
        error: workflowError,
      });

      return NextResponse.json(
        { error: "Associated workflow not found or inactive" },
        { status: 404 },
      );
    }

    // Create execution record
    const { data: execution, error: execError } = await adminSupabase
      .from("workflow_executions")
      .insert({
        workflow_id: workflow.id,
        organization_id: organizationId,
        status: "running",
        input_data: validationResult.payload,
        triggered_by: "webhook",
        trigger_data: {
          webhook_id: webhookId,
          source_ip:
            request.headers.get("x-forwarded-for") ||
            request.headers.get("x-real-ip") ||
            "unknown",
          user_agent: request.headers.get("user-agent") || "unknown",
          timestamp:
            validationResult.metadata.timestamp ||
            Math.floor(Date.now() / 1000),
        },
      })
      .select()
      .single();

    if (execError || !execution) {
      console.error("Failed to create execution:", execError);
      return NextResponse.json(
        { error: "Failed to create workflow execution" },
        { status: 500 },
      );
    }

    // Update webhook statistics
    await adminSupabase
      .from("workflow_webhooks")
      .update({
        total_requests: (webhook.total_requests || 0) + 1,
        last_triggered_at: new Date().toISOString(),
      })
      .eq("id", webhookId);

    // Execute workflow asynchronously
    const executor = new WorkflowExecutor(workflow, execution.id);
    executor
      .execute(validationResult.payload)
      .then(async (result) => {
        const processingTime = Date.now() - startTime;

        // Update execution with results
        await adminSupabase
          .from("workflow_executions")
          .update({
            status: result.success ? "completed" : "failed",
            completed_at: new Date().toISOString(),
            output_data: result.output || {},
            error_message: result.error,
            execution_steps: result.steps || [],
            processing_time_ms: processingTime,
          })
          .eq("id", execution.id);

        // Update workflow stats
        await adminSupabase
          .from("workflows")
          .update({
            total_executions: (workflow.total_executions || 0) + 1,
            successful_executions: result.success
              ? (workflow.successful_executions || 0) + 1
              : workflow.successful_executions,
            failed_executions: !result.success
              ? (workflow.failed_executions || 0) + 1
              : workflow.failed_executions,
            last_run_at: new Date().toISOString(),
            avg_execution_time_ms: Math.round(
              ((workflow.avg_execution_time_ms || 0) *
                (workflow.total_executions || 0) +
                processingTime) /
                ((workflow.total_executions || 0) + 1),
            ),
          })
          .eq("id", workflow.id);

        // Update webhook stats
        await adminSupabase
          .from("workflow_webhooks")
          .update({
            successful_executions: result.success
              ? (webhook.successful_executions || 0) + 1
              : webhook.successful_executions,
            failed_executions: !result.success
              ? (webhook.failed_executions || 0) + 1
              : webhook.failed_executions,
            avg_processing_time_ms: Math.round(
              ((webhook.avg_processing_time_ms || 0) *
                (webhook.total_requests || 0) +
                processingTime) /
                ((webhook.total_requests || 0) + 1),
            ),
          })
          .eq("id", webhookId);

        console.log("Webhook execution completed:", {
          organizationId,
          webhookId,
          executionId: execution.id,
          success: result.success,
          processingTime,
        });
      })
      .catch(async (error) => {
        const processingTime = Date.now() - startTime;

        console.error("Webhook execution error:", {
          organizationId,
          webhookId,
          executionId: execution.id,
          error: error.message,
        });

        // Update execution with error
        await adminSupabase
          .from("workflow_executions")
          .update({
            status: "failed",
            completed_at: new Date().toISOString(),
            error_message: error.message || "Unknown execution error",
            processing_time_ms: processingTime,
          })
          .eq("id", execution.id);

        // Update failure stats
        await adminSupabase
          .from("workflows")
          .update({
            total_executions: (workflow.total_executions || 0) + 1,
            failed_executions: (workflow.failed_executions || 0) + 1,
            last_run_at: new Date().toISOString(),
          })
          .eq("id", workflow.id);

        await adminSupabase
          .from("workflow_webhooks")
          .update({
            failed_executions: (webhook.failed_executions || 0) + 1,
          })
          .eq("id", webhookId);
      });

    // Return immediate response
    return NextResponse.json(
      {
        success: true,
        execution_id: execution.id,
        message: "Webhook received and workflow execution started",
        processing_time_ms: Date.now() - startTime,
      },
      {
        status: 200,
        headers: {
          "X-Execution-ID": execution.id,
          "X-Processing-Time": (Date.now() - startTime).toString(),
        },
      },
    );
  } catch (error: any) {
    console.error("Webhook processing error:", {
      organizationId,
      webhookId,
      error: error.message,
      stack: error.stack,
    });

    // Log error for monitoring
    try {
      const adminSupabase = createAdminClient();
      await adminSupabase.from("webhook_security_logs").insert({
        organization_id: organizationId,
        webhook_id: webhookId,
        violation_type: "processing_error",
        details: {
          error: error.message,
          source_ip:
            request.headers.get("x-forwarded-for") ||
            request.headers.get("x-real-ip") ||
            "unknown",
        },
        created_at: new Date().toISOString(),
      });
    } catch (logError) {
      console.error("Failed to log webhook error:", logError);
    }

    return NextResponse.json(
      {
        error: "Internal webhook processing error",
        execution_time_ms: Date.now() - startTime,
      },
      { status: 500 },
    );
  }
}

// Handle other HTTP methods
export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function PUT() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
