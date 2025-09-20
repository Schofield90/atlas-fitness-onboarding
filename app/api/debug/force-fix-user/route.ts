import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { clearUserCache } from "@/app/lib/api/auth-check";

export async function POST() {
  try {
    const supabase = await createClient();

    // Create admin client to bypass RLS
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          error: "Not authenticated",
          details: authError?.message,
        },
        { status: 401 },
      );
    }

    // Clear any cache
    clearUserCache(user.id);

    // First, delete any existing user entry to start fresh
    await supabaseAdmin.from("users").delete().eq("id", user.id);

    // Get the Atlas Fitness organization
    const { data: organizations } = await supabaseAdmin
      .from("organizations")
      .select("*");

    // Find Atlas Fitness org
    const atlasOrg = organizations?.find(
      (org) =>
        org.name === "Atlas Fitness" ||
        org.id === "63589490-8f55-4157-bd3a-e141594b748e",
    );

    if (!atlasOrg) {
      return NextResponse.json(
        {
          error: "Atlas Fitness organization not found",
          availableOrgs: organizations,
        },
        { status: 404 },
      );
    }

    // Create fresh user entry
    const { data: newUser, error: insertError } = await supabaseAdmin
      .from("users")
      .insert({
        id: user.id,
        email: user.email || "sam@atlas-gyms.co.uk",
        name: "Sam Schofield",
        organization_id: atlasOrg.id,
        role: "owner",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        {
          error: "Failed to create user entry",
          details: insertError.message,
          code: insertError.code,
          hint: insertError.hint,
        },
        { status: 500 },
      );
    }

    // Verify the user was created
    const { data: verifyUser } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();

    return NextResponse.json({
      success: true,
      message: "User successfully created and linked to Atlas Fitness",
      user: newUser,
      verified: verifyUser,
      organizationId: atlasOrg.id,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to fix user organization",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
