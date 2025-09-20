import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Check if user has organization
    const { data: userOrg, error: userOrgError } = await supabase
      .from("user_organizations")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (userOrg) {
      return NextResponse.json({
        status: "ok",
        message: "User already has organization",
        user_id: user.id,
        organization_id: userOrg.organization_id,
        role: userOrg.role,
      });
    }

    // Check if user owns any organization via user_organizations
    const { data: ownershipCheck } = await supabase
      .from("user_organizations")
      .select("organization_id, organizations(id, name)")
      .eq("user_id", user.id)
      .eq("role", "owner")
      .single();

    if (ownershipCheck?.organization_id) {
      return NextResponse.json({
        status: "already_owner",
        message: "User already owns an organization",
        user_id: user.id,
        organization_id: ownershipCheck.organization_id,
      });
    }

    // Check if there's a known organization to join
    const knownOrgId = "63589490-8f55-4157-bd3a-e141594b748e";
    const { data: knownOrg } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", knownOrgId)
      .single();

    if (knownOrg) {
      // Create user_organizations entry for existing org
      const { error: insertError } = await supabase
        .from("user_organizations")
        .insert({
          user_id: user.id,
          organization_id: knownOrg.id,
          role: "member",
        });

      if (insertError) {
        // Check if already exists
        if (insertError.code === "23505") {
          return NextResponse.json({
            status: "already_member",
            message: "User is already a member of the organization",
            user_id: user.id,
            organization_id: knownOrg.id,
          });
        }

        return NextResponse.json(
          {
            error: "Failed to create user_organizations entry",
            details: insertError,
          },
          { status: 500 },
        );
      }

      return NextResponse.json({
        status: "joined",
        message: "Joined existing Atlas Fitness organization",
        user_id: user.id,
        organization_id: knownOrg.id,
        organization_name: knownOrg.name,
      });
    }

    // No organization exists, create one
    const { data: newOrg, error: createOrgError } = await supabase
      .from("organizations")
      .insert({
        name: "Atlas Fitness",
        subdomain: "atlas-fitness-" + Date.now(),
        plan: "starter",
        status: "active",
        settings: {},
      })
      .select()
      .single();

    if (createOrgError) {
      return NextResponse.json(
        {
          error: "Failed to create organization",
          details: createOrgError,
        },
        { status: 500 },
      );
    }

    // Create user_organizations entry
    const { error: insertError } = await supabase
      .from("user_organizations")
      .insert({
        user_id: user.id,
        organization_id: newOrg.id,
        role: "owner",
      });

    if (insertError) {
      return NextResponse.json(
        {
          error: "Failed to create user_organizations entry",
          details: insertError,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      status: "created",
      message: "Created new organization and association",
      user_id: user.id,
      organization_id: newOrg.id,
      organization_name: newOrg.name,
    });
  } catch (error: any) {
    console.error("Fix organization error:", error);
    return NextResponse.json(
      {
        error: "Failed to fix organization",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
