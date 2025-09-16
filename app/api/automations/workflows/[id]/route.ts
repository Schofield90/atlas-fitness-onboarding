import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { getCurrentUserOrganization } from "@/app/lib/organization-server";

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

    const supabase = createClient();

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
    const supabase = createClient();

    // Update workflow data
    const updateData = {
      name: body.name,
      description: body.description,
      status: body.status,
      nodes: body.nodes,
      edges: body.edges,
      variables: body.variables,
      trigger_type: body.trigger_type,
      trigger_config: body.trigger_config,
      settings: body.settings,
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

    const supabase = createClient();

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
