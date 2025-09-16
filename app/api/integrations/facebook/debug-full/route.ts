import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { getCurrentUserOrganization } from "@/app/lib/organization-server";
import { checkFacebookStatus } from "@/app/lib/facebook/status-checker";

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    // Step 1: Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          step: "auth",
          error: "Not authenticated",
          details: authError,
        },
        { status: 401 },
      );
    }

    // Step 2: Get organization via getCurrentUserOrganization
    let orgResult = await getCurrentUserOrganization();

    // Step 3: Get organization from user_organizations table directly
    const { data: userOrg, error: userOrgError } = await supabase
      .from("user_organizations")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    // Step 4: Get ALL facebook_integrations for this user
    const { data: userIntegrations, error: userIntError } = await supabase
      .from("facebook_integrations")
      .select("*")
      .eq("user_id", user.id);

    // Step 5: Get ALL facebook_integrations for the organization
    let orgIntegrations = null;
    let orgIntError = null;

    if (userOrg?.organization_id) {
      const result = await supabase
        .from("facebook_integrations")
        .select("*")
        .eq("organization_id", userOrg.organization_id);

      orgIntegrations = result.data;
      orgIntError = result.error;
    }

    // Step 6: Try the status checker
    let statusCheckResult = null;
    if (userOrg?.organization_id) {
      statusCheckResult = await checkFacebookStatus({
        organizationId: userOrg.organization_id,
        userId: user.id,
      });
    }

    // Step 7: Check the specific query that's failing
    let specificQueryResult = null;
    let specificQueryError = null;

    if (userOrg?.organization_id) {
      const { data, error } = await supabase
        .from("facebook_integrations")
        .select(
          `
          id,
          facebook_user_id,
          facebook_user_name,
          facebook_user_email,
          token_expires_at,
          is_active,
          last_sync_at
        `,
        )
        .eq("organization_id", userOrg.organization_id)
        .eq("user_id", user.id)
        .eq("is_active", true)
        .single();

      specificQueryResult = data;
      specificQueryError = error;
    }

    return NextResponse.json({
      debug_info: {
        user: {
          id: user.id,
          email: user.email,
        },
        organization: {
          from_function: orgResult,
          from_table: userOrg,
          error: userOrgError,
        },
        facebook_integrations: {
          by_user: {
            data: userIntegrations,
            count: userIntegrations?.length || 0,
            error: userIntError,
          },
          by_organization: {
            data: orgIntegrations,
            count: orgIntegrations?.length || 0,
            error: orgIntError,
          },
          specific_query: {
            data: specificQueryResult,
            error: specificQueryError,
          },
        },
        status_check_result: statusCheckResult,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Debug failed",
        details: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    );
  }
}
