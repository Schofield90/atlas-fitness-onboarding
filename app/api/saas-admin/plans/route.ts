import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import {
  SaasPlan,
  CreatePlanRequest,
  PlansResponse,
  PlanError,
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
    console.error("Auth check failed:", error);
    return { authorized: false, error: "Not authenticated" };
  }

  console.log("Checking admin auth for user:", user.email);

  const authorizedEmails = ["sam@gymleadhub.co.uk"];
  if (!authorizedEmails.includes(user.email?.toLowerCase() || "")) {
    console.error("User not authorized:", user.email);
    return { authorized: false, error: "Not authorized for admin access" };
  }

  return { authorized: true, user };
}

// Validate plan data
function validatePlanData(data: Partial<CreatePlanRequest>): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!data.name || data.name.trim().length === 0) {
    errors.push({
      field: "name",
      message: "Plan name is required",
      code: "REQUIRED",
    });
  }

  if (!data.slug || data.slug.trim().length === 0) {
    errors.push({
      field: "slug",
      message: "Plan slug is required",
      code: "REQUIRED",
    });
  } else if (!/^[a-z0-9-]+$/.test(data.slug)) {
    errors.push({
      field: "slug",
      message: "Slug can only contain lowercase letters, numbers, and hyphens",
      code: "INVALID_FORMAT",
    });
  }

  if (data.price_monthly === undefined || data.price_monthly < 0) {
    errors.push({
      field: "price_monthly",
      message: "Monthly price must be a positive number",
      code: "INVALID_VALUE",
    });
  }

  if (data.price_yearly === undefined || data.price_yearly < 0) {
    errors.push({
      field: "price_yearly",
      message: "Yearly price must be a positive number",
      code: "INVALID_VALUE",
    });
  }

  if (!data.tier) {
    errors.push({
      field: "tier",
      message: "Plan tier is required",
      code: "REQUIRED",
    });
  }

  return errors;
}

// GET /api/saas-admin/plans - List all plans
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const authCheck = await checkAdminAuth(supabase);

    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: 401 });
    }

    const url = new URL(request.url);
    const active = url.searchParams.get("active");
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    let query = supabase
      .from("saas_plans")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (active !== null) {
      query = query.eq("is_active", active === "true");
    }

    const { data: plans, error, count } = await query;

    if (error) {
      console.error("Error fetching plans:", error);
      return NextResponse.json(
        { error: "Failed to fetch plans" },
        { status: 500 },
      );
    }

    const response: PlansResponse = {
      plans: plans || [],
      total: count || 0,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Unexpected error in GET /api/saas-admin/plans:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST /api/saas-admin/plans - Create new plan
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const authCheck = await checkAdminAuth(supabase);

    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: 401 });
    }

    const body: CreatePlanRequest = await request.json();

    // Validate input
    const validationErrors = validatePlanData(body);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: "Validation failed", details: validationErrors },
        { status: 400 },
      );
    }

    // Check for slug uniqueness
    const { data: existingPlan } = await supabase
      .from("saas_plans")
      .select("id")
      .eq("slug", body.slug)
      .single();

    if (existingPlan) {
      return NextResponse.json(
        { error: "A plan with this slug already exists" },
        { status: 409 },
      );
    }

    // Set default values
    const planData = {
      name: body.name.trim(),
      slug: body.slug.trim(),
      description: body.description?.trim() || null,
      tier: body.tier,
      price_monthly: body.price_monthly,
      price_yearly: body.price_yearly,
      price_setup: body.price_setup || null,
      features: body.features || {},
      limits: body.limits || {},
      config: body.config || {
        trial_days: 14,
        requires_setup_call: false,
        priority_support: false,
        dedicated_success_manager: false,
      },
      is_active: true,
      is_popular: body.is_popular || false,
      is_hidden: false,
      sort_order: body.sort_order || 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: newPlan, error } = await supabase
      .from("saas_plans")
      .insert([planData])
      .select()
      .single();

    if (error) {
      console.error("Error creating plan:", error);
      return NextResponse.json(
        { error: "Failed to create plan" },
        { status: 500 },
      );
    }

    return NextResponse.json(newPlan, { status: 201 });
  } catch (error) {
    console.error("Unexpected error in POST /api/saas-admin/plans:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// PUT /api/saas-admin/plans - Bulk update plans (reorder, bulk actions)
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const authCheck = await checkAdminAuth(supabase);

    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: 401 });
    }

    const body = await request.json();
    const { action, plan_ids, updates } = body;

    if (action === "reorder" && Array.isArray(plan_ids)) {
      // Reorder plans by updating sort_order
      const updatePromises = plan_ids.map((planId: string, index: number) =>
        supabase
          .from("saas_plans")
          .update({ sort_order: index, updated_at: new Date().toISOString() })
          .eq("id", planId),
      );

      await Promise.all(updatePromises);

      return NextResponse.json({ message: "Plans reordered successfully" });
    }

    if (action === "bulk_update" && Array.isArray(plan_ids) && updates) {
      // Bulk update multiple plans
      const { error } = await supabase
        .from("saas_plans")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .in("id", plan_ids);

      if (error) {
        console.error("Error bulk updating plans:", error);
        return NextResponse.json(
          { error: "Failed to bulk update plans" },
          { status: 500 },
        );
      }

      return NextResponse.json({ message: "Plans updated successfully" });
    }

    return NextResponse.json(
      { error: "Invalid action or parameters" },
      { status: 400 },
    );
  } catch (error) {
    console.error("Unexpected error in PUT /api/saas-admin/plans:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
