import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { z } from "zod";

const updateWaiverSchema = z.object({
  title: z.string().min(1, "Title is required").optional(),
  content: z.string().min(1, "Content is required").optional(),
  waiver_type: z
    .enum([
      "liability",
      "medical",
      "photo_release",
      "membership_agreement",
      "general",
    ])
    .optional(),
  required_for: z.array(z.string()).optional(),
  validity_days: z.number().nullable().optional(),
  auto_assign: z.boolean().optional(),
  requires_witness: z.boolean().optional(),
  is_active: z.boolean().optional(),
});

export async function GET(
  request: NextRequest,
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
    const { data: userOrg } = await supabase
      .from("user_organizations")
      .select("organization_id")
      .eq("user_id", user.id)
      .single();

    if (!userOrg?.organization_id) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 403 },
      );
    }

    // Fetch waiver
    const { data: waiver, error } = await supabase
      .from("waivers")
      .select("*")
      .eq("id", params.id)
      .eq("organization_id", userOrg.organization_id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Waiver not found" },
          { status: 404 },
        );
      }
      console.error("Error fetching waiver:", error);
      return NextResponse.json(
        { error: "Failed to fetch waiver" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, data: waiver });
  } catch (error) {
    console.error("Error in GET /api/waivers/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
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
    const { data: userOrg } = await supabase
      .from("user_organizations")
      .select("organization_id")
      .eq("user_id", user.id)
      .single();

    if (!userOrg?.organization_id) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 403 },
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = updateWaiverSchema.parse(body);

    // Update waiver
    const { data: waiver, error } = await supabase
      .from("waivers")
      .update({
        ...validatedData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.id)
      .eq("organization_id", userOrg.organization_id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Waiver not found" },
          { status: 404 },
        );
      }
      console.error("Error updating waiver:", error);
      return NextResponse.json(
        { error: "Failed to update waiver" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, data: waiver });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }
    console.error("Error in PUT /api/waivers/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
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
    const { data: userOrg } = await supabase
      .from("user_organizations")
      .select("organization_id")
      .eq("user_id", user.id)
      .single();

    if (!userOrg?.organization_id) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 403 },
      );
    }

    // Soft delete - just mark as inactive
    const { data: waiver, error } = await supabase
      .from("waivers")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.id)
      .eq("organization_id", userOrg.organization_id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Waiver not found" },
          { status: 404 },
        );
      }
      console.error("Error deleting waiver:", error);
      return NextResponse.json(
        { error: "Failed to delete waiver" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, data: waiver });
  } catch (error) {
    console.error("Error in DELETE /api/waivers/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
