import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { getCurrentUserOrganization } from "@/app/lib/organization-server";
import {
  WebhookSecurityManager,
  AutomationInputValidator,
} from "@/app/lib/automation/server-only";

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

    const { data, error } = await supabase
      .from("automation_webhooks")
      .select("*")
      .eq("id", id)
      .eq("organization_id", organizationId)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
    }

    return NextResponse.json({ webhook: data });
  } catch (error) {
    console.error("Error in GET /api/automations/webhooks/manage/[id]:", error);
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
    const supabase = await createClient();

    // Validate update data
    const validationResult = AutomationInputValidator.validateWebhookConfig(
      body,
      organizationId,
    );

    if (!validationResult.isValid) {
      return NextResponse.json(
        {
          error: "Invalid webhook configuration",
          details: validationResult.errors,
        },
        { status: 400 },
      );
    }

    const sanitizedData = validationResult.sanitizedData;

    // Update webhook
    const { data, error } = await supabase
      .from("automation_webhooks")
      .update({
        name: sanitizedData.name,
        description: sanitizedData.description,
        is_active: sanitizedData.is_active,
        allowed_ips: sanitizedData.allowed_ips,
        allowed_headers: sanitizedData.allowed_headers,
        rate_limit_window_ms: sanitizedData.rate_limit_window_ms,
        rate_limit_max_requests: sanitizedData.rate_limit_max_requests,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("organization_id", organizationId)
      .select()
      .single();

    if (error || !data) {
      console.error("Error updating webhook:", error);
      return NextResponse.json(
        { error: "Failed to update webhook" },
        { status: 500 },
      );
    }

    return NextResponse.json({ webhook: data });
  } catch (error) {
    console.error("Error in PUT /api/automations/webhooks/manage/[id]:", error);
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

    // Check if webhook exists
    const { data: webhook, error: webhookError } = await supabase
      .from("automation_webhooks")
      .select("id")
      .eq("id", id)
      .eq("organization_id", organizationId)
      .single();

    if (webhookError || !webhook) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
    }

    // Delete webhook
    const { error } = await supabase
      .from("automation_webhooks")
      .delete()
      .eq("id", id)
      .eq("organization_id", organizationId);

    if (error) {
      console.error("Error deleting webhook:", error);
      return NextResponse.json(
        { error: "Failed to delete webhook" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(
      "Error in DELETE /api/automations/webhooks/manage/[id]:",
      error,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

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

    // Handle secret regeneration
    if (body.action === "regenerate_secret") {
      const newSecret = WebhookSecurityManager.generateWebhookSecret();
      const supabase = await createClient();

      const { data, error } = await supabase
        .from("automation_webhooks")
        .update({
          secret: newSecret,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("organization_id", organizationId)
        .select()
        .single();

      if (error || !data) {
        console.error("Error regenerating webhook secret:", error);
        return NextResponse.json(
          { error: "Failed to regenerate webhook secret" },
          { status: 500 },
        );
      }

      return NextResponse.json({
        webhook: data,
        message: "Webhook secret regenerated successfully",
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error(
      "Error in PATCH /api/automations/webhooks/manage/[id]:",
      error,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
