import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/app/lib/api/auth-check";
import { createAdminClient } from "@/app/lib/supabase/admin";

export async function GET(request: NextRequest) {
  try {
    const { user, organizationId, error: authError } = await requireAuth();

    if (authError || !user || !organizationId) {
      return NextResponse.json(
        { error: authError || "Unauthorized" },
        { status: 401 }
      );
    }

    const supabaseAdmin = createAdminClient();

    // Fetch active members with their membership details
    const { data: members, error } = await supabaseAdmin
      .from("customer_memberships")
      .select(
        `
        id,
        client_id,
        membership_plan_id,
        status,
        start_date,
        end_date,
        next_billing_date,
        clients!inner (
          id,
          first_name,
          last_name,
          email,
          status
        ),
        membership_plans!inner (
          id,
          name,
          price_pennies,
          billing_period,
          category_id,
          membership_categories (
            id,
            name
          )
        )
      `
      )
      .eq("clients.org_id", organizationId)
      .in("status", ["active", "paused"])
      .order("start_date", { ascending: false });

    if (error) {
      console.error("Error fetching active members:", error);
      return NextResponse.json(
        { error: "Failed to fetch active members" },
        { status: 500 }
      );
    }

    // Transform the data for easier consumption
    const transformedMembers = (members || []).map((membership: any) => ({
      id: membership.id,
      client_id: membership.client_id,
      first_name: membership.clients.first_name,
      last_name: membership.clients.last_name,
      email: membership.clients.email,
      client_status: membership.clients.status,
      membership_status: membership.status,
      plan_id: membership.membership_plan_id,
      plan_name: membership.membership_plans.name,
      price_pennies: membership.membership_plans.price_pennies,
      billing_period: membership.membership_plans.billing_period,
      category_id: membership.membership_plans.category_id,
      category_name: membership.membership_plans.membership_categories?.name || null,
      start_date: membership.start_date,
      end_date: membership.end_date,
      next_billing_date: membership.next_billing_date,
    }));

    return NextResponse.json({
      success: true,
      members: transformedMembers,
      count: transformedMembers.length,
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
