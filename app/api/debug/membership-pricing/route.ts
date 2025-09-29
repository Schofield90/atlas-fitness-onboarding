import { createClient } from "@/app/lib/supabase/server";
import { NextResponse } from "next/server";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: "Not authenticated",
        debug: { authError },
      });
    }

    // Get user's organization
    const { data: userOrg, error: orgError } = await supabase
      .from("user_organizations")
      .select("organization_id, role")
      .eq("user_id", user.id)
      .single();

    if (orgError || !userOrg) {
      return NextResponse.json({
        success: false,
        error: "No organization found",
        debug: {
          userId: user.id,
          userEmail: user.email,
          orgError,
        },
      });
    }

    // Get membership plans for this organization
    const { data: membershipPlans, error: plansError } = await supabase
      .from("membership_plans")
      .select("*")
      .eq("organization_id", userOrg.organization_id)
      .eq("is_active", true);

    // Get customer memberships with plan data
    const { data: customerMemberships, error: membershipsError } =
      await supabase
        .from("customer_memberships")
        .select(
          `
        *,
        membership_plan:membership_plans(*)
      `,
        )
        .limit(3);

    return NextResponse.json({
      success: true,
      debug: {
        user: {
          id: user.id,
          email: user.email,
        },
        organization: userOrg,
        membershipPlans: {
          count: membershipPlans?.length || 0,
          data: membershipPlans,
          error: plansError,
        },
        customerMemberships: {
          count: customerMemberships?.length || 0,
          data: customerMemberships?.map((m) => ({
            id: m.id,
            hasPlans: !!m.membership_plan,
            planName: m.membership_plan?.name,
            planPrice: m.membership_plan?.price,
          })),
          error: membershipsError,
        },
      },
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: "Server error",
      debug: { error: error.message },
    });
  }
}
