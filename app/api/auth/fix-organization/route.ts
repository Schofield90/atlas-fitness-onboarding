import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

const ATLAS_FITNESS_ORG_ID = "63589490-8f55-4157-bd3a-e141594b748e";

export async function POST(request: NextRequest) {
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

    console.log("Fixing organization for user:", user.email);

    // Check if user already has organization membership
    const { data: existingMembership } = await adminSupabase
      .from("organization_members")
      .select("*")
      .eq("user_id", user.id)
      .eq("organization_id", ATLAS_FITNESS_ORG_ID)
      .single();

    if (!existingMembership) {
      // Create organization membership
      const { error: membershipError } = await adminSupabase
        .from("organization_members")
        .insert({
          user_id: user.id,
          organization_id: ATLAS_FITNESS_ORG_ID,
          role: "owner",
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (membershipError) {
        console.error(
          "Error creating organization membership:",
          membershipError,
        );
        // Try to update if it exists but is inactive
        const { error: updateError } = await adminSupabase
          .from("organization_members")
          .update({ is_active: true, role: "owner" })
          .eq("user_id", user.id)
          .eq("organization_id", ATLAS_FITNESS_ORG_ID);

        if (updateError) {
          return NextResponse.json(
            {
              error: "Failed to create membership: " + membershipError.message,
            },
            { status: 500 },
          );
        }
      }
    }

    // Also ensure user_organizations entry exists
    const { data: existingUserOrg } = await adminSupabase
      .from("user_organizations")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!existingUserOrg) {
      const { error: userOrgError } = await adminSupabase
        .from("user_organizations")
        .insert({
          user_id: user.id,
          organization_id: ATLAS_FITNESS_ORG_ID,
          role: "owner",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (userOrgError) {
        console.error("Error creating user_organizations:", userOrgError);
        // Try upsert
        await adminSupabase.from("user_organizations").upsert(
          {
            user_id: user.id,
            organization_id: ATLAS_FITNESS_ORG_ID,
            role: "owner",
          },
          {
            onConflict: "user_id",
          },
        );
      }
    }

    // Ensure the user exists in the users table
    const { error: userTableError } = await adminSupabase.from("users").upsert(
      {
        id: user.id,
        email: user.email,
        name:
          user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
        created_at: user.created_at,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "id",
      },
    );

    if (userTableError) {
      console.error("Error ensuring user in users table:", userTableError);
    }

    return NextResponse.json({
      success: true,
      message: "Organization membership fixed",
      organizationId: ATLAS_FITNESS_ORG_ID,
      userId: user.id,
    });
  } catch (error: any) {
    console.error("Error fixing organization:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
