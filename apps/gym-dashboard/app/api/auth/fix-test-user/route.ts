import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    // Create a service role client to bypass RLS
    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    // Get the user by email
    const { data: authUser } = await serviceClient.auth.admin.listUsers();
    const testUser = authUser?.users?.find(
      (u) => u.email === "testgym.leeds@example.com",
    );

    if (!testUser) {
      return NextResponse.json(
        { error: "Test user not found in auth.users" },
        { status: 404 },
      );
    }

    // First, ensure user exists in public.users
    const { data: existingUser } = await serviceClient
      .from("users")
      .select("id")
      .eq("id", testUser.id)
      .maybeSingle();

    if (!existingUser) {
      const { error: userError } = await serviceClient.from("users").insert({
        id: testUser.id,
        email: "testgym.leeds@example.com",
        name: "Test Gym Owner",
      });

      if (userError && userError.code !== "23505") {
        console.error("User insert error:", userError);
        return NextResponse.json(
          { error: "Failed to create user record", details: userError.message },
          { status: 500 },
        );
      }
    }

    // Check if user already has an organization
    const { data: existingOrg } = await serviceClient
      .from("user_organizations")
      .select("organization_id")
      .eq("user_id", testUser.id)
      .maybeSingle();

    let orgId = existingOrg?.organization_id;

    if (!orgId) {
      // Create organization
      const orgSlug =
        "test-gym-leeds-" + Math.random().toString(36).substring(7);

      const { data: newOrg, error: orgError } = await serviceClient
        .from("organizations")
        .insert({
          name: "Test Gym Leeds",
          slug: orgSlug,
          email: "testgym.leeds@example.com",
          phone: "07700900123",
          subscription_status: "trialing",
        })
        .select("id")
        .single();

      if (orgError) {
        console.error("Org creation error:", orgError);
        return NextResponse.json(
          { error: "Failed to create organization", details: orgError.message },
          { status: 500 },
        );
      }

      orgId = newOrg.id;

      // Link user to organization as owner
      const { error: linkError } = await serviceClient
        .from("user_organizations")
        .insert({
          user_id: testUser.id,
          organization_id: orgId,
          role: "owner",
        });

      if (linkError) {
        console.error("Link error:", linkError);
        return NextResponse.json(
          {
            error: "Failed to link user to organization",
            details: linkError.message,
          },
          { status: 500 },
        );
      }
    } else {
      // Update role to owner if not already
      await serviceClient
        .from("user_organizations")
        .update({ role: "owner" })
        .eq("user_id", testUser.id)
        .eq("organization_id", orgId);
    }

    const result = { organization_id: orgId };

    // Verify the user now has owner access
    const { data: userOrg } = await serviceClient
      .from("user_organizations")
      .select("*, organizations(*)")
      .eq("user_id", testUser.id)
      .single();

    return NextResponse.json({
      success: true,
      userId: testUser.id,
      organizationId: result?.organization_id,
      userOrganization: userOrg,
      message: "Test user fixed successfully",
    });
  } catch (error: any) {
    console.error("Fix test user error:", error);
    return NextResponse.json(
      {
        error: "Failed to fix test user",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
