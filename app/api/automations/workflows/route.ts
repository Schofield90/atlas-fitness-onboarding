import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { getCurrentUserOrganization } from "@/app/lib/organization-server";

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
    const status = searchParams.get("status");

    const supabase = await createClient();

    // Calculate range for pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // Build query with pagination
    let query = supabase
      .from("workflows")
      .select("*", { count: "exact" })
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .range(from, to);

    // Apply status filter if provided
    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching workflows:", error);
      return NextResponse.json(
        { error: "Failed to fetch workflows" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      workflows: data || [],
      pagination: {
        page,
        pageSize,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
      },
    });
  } catch (error) {
    console.error("Error in GET /api/automations/workflows:", error);
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
    const supabase = await createClient();

    // Prepare workflow data
    const workflowData = {
      organization_id: organizationId,
      name: body.name || "New Workflow",
      description: body.description || "",
      status: body.status || "draft",
      nodes: body.nodes || [],
      edges: body.edges || [],
      variables: body.variables || {},
      trigger_type: body.trigger_type,
      trigger_config: body.trigger_config || {},
      settings: body.settings || {},
    };

    const { data, error } = await supabase
      .from("workflows")
      .insert(workflowData)
      .select()
      .single();

    if (error) {
      console.error("Error creating workflow:", error);
      return NextResponse.json(
        { error: "Failed to create workflow" },
        { status: 500 },
      );
    }

    return NextResponse.json({ workflow: data });
  } catch (error) {
    console.error("Error in POST /api/automations/workflows:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
