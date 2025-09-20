import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

export async function PUT(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's organization
    const { data: userOrg, error: orgError } = await supabase
      .from("user_organizations")
      .select("organization_id")
      .eq("user_id", user.id)
      .single();

    if (orgError || !userOrg) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 },
      );
    }

    // Validate that pipeline belongs to user's organization
    const { data: existingPipeline, error: fetchError } = await supabase
      .from("pipelines")
      .select("id, organization_id")
      .eq("id", params.id)
      .eq("organization_id", userOrg.organization_id)
      .single();

    if (fetchError || !existingPipeline) {
      return NextResponse.json(
        { error: "Pipeline not found" },
        { status: 404 },
      );
    }

    // Validate required fields
    const { name, description, type, stages } = body;
    if (!name || !stages || !Array.isArray(stages)) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Update pipeline
    const { data: pipeline, error: updateError } = await supabase
      .from("pipelines")
      .update({
        name: name.trim(),
        description: description?.trim() || null,
        type: type || "custom",
        stages: stages,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating pipeline:", updateError);
      return NextResponse.json(
        { error: "Failed to update pipeline" },
        { status: 500 },
      );
    }

    return NextResponse.json({ pipeline });
  } catch (error) {
    console.error("Unexpected error in pipeline PUT:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's organization
    const { data: userOrg, error: orgError } = await supabase
      .from("user_organizations")
      .select("organization_id")
      .eq("user_id", user.id)
      .single();

    if (orgError || !userOrg) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 },
      );
    }

    // Validate that pipeline belongs to user's organization
    const { data: existingPipeline, error: fetchError } = await supabase
      .from("pipelines")
      .select("id, organization_id, is_default")
      .eq("id", params.id)
      .eq("organization_id", userOrg.organization_id)
      .single();

    if (fetchError || !existingPipeline) {
      return NextResponse.json(
        { error: "Pipeline not found" },
        { status: 404 },
      );
    }

    // Don't allow deletion of default pipelines
    if (existingPipeline.is_default) {
      return NextResponse.json(
        { error: "Cannot delete default pipeline" },
        { status: 400 },
      );
    }

    // Check if pipeline has any opportunities
    const { count: oppCount, error: oppCountError } = await supabase
      .from("opportunities")
      .select("id", { count: "exact" })
      .eq("pipeline_id", params.id);

    if (oppCountError) {
      console.error("Error checking opportunities:", oppCountError);
      return NextResponse.json(
        { error: "Failed to check pipeline usage" },
        { status: 500 },
      );
    }

    if (oppCount && oppCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete pipeline with ${oppCount} opportunities. Move opportunities to another pipeline first.`,
        },
        { status: 400 },
      );
    }

    // Soft delete pipeline (mark as inactive)
    const { error: deleteError } = await supabase
      .from("pipelines")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.id);

    if (deleteError) {
      console.error("Error deleting pipeline:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete pipeline" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unexpected error in pipeline DELETE:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
