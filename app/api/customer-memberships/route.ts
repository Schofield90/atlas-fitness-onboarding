import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { requireAuth } from "@/app/lib/api/auth-check";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const supabase = createAdminClient();
    const body = await request.json();

    const { customerId, membershipPlanId, startDate, notes } = body;

    if (!customerId || !membershipPlanId || !startDate) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Determine if this is a lead or client
    const { data: clientCheck } = await supabase
      .from("clients")
      .select("id")
      .eq("id", customerId)
      .eq("org_id", user.organizationId)
      .single();

    const isClient = !!clientCheck;

    // Get membership plan to calculate end date
    const { data: plan } = await supabase
      .from("membership_plans")
      .select("billing_period")
      .eq("id", membershipPlanId)
      .eq("organization_id", user.organizationId)
      .single();

    if (!plan) {
      return NextResponse.json(
        { error: "Membership plan not found" },
        { status: 404 },
      );
    }

    // Calculate end date based on billing period
    const start = new Date(startDate);
    let endDate = null;
    if (plan.billing_period === "monthly") {
      endDate = new Date(start.setMonth(start.getMonth() + 1));
    } else if (plan.billing_period === "yearly") {
      endDate = new Date(start.setFullYear(start.getFullYear() + 1));
    }

    // Create membership
    const membershipData: any = {
      organization_id: user.organizationId,
      membership_plan_id: membershipPlanId,
      status: "active",
      start_date: startDate,
      end_date: endDate?.toISOString().split("T")[0],
      next_billing_date: endDate?.toISOString().split("T")[0],
      notes: notes || null,
      created_by: user.id,
    };

    if (isClient) {
      membershipData.client_id = customerId;
    } else {
      membershipData.customer_id = customerId;
    }

    const { data: membership, error } = await supabase
      .from("customer_memberships")
      .insert(membershipData)
      .select()
      .single();

    if (error) {
      console.error("Error creating membership:", error);
      return NextResponse.json(
        { error: error.message || "Failed to create membership" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, membership });
  } catch (error: any) {
    console.error("Error in POST /api/customer-memberships:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth();
    const supabase = createAdminClient();

    const url = new URL(request.url);
    const membershipId = url.searchParams.get("id");

    if (!membershipId) {
      return NextResponse.json(
        { error: "Missing membership ID" },
        { status: 400 },
      );
    }

    // Verify the membership belongs to the user's organization
    const { data: membership, error: fetchError } = await supabase
      .from("customer_memberships")
      .select("id, organization_id")
      .eq("id", membershipId)
      .eq("organization_id", user.organizationId)
      .single();

    if (fetchError || !membership) {
      return NextResponse.json(
        { error: "Membership not found or unauthorized" },
        { status: 404 },
      );
    }

    // Delete the membership
    const { error: deleteError } = await supabase
      .from("customer_memberships")
      .delete()
      .eq("id", membershipId)
      .eq("organization_id", user.organizationId);

    if (deleteError) {
      console.error("Error deleting membership:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete membership" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in DELETE /api/customer-memberships:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
