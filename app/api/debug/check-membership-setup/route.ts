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
      return NextResponse.json(
        { error: "Not authenticated", userError },
        { status: 401 },
      );
    }

    // Check organization_staff
    const { data: staffData, error: staffError } = await supabase
      .from("organization_staff")
      .select("*")
      .eq("user_id", user.id)
      .single();

    // Check owned organizations
    const { data: ownedOrgs, error: ownedError } = await supabase
      .from("organizations")
      .select("*")
      .eq("owner_id", user.id);

    // Get all membership plans
    const { data: allPlans, error: allPlansError } = await supabase
      .from("membership_plans")
      .select("*")
      .order("created_at", { ascending: false });

    // Get organization-specific plans
    let orgPlans = null;
    let orgPlansError = null;
    const orgId = staffData?.organization_id || ownedOrgs?.[0]?.id;

    if (orgId) {
      const { data, error } = await supabase
        .from("membership_plans")
        .select("*")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });

      orgPlans = data;
      orgPlansError = error;
    }

    // Check user_organizations table
    const { data: userOrgData, error: userOrgError } = await supabase
      .from("user_organizations")
      .select("*")
      .eq("user_id", user.id);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
      },
      organization_staff: {
        exists: !!staffData,
        data: staffData,
        error: staffError?.message,
      },
      owned_organizations: {
        count: ownedOrgs?.length || 0,
        data: ownedOrgs,
        error: ownedError?.message,
      },
      user_organizations: {
        exists: !!userOrgData?.length,
        data: userOrgData,
        error: userOrgError?.message,
      },
      current_org_id: orgId,
      all_membership_plans: {
        count: allPlans?.length || 0,
        data: allPlans,
        error: allPlansError?.message,
      },
      org_membership_plans: {
        count: orgPlans?.length || 0,
        data: orgPlans,
        error: orgPlansError?.message,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error.message,
        stack: error.stack,
      },
      { status: 500 },
    );
  }
}
