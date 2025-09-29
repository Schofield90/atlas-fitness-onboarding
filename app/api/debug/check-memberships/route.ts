import { createClient } from "@/app/lib/supabase/server";
import { NextResponse } from "next/server";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Use the known organization ID
    const knownOrgId = "63589490-8f55-4157-bd3a-e141594b748e";

    // Check all membership plans
    const { data: allPlans, error: allError } = await supabase
      .from("membership_plans")
      .select("*")
      .order("created_at", { ascending: false });

    // Check membership plans for the known organization
    const { data: orgPlans, error: orgError } = await supabase
      .from("membership_plans")
      .select("*")
      .eq("organization_id", knownOrgId)
      .order("created_at", { ascending: false });

    // Get user's organization from organization_members
    const { data: orgMember } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .single();

    return NextResponse.json(
      {
        user_id: user.id,
        organization_id: knownOrgId,
        user_organization: orgMember?.organization_id || null,
        all_plans_count: allPlans?.length || 0,
        org_plans_count: orgPlans?.length || 0,
        all_plans: allPlans || [],
        org_plans: orgPlans || [],
        latest_plan: allPlans?.[0] || null,
        memberships: orgPlans || [],
      },
      { status: 200 },
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error.message,
        stack: error.stack,
      },
      { status: 500 },
    );
  }
}
