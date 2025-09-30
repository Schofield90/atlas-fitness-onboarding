import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { requireAuth } from "@/app/lib/api/auth-check";
import {
  handleApiError,
  ValidationError,
  DatabaseError,
  withApiErrorBoundary,
} from "@/app/lib/errors";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

interface MembershipPlanRequest {
  name: string;
  description?: string;
  price_pennies: number;
  billing_period:
    | "daily"
    | "weekly"
    | "monthly"
    | "quarterly"
    | "yearly"
    | "one_time";
  contract_length_months?: number;
  class_limit?: number;
  features?: any;
  signup_fee_pennies?: number;
  cancellation_fee_pennies?: number;
  cancellation_notice_days?: number;
  is_active?: boolean;
  eligible_class_types?: string[];
  add_ons?: any[];
  trial_days?: number;
}

async function createMembershipPlan(request: NextRequest) {
  const userWithOrg = await requireAuth();
  const supabase = await createClient();

  const body: MembershipPlanRequest = await request.json();

  // Validate required fields
  if (!body.name) {
    throw ValidationError.required("name");
  }
  if (!body.billing_period) {
    throw ValidationError.required("billing_period");
  }
  if (body.price_pennies === undefined) {
    throw ValidationError.required("price_pennies");
  }

  // Check for duplicate names within organization
  const { data: existingPlan } = await supabase
    .from("membership_plans")
    .select("id")
    .eq("organization_id", userWithOrg.organizationId)
    .eq("name", body.name)
    .single();

  if (existingPlan) {
    throw ValidationError.duplicate("name", body.name);
  }

  // Create the membership plan
  // Use 'price' column name (not 'price_pennies') to match database schema
  const { data: membershipPlan, error } = await supabase
    .from("membership_plans")
    .insert({
      organization_id: userWithOrg.organizationId,
      name: body.name,
      description: body.description || "",
      price: body.price_pennies, // Column is 'price' in database
      billing_period: body.billing_period,
      features: body.features || [],
      is_active: body.is_active !== undefined ? body.is_active : true,
      trial_days: body.trial_days || 0,
      max_members: body.class_limit || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating membership plan:", error);
    throw DatabaseError.queryError("membership_plans", "insert", {
      organizationId: userWithOrg.organizationId,
      originalError: error.message,
      code: error.code,
    });
  }

  return NextResponse.json({
    success: true,
    membershipPlan,
    message: "Membership plan created successfully",
  });
}

// Wrap with error boundary
export const POST = withApiErrorBoundary(createMembershipPlan);

async function getMembershipPlans(request: NextRequest) {
  const userWithOrg = await requireAuth();
  const supabase = await createClient();

  const url = new URL(request.url);
  const activeOnly = url.searchParams.get("active_only") === "true";
  const includeStats = url.searchParams.get("include_stats") === "true";

  let query = supabase
    .from("membership_plans")
    .select("*")
    .eq("organization_id", userWithOrg.organizationId);

  if (activeOnly) {
    query = query.eq("is_active", true);
  }

  const { data: membershipPlans, error } = await query.order("created_at", {
    ascending: false,
  });

  if (error) {
    console.error("Error fetching membership plans:", error);
    throw DatabaseError.queryError("membership_plans", "select", {
      organizationId: userWithOrg.organizationId,
      originalError: error.message,
      code: error.code,
    });
  }

  // If stats are requested, get member counts for each plan
  if (includeStats && membershipPlans) {
    const plansWithStats = await Promise.all(
      membershipPlans.map(async (plan) => {
        const { count: memberCount } = await supabase
          .from("customer_memberships")
          .select("*", { count: "exact", head: true })
          .eq("membership_plan_id", plan.id)
          .eq("status", "active");

        const { count: totalRevenue } = await supabase
          .from("payment_transactions")
          .select("amount_pennies", { count: "exact", head: true })
          .eq("metadata->membership_plan_id", plan.id)
          .eq("status", "succeeded");

        return {
          ...plan,
          stats: {
            active_members: memberCount || 0,
            total_revenue: totalRevenue || 0,
          },
        };
      }),
    );

    return NextResponse.json({
      membershipPlans: plansWithStats,
      plans: plansWithStats, // alias for backward compatibility
      total: plansWithStats.length,
    });
  }

  return NextResponse.json({
    membershipPlans: membershipPlans || [],
    plans: membershipPlans || [], // alias for backward compatibility
    total: (membershipPlans || []).length,
  });
}

export const GET = withApiErrorBoundary(getMembershipPlans);

export async function PUT(request: NextRequest) {
  try {
    const userWithOrg = await requireAuth();
    const supabase = await createClient();

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Missing membership plan ID" },
        { status: 400 },
      );
    }

    // Verify the plan belongs to the organization
    const { data: existingPlan, error: fetchError } = await supabase
      .from("membership_plans")
      .select("id, name")
      .eq("id", id)
      .eq("organization_id", userWithOrg.organizationId)
      .single();

    if (fetchError || !existingPlan) {
      return NextResponse.json(
        { error: "Membership plan not found" },
        { status: 404 },
      );
    }

    // Check for name conflicts if name is being updated
    if (updateData.name && updateData.name !== existingPlan.name) {
      const { data: duplicatePlan } = await supabase
        .from("membership_plans")
        .select("id")
        .eq("organization_id", userWithOrg.organizationId)
        .eq("name", updateData.name)
        .neq("id", id)
        .single();

      if (duplicatePlan) {
        return NextResponse.json(
          {
            error: "A membership plan with this name already exists",
          },
          { status: 400 },
        );
      }
    }

    // Update the membership plan
    const { data: updatedPlan, error: updateError } = await supabase
      .from("membership_plans")
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("organization_id", userWithOrg.organizationId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating membership plan:", updateError);
      return NextResponse.json(
        { error: "Failed to update membership plan" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      membershipPlan: updatedPlan,
      message: "Membership plan updated successfully",
    });
  } catch (error) {
    console.error("Error updating membership plan:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userWithOrg = await requireAuth();
    const supabase = await createClient();

    const url = new URL(request.url);
    const planId = url.searchParams.get("id");

    if (!planId) {
      return NextResponse.json(
        { error: "Missing membership plan ID" },
        { status: 400 },
      );
    }

    // Check if plan has active members
    const { count: activeMemberCount } = await supabase
      .from("customer_memberships")
      .select("*", { count: "exact", head: true })
      .eq("membership_plan_id", planId)
      .eq("status", "active");

    if (activeMemberCount && activeMemberCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete membership plan with ${activeMemberCount} active members. Please cancel or transfer these memberships first.`,
        },
        { status: 400 },
      );
    }

    // Verify the plan belongs to the organization
    const { data: existingPlan, error: fetchError } = await supabase
      .from("membership_plans")
      .select("id")
      .eq("id", planId)
      .eq("organization_id", userWithOrg.organizationId)
      .single();

    if (fetchError || !existingPlan) {
      return NextResponse.json(
        { error: "Membership plan not found" },
        { status: 404 },
      );
    }

    // Delete the membership plan
    const { error: deleteError } = await supabase
      .from("membership_plans")
      .delete()
      .eq("id", planId)
      .eq("organization_id", userWithOrg.organizationId);

    if (deleteError) {
      console.error("Error deleting membership plan:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete membership plan" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Membership plan deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting membership plan:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
