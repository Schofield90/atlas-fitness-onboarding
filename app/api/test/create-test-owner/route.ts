import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST() {
  // Only allow in development/test environments
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ENABLE_TEST_ENDPOINTS !== "true"
  ) {
    return NextResponse.json(
      { error: "Test endpoints are not available in production" },
      { status: 403 },
    );
  }
  try {
    // Use service role key to bypass RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    const testEmail = "test.owner@gymtest.com";
    const testPassword = "TestOwner123!";
    const testOrgId = "test-org-2024-01-20";
    const testUserId = "test-owner-2024-01-20";

    // Create the test user
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: testEmail,
        password: testPassword,
        email_confirm: true,
        user_metadata: {
          name: "Test Owner",
          role: "owner",
        },
      });

    if (authError && !authError.message.includes("already been registered")) {
      console.error("Auth creation error:", authError);
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const userId = authData?.user?.id || testUserId;

    // Create or update the organization
    const { error: orgError } = await supabaseAdmin
      .from("organizations")
      .upsert(
        {
          id: testOrgId,
          name: "Test Gym Organization",
          owner_id: userId,
          subdomain: "testgym",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "id",
        },
      );

    if (orgError) {
      console.error("Organization creation error:", orgError);
    }

    // Link user to organization in organization_staff
    const { error: staffError } = await supabaseAdmin
      .from("organization_staff")
      .upsert(
        {
          user_id: userId,
          organization_id: testOrgId,
          role: "owner",
          is_active: true,
          created_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,organization_id",
        },
      );

    if (staffError) {
      console.error("Staff link error:", staffError);
    }

    // Also add to organization_members for backward compatibility
    const { error: memberError } = await supabaseAdmin
      .from("organization_members")
      .upsert(
        {
          user_id: userId,
          organization_id: testOrgId,
          role: "owner",
          is_active: true,
          created_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,organization_id",
        },
      );

    if (memberError) {
      console.error("Member link error:", memberError);
    }

    // Add to user_organizations
    const { error: userOrgError } = await supabaseAdmin
      .from("user_organizations")
      .upsert(
        {
          user_id: userId,
          organization_id: testOrgId,
          role: "owner",
          created_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,organization_id",
        },
      );

    if (userOrgError) {
      console.error("User org link error:", userOrgError);
    }

    // Return the credentials
    return NextResponse.json({
      success: true,
      credentials: {
        email: testEmail,
        password: testPassword,
        organizationId: testOrgId,
        organizationName: "Test Gym Organization",
        userId: userId,
      },
      message:
        "Test owner account created successfully. You can now log in with these credentials.",
    });
  } catch (error) {
    console.error("Error creating test owner:", error);
    return NextResponse.json(
      { error: "Failed to create test owner account" },
      { status: 500 },
    );
  }
}
