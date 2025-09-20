import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    // Get current user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use admin client to bypass RLS
    const adminSupabase = createAdminClient();

    // Check if user already has an organization membership
    const { data: existingMembership } = await adminSupabase
      .from("organization_members")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (existingMembership) {
      return NextResponse.json({
        message: "User already has organization membership",
        membership: existingMembership,
      });
    }

    // Get the first organization (or create one if none exists)
    const { data: organizations } = await adminSupabase
      .from("organizations")
      .select("*")
      .limit(1);

    let organizationId: string;

    if (!organizations || organizations.length === 0) {
      // Create a default organization
      const { data: newOrg, error: createOrgError } = await adminSupabase
        .from("organizations")
        .insert({
          name: "Default Organization",
          slug: "default-org",
          settings: {},
        })
        .select()
        .single();

      if (createOrgError) {
        throw createOrgError;
      }

      organizationId = newOrg.id;
    } else {
      organizationId = organizations[0].id;
    }

    // Add user to organization_members
    const { data: newMembership, error: membershipError } = await adminSupabase
      .from("organization_members")
      .insert({
        user_id: user.id,
        organization_id: organizationId,
        role: "owner", // Give owner role for import access
        is_active: true,
      })
      .select()
      .single();

    if (membershipError) {
      throw membershipError;
    }

    // Also update user_organizations table if it exists
    await adminSupabase.from("user_organizations").upsert({
      user_id: user.id,
      organization_id: organizationId,
      role: "owner",
      is_active: true,
    });

    return NextResponse.json({
      success: true,
      message: "Organization membership created successfully",
      membership: newMembership,
      organizationId,
    });
  } catch (error: any) {
    console.error("Setup organization member error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to setup organization membership" },
      { status: 500 },
    );
  }
}
