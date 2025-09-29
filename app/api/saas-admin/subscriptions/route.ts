import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import {
  SaasSubscription,
  CreateSubscriptionRequest,
  SubscriptionsResponse,
  ValidationError,
} from "@/app/lib/types/plans";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

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

// Validate subscription data
function validateSubscriptionData(
  data: Partial<CreateSubscriptionRequest>,
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!data.organization_id) {
    errors.push({
      field: "organization_id",
      message: "Organization ID is required",
      code: "REQUIRED",
    });
  }

  if (!data.plan_id) {
    errors.push({
      field: "plan_id",
      message: "Plan ID is required",
      code: "REQUIRED",
    });
  }

  if (
    !data.billing_cycle ||
    !["monthly", "yearly"].includes(data.billing_cycle)
  ) {
    errors.push({
      field: "billing_cycle",
      message: "Billing cycle must be monthly or yearly",
      code: "INVALID_VALUE",
    });
  }

  if (
    data.trial_days !== undefined &&
    (data.trial_days < 0 || data.trial_days > 365)
  ) {
    errors.push({
      field: "trial_days",
      message: "Trial days must be between 0 and 365",
      code: "INVALID_VALUE",
    });
  }

  return errors;
}

// GET /api/saas-admin/subscriptions - List all subscriptions
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const authCheck = await checkAdminAuth(supabase);

    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: 401 });
    }

    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const organizationId = url.searchParams.get("organization_id");
    const planId = url.searchParams.get("plan_id");
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    let query = supabase
      .from("saas_subscriptions")
      .select(
        `
        *,
        plan:saas_plans(*),
        organization:organizations(id, name, email)
      `,
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq("status", status);
    }

    if (organizationId) {
      query = query.eq("organization_id", organizationId);
    }

    if (planId) {
      query = query.eq("plan_id", planId);
    }

    const { data: subscriptions, error, count } = await query;

    if (error) {
      console.error("Error fetching subscriptions:", error);
      return NextResponse.json(
        { error: "Failed to fetch subscriptions" },
        { status: 500 },
      );
    }

    const response: SubscriptionsResponse = {
      subscriptions: subscriptions || [],
      total: count || 0,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error(
      "Unexpected error in GET /api/saas-admin/subscriptions:",
      error,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST /api/saas-admin/subscriptions - Create new subscription
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const authCheck = await checkAdminAuth(supabase);

    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: 401 });
    }

    const body: CreateSubscriptionRequest = await request.json();

    // Validate input
    const validationErrors = validateSubscriptionData(body);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: "Validation failed", details: validationErrors },
        { status: 400 },
      );
    }

    // Check if organization exists
    const { data: organization, error: orgError } = await supabase
      .from("organizations")
      .select("id, name")
      .eq("id", body.organization_id)
      .single();

    if (orgError || !organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 },
      );
    }

    // Check if plan exists
    const { data: plan, error: planError } = await supabase
      .from("saas_plans")
      .select("*")
      .eq("id", body.plan_id)
      .eq("is_active", true)
      .single();

    if (planError || !plan) {
      return NextResponse.json(
        { error: "Plan not found or inactive" },
        { status: 404 },
      );
    }

    // Check for existing subscription
    const { data: existingSubscription } = await supabase
      .from("saas_subscriptions")
      .select("id, status")
      .eq("organization_id", body.organization_id)
      .in("status", ["active", "trialing", "past_due"])
      .single();

    if (existingSubscription) {
      return NextResponse.json(
        { error: "Organization already has an active subscription" },
        { status: 409 },
      );
    }

    // Calculate pricing based on billing cycle
    const amount =
      body.billing_cycle === "yearly" ? plan.price_yearly : plan.price_monthly;

    // Calculate trial and billing periods
    const now = new Date();
    const trialDays = body.trial_days || plan.config?.trial_days || 0;
    const trialEnd =
      trialDays > 0
        ? new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000)
        : null;

    const currentPeriodStart = trialEnd ? trialEnd : now;
    const currentPeriodEnd = new Date(currentPeriodStart);
    if (body.billing_cycle === "yearly") {
      currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1);
    } else {
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
    }

    // Create subscription
    const subscriptionData = {
      organization_id: body.organization_id,
      plan_id: body.plan_id,
      status: trialEnd ? "trialing" : "active",
      billing_cycle: body.billing_cycle,
      current_period_start: currentPeriodStart.toISOString(),
      current_period_end: currentPeriodEnd.toISOString(),
      trial_start: trialEnd ? now.toISOString() : null,
      trial_end: trialEnd ? trialEnd.toISOString() : null,
      amount: amount,
      currency: "GBP",
      cancel_at_period_end: false,
      usage_updated_at: now.toISOString(),
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };

    const { data: newSubscription, error } = await supabase
      .from("saas_subscriptions")
      .insert([subscriptionData])
      .select(
        `
        *,
        plan:saas_plans(*),
        organization:organizations(id, name, email)
      `,
      )
      .single();

    if (error) {
      console.error("Error creating subscription:", error);
      return NextResponse.json(
        { error: "Failed to create subscription" },
        { status: 500 },
      );
    }

    return NextResponse.json(newSubscription, { status: 201 });
  } catch (error) {
    console.error(
      "Unexpected error in POST /api/saas-admin/subscriptions:",
      error,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// PATCH /api/saas-admin/subscriptions - Bulk update subscriptions
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const authCheck = await checkAdminAuth(supabase);

    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: 401 });
    }

    const body = await request.json();
    const { action, subscription_ids, updates } = body;

    if (
      !action ||
      !Array.isArray(subscription_ids) ||
      subscription_ids.length === 0
    ) {
      return NextResponse.json(
        { error: "Invalid action or subscription IDs" },
        { status: 400 },
      );
    }

    let updateData: any = { updated_at: new Date().toISOString() };

    switch (action) {
      case "cancel":
        updateData.status = "canceled";
        updateData.canceled_at = new Date().toISOString();
        updateData.cancel_at_period_end = false;
        break;

      case "reactivate":
        updateData.status = "active";
        updateData.canceled_at = null;
        updateData.cancel_at_period_end = false;
        break;

      case "suspend":
        updateData.status = "past_due";
        break;

      case "custom":
        if (!updates) {
          return NextResponse.json(
            { error: "Updates object required for custom action" },
            { status: 400 },
          );
        }
        updateData = { ...updateData, ...updates };
        break;

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const { data: updatedSubscriptions, error } = await supabase
      .from("saas_subscriptions")
      .update(updateData)
      .in("id", subscription_ids).select(`
        *,
        plan:saas_plans(*),
        organization:organizations(id, name, email)
      `);

    if (error) {
      console.error("Error bulk updating subscriptions:", error);
      return NextResponse.json(
        { error: "Failed to update subscriptions" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      message: `${subscription_ids.length} subscription(s) updated successfully`,
      subscriptions: updatedSubscriptions,
    });
  } catch (error) {
    console.error(
      "Unexpected error in PATCH /api/saas-admin/subscriptions:",
      error,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
