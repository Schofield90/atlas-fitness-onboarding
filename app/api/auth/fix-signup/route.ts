import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const { email, name, organizationName } = await request.json();
    const supabase = await createClient();

    // Get the current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Create a service role client to bypass RLS
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    // Step 1: Create or update user record
    const { error: userError } = await serviceClient.from("users").upsert(
      {
        id: user.id,
        email: user.email || email,
        name: name || "Gym Owner",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "id",
      },
    );

    if (userError) {
      console.error("Error creating user record:", userError);
      return NextResponse.json(
        {
          error: "Failed to create user record",
          details: userError.message,
        },
        { status: 500 },
      );
    }

    // Step 2: Generate a unique slug for the organization
    const orgSlug =
      organizationName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") +
      "-" +
      Math.random().toString(36).substring(2, 8);

    // Step 3: Create organization
    const { data: orgData, error: orgError } = await serviceClient
      .from("organizations")
      .insert({
        name: organizationName || "My Gym",
        slug: orgSlug,
        email: user.email || email,
        owner_id: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (orgError) {
      console.error("Error creating organization:", orgError);
      return NextResponse.json(
        {
          error: "Failed to create organization",
          details: orgError.message,
        },
        { status: 500 },
      );
    }

    // Step 4: Create organization_members link
    const { error: memberError } = await serviceClient
      .from("organization_members")
      .insert({
        user_id: user.id,
        organization_id: orgData.id,
        role: "owner",
        is_active: true,
      });

    if (memberError) {
      console.error("Error creating organization membership:", memberError);
      // Try to clean up the organization if membership fails
      await serviceClient.from("organizations").delete().eq("id", orgData.id);

      return NextResponse.json(
        {
          error: "Failed to create organization membership",
          details: memberError.message,
        },
        { status: 500 },
      );
    }

    // Step 5: Also create user_organizations link (some parts of app use this table)
    const { error: userOrgError } = await serviceClient
      .from("user_organizations")
      .insert({
        user_id: user.id,
        organization_id: orgData.id,
        role: "owner",
      });

    if (userOrgError) {
      console.error(
        "Warning: Could not create user_organizations link:",
        userOrgError,
      );
      // Don't fail the signup, this is a secondary table
    }

    console.log(
      `Successfully created organization ${orgData.id} for user ${user.id}`,
    );

    return NextResponse.json({
      success: true,
      userId: user.id,
      organizationId: orgData.id,
      organizationSlug: orgData.slug,
      message: "User and organization setup completed",
    });
  } catch (error: any) {
    console.error("Fix signup error:", error);
    return NextResponse.json(
      {
        error: "Failed to fix signup",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
