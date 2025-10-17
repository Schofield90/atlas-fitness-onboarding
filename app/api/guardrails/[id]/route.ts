import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

/**
 * Guardrails API - Individual guardrail operations
 *
 * GET    /api/guardrails/[id]         - Get single guardrail
 * PUT    /api/guardrails/[id]         - Update guardrail
 * DELETE /api/guardrails/[id]         - Delete guardrail
 */

/**
 * GET /api/guardrails/[id]
 * Get details of a specific guardrail
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createAdminClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get user's organization
    const { data: userOrg, error: orgError } = await supabase
      .from("user_organizations")
      .select("organization_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (orgError || !userOrg) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    const organizationId = userOrg.organization_id;

    // Fetch guardrail (verify ownership)
    const { data: guardrail, error: guardrailError } = await supabase
      .from("guardrails")
      .select("*")
      .eq("id", id)
      .eq("organization_id", organizationId)
      .single();

    if (guardrailError || !guardrail) {
      return NextResponse.json(
        { error: "Guardrail not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: guardrail,
    });

  } catch (error: any) {
    console.error("[Guardrails API] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/guardrails/[id]
 * Update an existing guardrail
 *
 * Request body (all fields optional):
 * {
 *   "name": "Updated Name",
 *   "description": "Updated description",
 *   "config": { ... },
 *   "enabled": false
 * }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createAdminClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get user's organization
    const { data: userOrg, error: orgError } = await supabase
      .from("user_organizations")
      .select("organization_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (orgError || !userOrg) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    const organizationId = userOrg.organization_id;

    // Verify guardrail exists and belongs to organization
    const { data: existingGuardrail, error: checkError } = await supabase
      .from("guardrails")
      .select("id")
      .eq("id", id)
      .eq("organization_id", organizationId)
      .single();

    if (checkError || !existingGuardrail) {
      return NextResponse.json(
        { error: "Guardrail not found" },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { name, description, config, enabled } = body;

    // Build update object (only include provided fields)
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (config !== undefined) updateData.config = config;
    if (enabled !== undefined) updateData.enabled = enabled;

    // Update guardrail
    const { data: guardrail, error: updateError } = await supabase
      .from("guardrails")
      .update(updateData)
      .eq("id", id)
      .eq("organization_id", organizationId)
      .select()
      .single();

    if (updateError) {
      console.error("[Guardrails API] Error updating guardrail:", updateError);

      // Check for unique constraint violation
      if (updateError.code === '23505') {
        return NextResponse.json(
          { error: "A guardrail with this name already exists in your organization" },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: "Failed to update guardrail" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: guardrail,
    });

  } catch (error: any) {
    console.error("[Guardrails API] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/guardrails/[id]
 * Delete a guardrail (also removes all agent_guardrails links via CASCADE)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createAdminClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get user's organization
    const { data: userOrg, error: orgError } = await supabase
      .from("user_organizations")
      .select("organization_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (orgError || !userOrg) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    const organizationId = userOrg.organization_id;

    // Delete guardrail (CASCADE will delete agent_guardrails links)
    const { error: deleteError } = await supabase
      .from("guardrails")
      .delete()
      .eq("id", id)
      .eq("organization_id", organizationId);

    if (deleteError) {
      console.error("[Guardrails API] Error deleting guardrail:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete guardrail" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Guardrail deleted successfully",
    });

  } catch (error: any) {
    console.error("[Guardrails API] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
