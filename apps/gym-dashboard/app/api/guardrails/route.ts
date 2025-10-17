import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

/**
 * Guardrails API - CRUD endpoints for managing AI agent guardrails
 *
 * GET    /api/guardrails              - List all guardrails for organization
 * POST   /api/guardrails              - Create new guardrail
 */

/**
 * GET /api/guardrails
 * List all guardrails for the authenticated user's organization
 */
export async function GET(request: NextRequest) {
  try {
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

    // Fetch all guardrails for this organization
    const { data: guardrails, error: guardrailsError } = await supabase
      .from("guardrails")
      .select(`
        id,
        name,
        description,
        type,
        config,
        enabled,
        created_at,
        updated_at
      `)
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });

    if (guardrailsError) {
      console.error("[Guardrails API] Error fetching guardrails:", guardrailsError);
      return NextResponse.json(
        { error: "Failed to fetch guardrails" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: guardrails || [],
      total: guardrails?.length || 0,
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
 * POST /api/guardrails
 * Create a new guardrail for the organization
 *
 * Request body:
 * {
 *   "name": "Business Hours Only",
 *   "description": "Only allow messages during business hours",
 *   "type": "business_hours",
 *   "config": {
 *     "timezone": "Europe/London",
 *     "schedule": {
 *       "monday": { "enabled": true, "start": "09:00", "end": "17:00" },
 *       ...
 *     }
 *   },
 *   "enabled": true
 * }
 */
export async function POST(request: NextRequest) {
  try {
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

    // Parse request body
    const body = await request.json();
    const { name, description, type, config, enabled } = body;

    // Validate required fields
    if (!name || !type) {
      return NextResponse.json(
        { error: "Missing required fields: name, type" },
        { status: 400 }
      );
    }

    // Validate guardrail type
    const validTypes = [
      'tag_blocker',
      'business_hours',
      'rate_limit',
      'lead_status',
      'human_takeover',
      'conversation_status',
      'custom'
    ];

    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid guardrail type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Create guardrail
    const { data: guardrail, error: createError } = await supabase
      .from("guardrails")
      .insert({
        organization_id: organizationId,
        name,
        description: description || null,
        type,
        config: config || {},
        enabled: enabled !== undefined ? enabled : true,
      })
      .select()
      .single();

    if (createError) {
      console.error("[Guardrails API] Error creating guardrail:", createError);

      // Check for unique constraint violation
      if (createError.code === '23505') {
        return NextResponse.json(
          { error: "A guardrail with this name already exists in your organization" },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: "Failed to create guardrail" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: guardrail,
    }, { status: 201 });

  } catch (error: any) {
    console.error("[Guardrails API] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
