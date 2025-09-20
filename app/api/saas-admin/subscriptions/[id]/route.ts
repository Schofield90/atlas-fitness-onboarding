import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import {
  UpdateSubscriptionRequest,
  ValidationError,
} from "@/app/lib/types/plans";

// Helper function to check admin authorization
async function checkAdminAuth(supabase: any) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { authorized: false, error: "Not authenticated" };
  }

  const authorizedEmails = ["sam@atlas-gyms.co.uk", "sam@gymleadhub.co.uk"];
  if (!authorizedEmails.includes(user.email?.toLowerCase() || "")) {
    return { authorized: false, error: "Not authorized for admin access" };
  }

  return { authorized: true, user };
}

// GET /api/saas-admin/subscriptions/[id] - Get single subscription
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await createClient();
    const authCheck = await checkAdminAuth(supabase);

    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: 401 });
    }

    const { data: subscription, error } = await supabase
      .from("saas_subscriptions")
      .select(
        `
        *,
        plan:saas_plans(*),
        organization:organizations(id, name, email)
      `,
      )
      .eq("id", params.id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Subscription not found" },
          { status: 404 },
        );
      }
      console.error("Error fetching subscription:", error);
      return NextResponse.json(
        { error: "Failed to fetch subscription" },
        { status: 500 },
      );
    }

    return NextResponse.json(subscription);
  } catch (error) {
    console.error(
      "Unexpected error in GET /api/saas-admin/subscriptions/[id]:",
      error,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// PATCH /api/saas-admin/subscriptions/[id] - Update subscription
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await createClient();
    const authCheck = await checkAdminAuth(supabase);

    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: 401 });
    }

    const body: Partial<UpdateSubscriptionRequest> = await request.json();

    // Check if subscription exists
    const { data: existingSubscription, error: fetchError } = await supabase
      .from("saas_subscriptions")
      .select(
        `
        *,
        plan:saas_plans(*),
        organization:organizations(id, name, email)
      `,
      )
      .eq("id", params.id)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Subscription not found" },
          { status: 404 },
        );
      }
      console.error("Error fetching subscription:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch subscription" },
        { status: 500 },
      );
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    // Handle plan change
    if (body.plan_id && body.plan_id !== existingSubscription.plan_id) {
      const { data: newPlan, error: planError } = await supabase
        .from("saas_plans")
        .select("*")
        .eq("id", body.plan_id)
        .eq("is_active", true)
        .single();

      if (planError || !newPlan) {
        return NextResponse.json(
          { error: "New plan not found or inactive" },
          { status: 404 },
        );
      }

      updateData.plan_id = body.plan_id;

      // Update pricing if billing cycle is also changing or keep current cycle
      const billingCycle =
        body.billing_cycle || existingSubscription.billing_cycle;
      updateData.amount =
        billingCycle === "yearly"
          ? newPlan.price_yearly
          : newPlan.price_monthly;
    }

    // Handle billing cycle change
    if (
      body.billing_cycle &&
      body.billing_cycle !== existingSubscription.billing_cycle
    ) {
      if (!["monthly", "yearly"].includes(body.billing_cycle)) {
        return NextResponse.json(
          { error: "Invalid billing cycle" },
          { status: 400 },
        );
      }

      updateData.billing_cycle = body.billing_cycle;

      // Get plan for pricing (either new plan or existing)
      const planId = body.plan_id || existingSubscription.plan_id;
      const { data: plan, error: planError } = await supabase
        .from("saas_plans")
        .select("*")
        .eq("id", planId)
        .single();

      if (planError || !plan) {
        return NextResponse.json(
          { error: "Plan not found for pricing calculation" },
          { status: 500 },
        );
      }

      updateData.amount =
        body.billing_cycle === "yearly"
          ? plan.price_yearly
          : plan.price_monthly;

      // Recalculate period end based on new cycle
      const currentPeriodStart = new Date(
        existingSubscription.current_period_start,
      );
      const newPeriodEnd = new Date(currentPeriodStart);

      if (body.billing_cycle === "yearly") {
        newPeriodEnd.setFullYear(newPeriodEnd.getFullYear() + 1);
      } else {
        newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);
      }

      updateData.current_period_end = newPeriodEnd.toISOString();
    }

    // Handle trial extension/modification
    if (body.trial_end) {
      const trialEndDate = new Date(body.trial_end);
      const now = new Date();

      if (trialEndDate <= now) {
        return NextResponse.json(
          { error: "Trial end date must be in the future" },
          { status: 400 },
        );
      }

      updateData.trial_end = trialEndDate.toISOString();

      // If extending trial, update status if currently active
      if (existingSubscription.status === "active") {
        updateData.status = "trialing";
      }
    }

    // Handle cancellation flags
    if (body.cancel_at_period_end !== undefined) {
      updateData.cancel_at_period_end = body.cancel_at_period_end;

      if (body.cancel_at_period_end) {
        updateData.canceled_at = new Date().toISOString();
      } else {
        updateData.canceled_at = null;
        // If reactivating, make sure status is appropriate
        if (existingSubscription.status === "canceled") {
          updateData.status = "active";
        }
      }
    }

    // Perform the update
    const { data: updatedSubscription, error: updateError } = await supabase
      .from("saas_subscriptions")
      .update(updateData)
      .eq("id", params.id)
      .select(
        `
        *,
        plan:saas_plans(*),
        organization:organizations(id, name, email)
      `,
      )
      .single();

    if (updateError) {
      console.error("Error updating subscription:", updateError);
      return NextResponse.json(
        { error: "Failed to update subscription" },
        { status: 500 },
      );
    }

    return NextResponse.json(updatedSubscription);
  } catch (error) {
    console.error(
      "Unexpected error in PATCH /api/saas-admin/subscriptions/[id]:",
      error,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// DELETE /api/saas-admin/subscriptions/[id] - Cancel/Delete subscription
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await createClient();
    const authCheck = await checkAdminAuth(supabase);

    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: 401 });
    }

    const url = new URL(request.url);
    const immediate = url.searchParams.get("immediate") === "true";

    // Check if subscription exists
    const { data: existingSubscription, error: fetchError } = await supabase
      .from("saas_subscriptions")
      .select("id, status, organization_id")
      .eq("id", params.id)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Subscription not found" },
          { status: 404 },
        );
      }
      console.error("Error fetching subscription:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch subscription" },
        { status: 500 },
      );
    }

    let updateData: any;

    if (immediate) {
      // Immediate cancellation
      updateData = {
        status: "canceled",
        canceled_at: new Date().toISOString(),
        cancel_at_period_end: false,
        current_period_end: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    } else {
      // Cancel at period end
      updateData = {
        cancel_at_period_end: true,
        canceled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }

    const { data: updatedSubscription, error: updateError } = await supabase
      .from("saas_subscriptions")
      .update(updateData)
      .eq("id", params.id)
      .select(
        `
        *,
        plan:saas_plans(*),
        organization:organizations(id, name, email)
      `,
      )
      .single();

    if (updateError) {
      console.error("Error canceling subscription:", updateError);
      return NextResponse.json(
        { error: "Failed to cancel subscription" },
        { status: 500 },
      );
    }

    const message = immediate
      ? "Subscription canceled immediately"
      : "Subscription scheduled for cancellation at period end";

    return NextResponse.json({
      message,
      subscription: updatedSubscription,
    });
  } catch (error) {
    console.error(
      "Unexpected error in DELETE /api/saas-admin/subscriptions/[id]:",
      error,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
