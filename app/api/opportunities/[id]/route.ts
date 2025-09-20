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

    // Validate that opportunity belongs to user's organization
    const { data: existingOpp, error: fetchError } = await supabase
      .from("opportunities")
      .select("id, organization_id")
      .eq("id", params.id)
      .eq("organization_id", userOrg.organization_id)
      .single();

    if (fetchError || !existingOpp) {
      return NextResponse.json(
        { error: "Opportunity not found" },
        { status: 404 },
      );
    }

    // Extract update fields
    const {
      title,
      stage,
      value,
      expected_close_date,
      source,
      assigned_to_id,
      probability,
      status,
      notes,
    } = body;

    // Build update object with only provided fields
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (title !== undefined) updateData.title = title.trim();
    if (stage !== undefined) updateData.stage = stage;
    if (value !== undefined) updateData.value = value;
    if (expected_close_date !== undefined)
      updateData.expected_close_date = expected_close_date;
    if (source !== undefined) updateData.source = source?.trim() || null;
    if (assigned_to_id !== undefined)
      updateData.assigned_to_id = assigned_to_id;
    if (probability !== undefined) updateData.probability = probability;
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;

    // Update opportunity
    const { data: opportunity, error: updateError } = await supabase
      .from("opportunities")
      .update(updateData)
      .eq("id", params.id)
      .select(
        `
        *,
        contact:leads(id, name, email, phone),
        assigned_to:staff(id, name, email)
      `,
      )
      .single();

    if (updateError) {
      console.error("Error updating opportunity:", updateError);
      return NextResponse.json(
        { error: "Failed to update opportunity" },
        { status: 500 },
      );
    }

    return NextResponse.json({ opportunity });
  } catch (error) {
    console.error("Unexpected error in opportunity PUT:", error);
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

    // Validate that opportunity belongs to user's organization
    const { data: existingOpp, error: fetchError } = await supabase
      .from("opportunities")
      .select("id, organization_id")
      .eq("id", params.id)
      .eq("organization_id", userOrg.organization_id)
      .single();

    if (fetchError || !existingOpp) {
      return NextResponse.json(
        { error: "Opportunity not found" },
        { status: 404 },
      );
    }

    // Delete opportunity
    const { error: deleteError } = await supabase
      .from("opportunities")
      .delete()
      .eq("id", params.id);

    if (deleteError) {
      console.error("Error deleting opportunity:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete opportunity" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unexpected error in opportunity DELETE:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
