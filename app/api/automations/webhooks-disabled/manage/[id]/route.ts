import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { getCurrentUserOrganization } from "@/app/lib/organization-server";
import { WebhookSecurityManager } from "@/app/lib/automation/security/webhook-security";
import { AutomationInputValidator } from "@/app/lib/automation/security/input-validator";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { organizationId, error: orgError } =
      await getCurrentUserOrganization();

    if (orgError || !organizationId) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 },
      );
    }

    const supabase = await createClient();

    const { data: webhook, error } = await supabase
      .from("workflow_webhooks")
      .select(
        `
        *,
        workflows!inner(id, name, status, description)
      `,
      )
      .eq("id", id)
      .eq("organization_id", organizationId)
      .single();

    if (error || !webhook) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
    }

    // Remove secret from response
    const sanitizedWebhook = {
      ...webhook,
      secret: undefined,
      secret_masked: webhook.secret ? "••••••••" : null,
      webhook_endpoint: `${process.env.NEXT_PUBLIC_BASE_URL || "https://yourapp.com"}/api/automations/webhooks/${organizationId}/${webhook.id}`,
    };

    return NextResponse.json({ webhook: sanitizedWebhook });
  } catch (error) {
    console.error("Error in GET /api/automations/webhooks/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
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

    // Check webhook exists and belongs to organization
    const { data: existingWebhook, error: webhookError } = await supabase
      .from("workflow_webhooks")
      .select("*")
      .eq("id", id)
      .eq("organization_id", organizationId)
      .single();

    if (webhookError || !existingWebhook) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
    }

    // Validate webhook URL if provided
    if (sanitizedBody.webhook_url) {
      const urlValidation = WebhookSecurityManager.validateWebhookUrl(
        sanitizedBody.webhook_url,
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
    }

    // Validate workflow if changing
    if (
      sanitizedBody.workflow_id &&
      sanitizedBody.workflow_id !== existingWebhook.workflow_id
    ) {
      const { data: workflow, error: workflowError } = await supabase
        .from("workflows")
        .select("id")
        .eq("id", sanitizedBody.workflow_id)
        .eq("organization_id", organizationId)
        .single();

      if (workflowError || !workflow) {
        return NextResponse.json(
          { error: "Workflow not found or access denied" },
          { status: 404 },
        );
      }
    }

    // Prepare update data (only include provided fields)
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (sanitizedBody.name !== undefined) {
      updateData.name = sanitizedBody.name;
    }
    if (sanitizedBody.description !== undefined) {
      updateData.description = sanitizedBody.description;
    }
    if (sanitizedBody.webhook_url !== undefined) {
      updateData.webhook_url = sanitizedBody.webhook_url;
    }
    if (sanitizedBody.is_active !== undefined) {
      updateData.is_active = Boolean(sanitizedBody.is_active);
    }
    if (sanitizedBody.event_types !== undefined) {
      updateData.event_types = Array.isArray(sanitizedBody.event_types)
        ? sanitizedBody.event_types
        : ["workflow_completed"];
    }
    if (sanitizedBody.require_timestamp !== undefined) {
      updateData.require_timestamp = Boolean(sanitizedBody.require_timestamp);
    }
    if (sanitizedBody.timestamp_tolerance !== undefined) {
      updateData.timestamp_tolerance = Math.max(
        30,
        Math.min(3600, sanitizedBody.timestamp_tolerance),
      );
    }
    if (sanitizedBody.max_payload_size !== undefined) {
      updateData.max_payload_size = Math.max(
        1024,
        Math.min(10 * 1024 * 1024, sanitizedBody.max_payload_size),
      );
    }
    if (sanitizedBody.retry_config !== undefined) {
      updateData.retry_config = {
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
      };
    }
    if (sanitizedBody.workflow_id !== undefined) {
      updateData.workflow_id = sanitizedBody.workflow_id;
    }

    const { data: updatedWebhook, error } = await supabase
      .from("workflow_webhooks")
      .update(updateData)
      .eq("id", id)
      .eq("organization_id", organizationId)
      .select(
        `
        *,
        workflows!inner(id, name, status, description)
      `,
      )
      .single();

    if (error || !updatedWebhook) {
      console.error("Error updating webhook:", error);
      return NextResponse.json(
        { error: "Failed to update webhook" },
        { status: 500 },
      );
    }

    // Remove secret from response
    const sanitizedWebhook = {
      ...updatedWebhook,
      secret: undefined,
      secret_masked: updatedWebhook.secret ? "••••••••" : null,
    };

    return NextResponse.json({ webhook: sanitizedWebhook });
  } catch (error) {
    console.error("Error in PUT /api/automations/webhooks/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { organizationId, error: orgError } =
      await getCurrentUserOrganization();

    if (orgError || !organizationId) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 },
      );
    }

    const supabase = await createClient();

    // Soft delete by setting is_active to false and archiving
    const { error } = await supabase
      .from("workflow_webhooks")
      .update({
        is_active: false,
        archived_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("organization_id", organizationId);

    if (error) {
      console.error("Error deleting webhook:", error);
      return NextResponse.json(
        { error: "Failed to delete webhook" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Webhook has been deactivated and archived",
    });
  } catch (error) {
    console.error("Error in DELETE /api/automations/webhooks/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Regenerate webhook secret
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { organizationId, error: orgError } =
      await getCurrentUserOrganization();

    if (orgError || !organizationId) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 },
      );
    }

    const body = await request.json();

    // Only allow secret regeneration for now
    if (body.action !== "regenerate_secret") {
      return NextResponse.json(
        { error: "Only 'regenerate_secret' action is supported" },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    // Check webhook exists and belongs to organization
    const { data: existingWebhook, error: webhookError } = await supabase
      .from("workflow_webhooks")
      .select("id")
      .eq("id", id)
      .eq("organization_id", organizationId)
      .single();

    if (webhookError || !existingWebhook) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
    }

    // Generate new secret
    const newSecret = WebhookSecurityManager.generateWebhookSecret();

    const { data: updatedWebhook, error } = await supabase
      .from("workflow_webhooks")
      .update({
        secret: newSecret,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("organization_id", organizationId)
      .select("id, name")
      .single();

    if (error || !updatedWebhook) {
      console.error("Error regenerating webhook secret:", error);
      return NextResponse.json(
        { error: "Failed to regenerate secret" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Webhook secret has been regenerated",
      new_secret: newSecret,
      warning: "Store this secret securely. It will not be shown again.",
    });
  } catch (error) {
    console.error("Error in PATCH /api/automations/webhooks/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
