import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { getCurrentUserOrganization } from "@/app/lib/organization-server";
import { AutomationInputValidator } from "@/app/lib/automation/server-only";

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
      .from("workflows")
      .select("*")
      .eq("id", id)
      .eq("organization_id", organizationId)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ workflow: data });
  } catch (error) {
    console.error("Error in GET /api/automations/workflows/[id]:", error);
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

    // Add current workflow ID and organizationId for validation
    const workflowToValidate = {
      ...body,
      id: id,
      organizationId: organizationId,
    };

    // Validate and sanitize workflow data
    const validationResult = AutomationInputValidator.validateWorkflowData(
      workflowToValidate,
      organizationId,
    );

    if (!validationResult.isValid) {
      console.error(
        "Workflow update validation failed:",
        validationResult.errors,
      );
      return NextResponse.json(
        {
          error: "Invalid workflow data",
          details: validationResult.errors,
        },
        { status: 400 },
      );
    }

    // Log warnings for monitoring
    if (validationResult.warnings.length > 0) {
      console.warn(
        "Workflow update validation warnings:",
        validationResult.warnings,
      );
    }

    const sanitizedWorkflow = validationResult.sanitizedData;
    const supabase = await createClient();

    // Update workflow data
    const updateData = {
      name: sanitizedWorkflow.name,
      description: sanitizedWorkflow.description,
      status: sanitizedWorkflow.status,
      nodes: sanitizedWorkflow.workflowData?.nodes,
      edges: sanitizedWorkflow.workflowData?.edges,
      variables: sanitizedWorkflow.workflowData?.variables,
      trigger_type: sanitizedWorkflow.triggerType,
      trigger_config: sanitizedWorkflow.triggerConfig,
      settings: sanitizedWorkflow.settings,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("workflows")
      .update(updateData)
      .eq("id", id)
      .eq("organization_id", organizationId)
      .select()
      .single();

    if (error || !data) {
      console.error("Error updating workflow:", error);
      return NextResponse.json(
        { error: "Failed to update workflow" },
        { status: 500 },
      );
    }

    return NextResponse.json({ workflow: data });
  } catch (error) {
    console.error("Error in PUT /api/automations/workflows/[id]:", error);
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

    const { error } = await supabase
      .from("workflows")
      .delete()
      .eq("id", id)
      .eq("organization_id", organizationId);

    if (error) {
      console.error("Error deleting workflow:", error);
      return NextResponse.json(
        { error: "Failed to delete workflow" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/automations/workflows/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
