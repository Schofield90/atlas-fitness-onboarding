import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { getCurrentUserOrganization } from "@/app/lib/organization-server";
import { WebhookSecurityManager } from "@/app/lib/automation/security/webhook-security";
import { AutomationInputValidator } from "@/app/lib/automation/security/input-validator";

export async function GET(request: NextRequest) {
  try {
    const { organizationId, error: orgError } =
      await getCurrentUserOrganization();
    if (orgError || !organizationId) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 },
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("page_size") || "25");
    const workflowId = searchParams.get("workflow_id");

    const supabase = await createClient();

    // Calculate range for pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // Build query with pagination
    let query = supabase
      .from("workflow_webhooks")
      .select(
        `
        *,
        workflows!inner(id, name, status)
      `,
        { count: "exact" },
      )
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .range(from, to);

    // Apply workflow filter if provided
    if (workflowId) {
      query = query.eq("workflow_id", workflowId);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching webhooks:", error);
      return NextResponse.json(
        { error: "Failed to fetch webhooks" },
        { status: 500 },
      );
    }

    // Remove sensitive data from response
    const sanitizedData = data?.map((webhook) => ({
      ...webhook,
      secret: undefined, // Never expose secrets
      secret_masked: webhook.secret ? "••••••••" : null,
    }));

    return NextResponse.json({
      webhooks: sanitizedData || [],
      pagination: {
        page,
        pageSize,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
      },
    });
  } catch (error) {
    console.error("Error in GET /api/automations/webhooks:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { organizationId, error: orgError } =
      await getCurrentUserOrganization();
    if (orgError || !organizationId) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 },
      );
    }

    const body = await request.json();

    // Validate input data
    const validationResult = AutomationInputValidator.validateTriggerData(
      body,
      organizationId,
    );

    if (!validationResult.isValid) {
      return NextResponse.json(
        {
          error: "Invalid webhook data",
          details: validationResult.errors,
        },
        { status: 400 },
      );
    }

    const sanitizedBody = validationResult.sanitizedData;
    const supabase = await createClient();

    // Validate workflow exists and belongs to organization
    const { data: workflow, error: workflowError } = await supabase
      .from("workflows")
      .select("id, name, status")
      .eq("id", sanitizedBody.workflow_id)
      .eq("organization_id", organizationId)
      .single();

    if (workflowError || !workflow) {
      return NextResponse.json(
        { error: "Workflow not found or access denied" },
        { status: 404 },
      );
    }

    // Validate webhook URL
    const urlValidation = WebhookSecurityManager.validateWebhookUrl(
      sanitizedBody.webhook_url || "",
    );

    if (!urlValidation.isValid) {
      return NextResponse.json(
        {
          error: "Invalid webhook URL",
          details: urlValidation.errors,
        },
        { status: 400 },
      );
    }

    // Generate secure webhook secret if not provided
    const webhookSecret =
      sanitizedBody.secret || WebhookSecurityManager.generateWebhookSecret();

    // Prepare webhook data
    const webhookData = {
      organization_id: organizationId,
      workflow_id: workflow.id,
      name: sanitizedBody.name || `Webhook for ${workflow.name}`,
      description: sanitizedBody.description || "",
      webhook_url: sanitizedBody.webhook_url,
      secret: webhookSecret,
      is_active: sanitizedBody.is_active !== false, // Default to true
      event_types: sanitizedBody.event_types || ["workflow_completed"],
      require_timestamp: sanitizedBody.require_timestamp || false,
      timestamp_tolerance: Math.max(
        30,
        Math.min(3600, sanitizedBody.timestamp_tolerance || 300),
      ),
      max_payload_size: Math.max(
        1024,
        Math.min(
          10 * 1024 * 1024,
          sanitizedBody.max_payload_size || 1024 * 1024,
        ),
      ),
      retry_config: {
        max_attempts: Math.max(
          1,
          Math.min(10, sanitizedBody.retry_config?.max_attempts || 3),
        ),
        initial_delay: Math.max(
          1000,
          Math.min(300000, sanitizedBody.retry_config?.initial_delay || 5000),
        ),
        max_delay: Math.max(
          60000,
          Math.min(3600000, sanitizedBody.retry_config?.max_delay || 300000),
        ),
        backoff_multiplier: Math.max(
          1.1,
          Math.min(5.0, sanitizedBody.retry_config?.backoff_multiplier || 2.0),
        ),
      },
    };

    const { data: webhook, error } = await supabase
      .from("workflow_webhooks")
      .insert(webhookData)
      .select(
        `
        *,
        workflows!inner(id, name, status)
      `,
      )
      .single();

    if (error) {
      console.error("Error creating webhook:", error);
      return NextResponse.json(
        { error: "Failed to create webhook" },
        { status: 500 },
      );
    }

    // Remove secret from response
    const sanitizedWebhook = {
      ...webhook,
      secret: undefined,
      secret_masked: "••••••••",
    };

    return NextResponse.json(
      {
        webhook: sanitizedWebhook,
        webhook_url: `${process.env.NEXT_PUBLIC_BASE_URL || "https://yourapp.com"}/api/automations/webhooks/${organizationId}/${webhook.id}`,
        security_notes: [
          "Store the webhook secret securely",
          "Use HMAC-SHA256 signature verification",
          "Validate timestamp to prevent replay attacks",
          "Implement proper error handling and retries",
        ],
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error in POST /api/automations/webhooks:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
