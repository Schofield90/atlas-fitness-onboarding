import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { createClient } from "@/app/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/switch-organization
 *
 * Switches the user's active organization preference.
 * Stores preference in user_preferences table for cross-device sync.
 *
 * Request body:
 * {
 *   organizationId: string
 * }
 *
 * Response:
 * {
 *   success: true,
 *   data: {
 *     organizationId: string,
 *     organization: { id, name }
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { organizationId } = body;

    if (!organizationId) {
      return NextResponse.json(
        {
          success: false,
          error: "organizationId is required",
        },
        { status: 400 }
      );
    }

    // Use admin client to bypass RLS
    const admin = createAdminClient();

    // Check if user is a super admin (can access ALL organizations)
    const isSuperAdmin =
      user.email?.endsWith("@gymleadhub.co.uk") ||
      user.email?.endsWith("@atlas-gyms.co.uk");

    // Super admins can switch to any organization
    if (isSuperAdmin) {
      const { data: organization } = await admin
        .from("organizations")
        .select("id, name")
        .eq("id", organizationId)
        .single();

      if (!organization) {
        return NextResponse.json(
          {
            success: false,
            error: "Organization not found",
          },
          { status: 404 }
        );
      }

      // Save preference for super admin
      await admin
        .from("user_preferences")
        .upsert(
          {
            user_id: user.id,
            preference_key: "selected_organization_id",
            preference_value: organizationId,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id,preference_key",
          }
        );

      return NextResponse.json({
        success: true,
        data: {
          organizationId: organization.id,
          organization: organization,
          superadmin: true,
        },
      });
    }

    // Verify user has access to this organization
    let hasAccess = false;

    // Check if user owns the organization
    const { data: ownedOrg } = await admin
      .from("organizations")
      .select("id, name")
      .eq("id", organizationId)
      .eq("owner_id", user.id)
      .maybeSingle();

    if (ownedOrg) {
      hasAccess = true;
    }

    // Check user_organizations table
    if (!hasAccess) {
      const { data: userOrg } = await admin
        .from("user_organizations")
        .select("organization_id")
        .eq("user_id", user.id)
        .eq("organization_id", organizationId)
        .maybeSingle();

      if (userOrg) {
        hasAccess = true;
      }
    }

    // Check organization_staff table
    if (!hasAccess) {
      const { data: staffLink } = await admin
        .from("organization_staff")
        .select("organization_id")
        .eq("user_id", user.id)
        .eq("organization_id", organizationId)
        .maybeSingle();

      if (staffLink) {
        hasAccess = true;
      }
    }

    if (!hasAccess) {
      return NextResponse.json(
        {
          success: false,
          error: "You do not have access to this organization",
        },
        { status: 403 }
      );
    }

    // Get organization details
    const { data: organization } = await admin
      .from("organizations")
      .select("id, name")
      .eq("id", organizationId)
      .single();

    if (!organization) {
      return NextResponse.json(
        {
          success: false,
          error: "Organization not found",
        },
        { status: 404 }
      );
    }

    // Save preference to user_preferences table (upsert)
    const { error: prefError } = await admin
      .from("user_preferences")
      .upsert(
        {
          user_id: user.id,
          preference_key: "selected_organization_id",
          preference_value: organizationId,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,preference_key",
        }
      );

    if (prefError) {
      console.error("Error saving organization preference:", prefError);
      // Non-fatal - preference will be saved in localStorage instead
    }

    return NextResponse.json({
      success: true,
      data: {
        organizationId: organization.id,
        organization: organization,
      },
    });
  } catch (error: any) {
    console.error("Error switching organization:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to switch organization",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
