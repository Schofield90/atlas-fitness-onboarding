import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

// Default test organization ID (Atlas Fitness)
const TEST_ORG_ID = "63589490-8f55-4157-bd3a-e141594b748e";

export async function POST(request: NextRequest) {
  try {
    // Only allow in development or test environments
    if (
      process.env.NODE_ENV === "production" &&
      process.env.ENABLE_TEST_ROUTES !== "true"
    ) {
      return NextResponse.json(
        { error: "Test routes are disabled in production" },
        { status: 403 },
      );
    }

    const supabase = await createClient();
    const body = await request.json();
    const { email, password, organizationId = TEST_ORG_ID } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 },
      );
    }

    // Sign in the test user
    const { data: authData, error: signInError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (signInError || !authData.user) {
      console.error("Sign in error:", signInError);
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 },
      );
    }

    // Ensure user has organization access
    const { data: existingOrg } = await supabase
      .from("user_organizations")
      .select("*")
      .eq("user_id", authData.user.id)
      .eq("organization_id", organizationId)
      .single();

    if (!existingOrg) {
      // Create user_organizations entry
      const { error: orgError } = await supabase
        .from("user_organizations")
        .insert({
          user_id: authData.user.id,
          organization_id: organizationId,
          role: "member",
        });

      if (orgError) {
        console.error("Error creating user organization:", orgError);
        // Continue anyway - user is still authenticated
      }
    }

    // Also ensure organization_staff entry (for newer schema)
    const { data: existingStaff } = await supabase
      .from("organization_staff")
      .select("*")
      .eq("user_id", authData.user.id)
      .eq("organization_id", organizationId)
      .single();

    if (!existingStaff) {
      const { error: staffError } = await supabase
        .from("organization_staff")
        .insert({
          user_id: authData.user.id,
          organization_id: organizationId,
          role: "staff",
          permissions: ["view_calendar", "manage_classes"],
          is_active: true,
          created_at: new Date().toISOString(),
        });

      if (staffError) {
        console.error("Error creating organization staff:", staffError);
        // Continue anyway - user is still authenticated
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email,
      },
      session: {
        access_token: authData.session?.access_token,
        refresh_token: authData.session?.refresh_token,
      },
      organizationId,
      message: "Test user logged in and organization access ensured",
    });
  } catch (error) {
    console.error("Setup test user error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
