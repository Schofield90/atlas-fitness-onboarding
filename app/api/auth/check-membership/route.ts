import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

const ATLAS_FITNESS_ORG_ID = "63589490-8f55-4157-bd3a-e141594b748e";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminSupabase = await createAdminClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Check if Atlas Fitness organization exists
    const { data: atlasOrg } = await adminSupabase
      .from("organizations")
      .select("id, name")
      .eq("id", ATLAS_FITNESS_ORG_ID)
      .single();

    if (!atlasOrg) {
      // Atlas Fitness org doesn't exist, user needs to create one
      return NextResponse.json({
        hasOrganization: false,
        needsOnboarding: true,
      });
    }

    // Check if user has any organization membership
    const { data: existingMembership } = await adminSupabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    if (existingMembership) {
      // User has an organization
      return NextResponse.json({
        hasOrganization: true,
        organizationId: existingMembership.organization_id,
        needsOnboarding: false,
      });
    }

    // User doesn't have an organization
    // For existing users who should be part of Atlas Fitness, add them automatically
    // This handles the case where users existed before the organization system

    // Check if user exists in the users table (indicating they're an existing user)
    const { data: existingUser } = await adminSupabase
      .from("users")
      .select("id, created_at")
      .eq("id", user.id)
      .single();

    // Check if the user's account was created before today (existing user)
    const userCreatedAt = new Date(user.created_at);
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    if (existingUser || userCreatedAt < oneDayAgo) {
      // This is an existing user, add them to Atlas Fitness
      console.log("Adding existing user to Atlas Fitness:", user.email);

      // Create organization membership
      await adminSupabase.from("organization_members").upsert(
        {
          user_id: user.id,
          organization_id: ATLAS_FITNESS_ORG_ID,
          role: "owner", // Make them owner since they're existing users
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,organization_id",
        },
      );

      // Create user_organizations entry
      await adminSupabase.from("user_organizations").upsert(
        {
          user_id: user.id,
          organization_id: ATLAS_FITNESS_ORG_ID,
          role: "owner",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        },
      );

      // Ensure user exists in users table
      await adminSupabase.from("users").upsert(
        {
          id: user.id,
          email: user.email,
          name:
            user.user_metadata?.full_name ||
            user.email?.split("@")[0] ||
            "User",
          created_at: user.created_at,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "id",
        },
      );

      return NextResponse.json({
        hasOrganization: true,
        organizationId: ATLAS_FITNESS_ORG_ID,
        needsOnboarding: false,
        autoAdded: true,
      });
    }

    // Brand new user - they should go through onboarding
    return NextResponse.json({
      hasOrganization: false,
      needsOnboarding: true,
      isNewUser: true,
    });
  } catch (error: any) {
    console.error("Error checking membership:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
