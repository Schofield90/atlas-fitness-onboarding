import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const pipelineId = searchParams.get("pipeline_id");

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

    // Build query
    let query = supabase
      .from("opportunities")
      .select(
        `
        *,
        contact:leads(id, name, email, phone),
        assigned_to:staff(id, name, email)
      `,
      )
      .eq("organization_id", userOrg.organization_id)
      .order("updated_at", { ascending: false });

    // Filter by pipeline if specified
    if (pipelineId) {
      query = query.eq("pipeline_id", pipelineId);
    }

    const { data: opportunities, error: opportunitiesError } = await query;

    if (opportunitiesError) {
      console.error("Error fetching opportunities:", opportunitiesError);
      return NextResponse.json(
        { error: "Failed to fetch opportunities" },
        { status: 500 },
      );
    }

    return NextResponse.json({ opportunities: opportunities || [] });
  } catch (error) {
    console.error("Unexpected error in opportunities GET:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
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

    // Validate required fields
    const {
      title,
      contact_id,
      pipeline_id,
      stage,
      value,
      expected_close_date,
      source,
      assigned_to_id,
      probability,
    } = body;

    if (!title || !contact_id || !pipeline_id || !stage) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Verify pipeline belongs to organization
    const { data: pipeline, error: pipelineError } = await supabase
      .from("pipelines")
      .select("id")
      .eq("id", pipeline_id)
      .eq("organization_id", userOrg.organization_id)
      .single();

    if (pipelineError || !pipeline) {
      return NextResponse.json({ error: "Invalid pipeline" }, { status: 400 });
    }

    // Create opportunity
    const { data: opportunity, error: createError } = await supabase
      .from("opportunities")
      .insert({
        organization_id: userOrg.organization_id,
        title: title.trim(),
        contact_id,
        pipeline_id,
        stage,
        value: value || 0,
        expected_close_date,
        source: source?.trim() || null,
        assigned_to_id: assigned_to_id || null,
        probability: probability || 0,
        status: "open",
      })
      .select(
        `
        *,
        contact:leads(id, name, email, phone),
        assigned_to:staff(id, name, email)
      `,
      )
      .single();

    if (createError) {
      console.error("Error creating opportunity:", createError);
      return NextResponse.json(
        { error: "Failed to create opportunity" },
        { status: 500 },
      );
    }

    return NextResponse.json({ opportunity });
  } catch (error) {
    console.error("Unexpected error in opportunities POST:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
