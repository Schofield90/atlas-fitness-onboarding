import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { z } from "zod";

const createWaiverSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  waiver_type: z
    .enum([
      "liability",
      "medical",
      "photo_release",
      "membership_agreement",
      "general",
    ])
    .default("liability"),
  required_for: z.array(z.string()).default([]),
  validity_days: z.number().nullable().default(null),
  auto_assign: z.boolean().default(false),
  requires_witness: z.boolean().default(false),
});

const updateWaiverSchema = createWaiverSchema.partial();

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

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

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get("include_inactive") === "true";

    // Fetch waivers
    let query = supabase
      .from("waivers")
      .select("*")
      .eq("organization_id", userOrg.organization_id)
      .order("created_at", { ascending: false });

    if (!includeInactive) {
      query = query.eq("is_active", true);
    }

    const { data: waivers, error } = await query;

    if (error) {
      console.error("Error fetching waivers:", error);
      return NextResponse.json(
        { error: "Failed to fetch waivers" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, data: waivers });
  } catch (error) {
    console.error("Error in GET /api/waivers:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

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
    const validatedData = createWaiverSchema.parse(body);

    // Create waiver
    const { data: waiver, error } = await supabase
      .from("waivers")
      .insert({
        ...validatedData,
        organization_id: userOrg.organization_id,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating waiver:", error);
      return NextResponse.json(
        { error: "Failed to create waiver" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, data: waiver }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }
    console.error("Error in POST /api/waivers:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
