import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

export async function GET() {
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

    // Get all pipelines for the organization
    const { data: pipelines, error: pipelinesError } = await supabase
      .from("pipelines")
      .select("*")
      .eq("organization_id", userOrg.organization_id)
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (pipelinesError) {
      console.error("Error fetching pipelines:", pipelinesError);
      return NextResponse.json(
        { error: "Failed to fetch pipelines" },
        { status: 500 },
      );
    }

    return NextResponse.json({ pipelines: pipelines || [] });
  } catch (error) {
    console.error("Unexpected error in pipelines GET:", error);
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
    const { name, description, type, stages } = body;
    if (!name || !stages || !Array.isArray(stages)) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Create new pipeline
    const { data: pipeline, error: createError } = await supabase
      .from("pipelines")
      .insert({
        organization_id: userOrg.organization_id,
        name: name.trim(),
        description: description?.trim() || null,
        type: type || "custom",
        stages: stages,
        is_default: false,
        is_active: true,
      })
      .select()
      .single();

    if (createError) {
      console.error("Error creating pipeline:", createError);
      return NextResponse.json(
        { error: "Failed to create pipeline" },
        { status: 500 },
      );
    }

    return NextResponse.json({ pipeline });
  } catch (error) {
    console.error("Unexpected error in pipelines POST:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
