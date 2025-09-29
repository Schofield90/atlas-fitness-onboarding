import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { getMembershipPlans } from "@/app/lib/services/membership-service";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const testMapping = request.nextUrl.searchParams.get("testMapping");

  if (testMapping) {
    // Test the getMembershipPlans service function mapping
    const { plans, error } = await getMembershipPlans();

    if (error) {
      return NextResponse.json({
        success: false,
        error,
      });
    }

    // Debug the actual values after mapping
    const debug = plans.map((plan) => ({
      name: plan.name,
      price_pennies_after_mapping: plan.price_pennies,
      formatted_with_true: new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency: "GBP",
      }).format(plan.price_pennies / 100),
      formatted_with_false: new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency: "GBP",
      }).format(plan.price_pennies),
    }));

    return NextResponse.json({
      success: true,
      plans_count: plans.length,
      debug,
      raw_plans: plans,
    });
  }

  try {
    // Allow in production for membership testing
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get user's organization
    const { data: userOrg, error: userOrgError } = await supabase
      .from("user_organizations")
      .select("organization_id")
      .eq("user_id", user.id)
      .single();

    if (userOrgError || !userOrg?.organization_id) {
      // Try fallback
      const { data: orgData, error: orgError } = await supabase
        .from("organizations")
        .select("id")
        .eq("owner_id", user.id)
        .single();

      if (orgError || !orgData) {
        return NextResponse.json(
          {
            error: "No organization found",
            userOrgError: userOrgError?.message,
            orgError: orgError?.message,
            userId: user.id,
          },
          { status: 404 },
        );
      }

      // Use owner's org
      userOrg.organization_id = orgData.id;
    }

    // Try to fetch membership plans
    const { data: plans, error: plansError } = await supabase
      .from("membership_plans")
      .select("*")
      .eq("organization_id", userOrg.organization_id);

    // Also check if there are ANY membership plans
    const { data: allPlans, error: allPlansError } = await supabase
      .from("membership_plans")
      .select("id, organization_id, name")
      .limit(5);

    return NextResponse.json({
      success: true,
      organizationId: userOrg.organization_id,
      plans: plans || [],
      plansError: plansError?.message,
      plansCount: plans?.length || 0,
      allPlansCount: allPlans?.length || 0,
      allPlansError: allPlansError?.message,
      samplePlans: allPlans || [],
    });
  } catch (error) {
    console.error("Debug error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// Create a test membership plan
export async function POST(request: NextRequest) {
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

    // Get user's organization
    const { data: userOrg, error: userOrgError } = await supabase
      .from("user_organizations")
      .select("organization_id")
      .eq("user_id", user.id)
      .single();

    if (userOrgError || !userOrg?.organization_id) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 404 },
      );
    }

    // Create a test plan
    const { data: newPlan, error: createError } = await supabase
      .from("membership_plans")
      .insert({
        organization_id: userOrg.organization_id,
        name: "Test Membership Plan",
        description: "This is a test membership plan created for debugging",
        price_amount: 49.99,
        billing_period: "monthly",
        features: [
          "Access to gym",
          "Group classes",
          "Personal trainer session",
        ],
        class_credits: 10,
        is_active: true,
      })
      .select()
      .single();

    if (createError) {
      return NextResponse.json(
        {
          error: "Failed to create plan",
          details: createError.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      plan: newPlan,
    });
  } catch (error) {
    console.error("Create error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
