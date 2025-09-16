import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const results = {
      user_id: user.id,
      user_email: user.email,
      checks: {
        user_exists: false,
        user_organizations_exists: false,
        organization_exists: false,
        facebook_integration_exists: false,
      },
      fixes_applied: [],
    };

    // Check if user exists in users table
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();

    if (userData) {
      results.checks.user_exists = true;
    } else {
      // Create user entry
      const { error: createUserError } = await supabase.from("users").insert({
        id: user.id,
        email: user.email!,
        full_name:
          user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
        metadata: {},
      });

      if (!createUserError) {
        results.fixes_applied.push("Created user entry");
      }
    }

    // Check user_organizations
    const { data: userOrg } = await supabase
      .from("user_organizations")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (userOrg) {
      results.checks.user_organizations_exists = true;
      results.organization_id = userOrg.organization_id;
    } else {
      // Create user_organizations entry with default org
      const defaultOrgId = "63589490-8f55-4157-bd3a-e141594b748e";
      const { error: createOrgError } = await supabase
        .from("user_organizations")
        .insert({
          user_id: user.id,
          organization_id: defaultOrgId,
          role: "member",
        });

      if (!createOrgError) {
        results.fixes_applied.push("Created user_organizations entry");
        results.organization_id = defaultOrgId;
      }
    }

    // Check if organization exists
    if (results.organization_id) {
      const { data: orgData } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", results.organization_id)
        .single();

      if (orgData) {
        results.checks.organization_exists = true;
        results.organization_name = orgData.name;
      }
    }

    // Check facebook_integration
    if (results.organization_id) {
      const { data: fbData } = await supabase
        .from("facebook_integrations")
        .select("*")
        .eq("organization_id", results.organization_id)
        .single();

      if (fbData) {
        results.checks.facebook_integration_exists = true;
        results.facebook_integration = {
          id: fbData.id,
          facebook_user_name: fbData.facebook_user_name,
          is_active: fbData.is_active,
          last_sync_at: fbData.last_sync_at,
        };
      }
    }

    // Summary
    results.summary = {
      all_checks_passed: Object.values(results.checks).every(
        (check) => check === true,
      ),
      action_needed: results.checks.facebook_integration_exists
        ? "Facebook integration exists - try reconnecting from the Facebook integration page"
        : "No Facebook integration found - please connect Facebook from the integration page",
    };

    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    console.error("Debug error:", error);
    return NextResponse.json(
      {
        error: "Failed to run debug",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
