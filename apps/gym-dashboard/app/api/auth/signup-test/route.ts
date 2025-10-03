import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const { email, password, name, organizationName } = await request.json();

    // Create service role client
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

    // Step 1: Create auth user
    const { data: authData, error: authError } =
      await serviceClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: name,
          organization_name: organizationName,
        },
      });

    if (authError) {
      console.error("Auth error:", authError);
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const userId = authData.user.id;

    // Step 2: Create user record
    const { error: userError } = await serviceClient.from("users").insert({
      id: userId,
      email,
      name,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (userError) {
      console.error("User record error:", userError);
      // Clean up auth user
      await serviceClient.auth.admin.deleteUser(userId);
      return NextResponse.json(
        { error: "Failed to create user record: " + userError.message },
        { status: 500 },
      );
    }

    // Step 3: Generate unique org slug
    const orgSlug =
      organizationName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") +
      "-" +
      Math.random().toString(36).substring(2, 8);

    // Step 4: Create organization
    const { data: orgData, error: orgError } = await serviceClient
      .from("organizations")
      .insert({
        name: organizationName,
        slug: orgSlug,
        email,
        owner_id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (orgError) {
      console.error("Organization error:", orgError);
      // Clean up
      await serviceClient.auth.admin.deleteUser(userId);
      return NextResponse.json(
        { error: "Failed to create organization: " + orgError.message },
        { status: 500 },
      );
    }

    // Step 5: Create organization membership
    const { error: memberError } = await serviceClient
      .from("organization_members")
      .insert({
        user_id: userId,
        organization_id: orgData.id,
        role: "owner",
        is_active: true,
      });

    if (memberError) {
      console.error("Membership error:", memberError);
      // Clean up
      await serviceClient.from("organizations").delete().eq("id", orgData.id);
      await serviceClient.auth.admin.deleteUser(userId);
      return NextResponse.json(
        { error: "Failed to create membership: " + memberError.message },
        { status: 500 },
      );
    }

    console.log("✅ Successfully created user and organization:");
    console.log("   User ID:", userId);
    console.log("   Organization ID:", orgData.id);
    console.log("   Organization Slug:", orgData.slug);

    return NextResponse.json({
      success: true,
      userId,
      organizationId: orgData.id,
      organizationSlug: orgData.slug,
      message: "Test signup completed successfully",
    });
  } catch (error: any) {
    console.error("Signup test error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
