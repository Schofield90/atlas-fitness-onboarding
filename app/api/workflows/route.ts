import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      description,
      nodes,
      edges,
      status,
      trigger_type,
      trigger_config,
    } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Workflow name is required" },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    // For now, use hardcoded organization ID due to auth issues
    const organizationId = "63589490-8f55-4157-bd3a-e141594b748e";

    const { data, error } = await supabase
      .from("workflows")
      .insert({
        name,
        description,
        nodes,
        edges,
        status: status || "draft",
        trigger_type: trigger_type || "manual",
        trigger_config: trigger_config || {},
        organization_id: organizationId,
        settings: {
          errorHandling: "continue",
          maxExecutionTime: 300,
          timezone: "Europe/London",
          notifications: {
            onError: true,
            onComplete: false,
          },
        },
      })
      .select()
      .single();

    if (error) {
      console.error("Error saving workflow:", error);
      return NextResponse.json(
        { error: "Failed to save workflow" },
        { status: 500 },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Workflow save error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // For now, use hardcoded organization ID due to auth issues
    const organizationId = "63589490-8f55-4157-bd3a-e141594b748e";

    const { data, error } = await supabase
      .from("workflows")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching workflows:", error);
      return NextResponse.json(
        { error: "Failed to fetch workflows" },
        { status: 500 },
      );
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Workflow fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
