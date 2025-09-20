import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

export async function GET(req: NextRequest) {
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

    // Check if user has a user_organizations entry
    const { data: userOrg, error: userOrgError } = await supabase
      .from("user_organizations")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (userOrg) {
      return NextResponse.json({
        message: "User already has organization entry",
        user_organization: userOrg,
      });
    }

    // Check if user owns an organization
    const { data: ownedOrg, error: ownedOrgError } = await supabase
      .from("organizations")
      .select("*")
      .eq("owner_id", user.id)
      .single();

    if (!ownedOrg) {
      return NextResponse.json({
        error: "User does not own any organization",
        suggestion: "Create an organization first",
      });
    }

    // Create user_organizations entry
    const { data: newUserOrg, error: createError } = await supabase
      .from("user_organizations")
      .insert({
        user_id: user.id,
        organization_id: ownedOrg.id,
        role: "owner",
      })
      .select()
      .single();

    if (createError) {
      return NextResponse.json(
        {
          error: "Failed to create user_organizations entry",
          details: createError,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      message: "Successfully created user_organizations entry",
      user_organization: newUserOrg,
      organization: ownedOrg,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error.message,
      },
      { status: 500 },
    );
  }
}
