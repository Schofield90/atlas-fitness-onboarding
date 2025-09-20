import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { UpdatePlanRequest, ValidationError } from "@/app/lib/types/plans";

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

// Validate plan update data
function validatePlanUpdateData(
  data: Partial<UpdatePlanRequest>,
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (
    data.name !== undefined &&
    (!data.name || data.name.trim().length === 0)
  ) {
    errors.push({
      field: "name",
      message: "Plan name cannot be empty",
      code: "REQUIRED",
    });
  }

  if (data.slug !== undefined) {
    if (!data.slug || data.slug.trim().length === 0) {
      errors.push({
        field: "slug",
        message: "Plan slug cannot be empty",
        code: "REQUIRED",
      });
    } else if (!/^[a-z0-9-]+$/.test(data.slug)) {
      errors.push({
        field: "slug",
        message:
          "Slug can only contain lowercase letters, numbers, and hyphens",
        code: "INVALID_FORMAT",
      });
    }
  }

  if (data.price_monthly !== undefined && data.price_monthly < 0) {
    errors.push({
      field: "price_monthly",
      message: "Monthly price must be a positive number",
      code: "INVALID_VALUE",
    });
  }

  if (data.price_yearly !== undefined && data.price_yearly < 0) {
    errors.push({
      field: "price_yearly",
      message: "Yearly price must be a positive number",
      code: "INVALID_VALUE",
    });
  }

  return errors;
}

// GET /api/saas-admin/plans/[id] - Get single plan
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

    const { data: plan, error } = await supabase
      .from("saas_plans")
      .select("*")
      .eq("id", params.id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Plan not found" }, { status: 404 });
      }
      console.error("Error fetching plan:", error);
      return NextResponse.json(
        { error: "Failed to fetch plan" },
        { status: 500 },
      );
    }

    return NextResponse.json(plan);
  } catch (error) {
    console.error("Unexpected error in GET /api/saas-admin/plans/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// PATCH /api/saas-admin/plans/[id] - Update plan
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

    const body: Partial<UpdatePlanRequest> = await request.json();

    // Validate input
    const validationErrors = validatePlanUpdateData(body);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: "Validation failed", details: validationErrors },
        { status: 400 },
      );
    }

    // Check if plan exists
    const { data: existingPlan, error: fetchError } = await supabase
      .from("saas_plans")
      .select("id, slug")
      .eq("id", params.id)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return NextResponse.json({ error: "Plan not found" }, { status: 404 });
      }
      console.error("Error fetching plan:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch plan" },
        { status: 500 },
      );
    }

    // Check for slug uniqueness if slug is being updated
    if (body.slug && body.slug !== existingPlan.slug) {
      const { data: duplicatePlan } = await supabase
        .from("saas_plans")
        .select("id")
        .eq("slug", body.slug)
        .neq("id", params.id)
        .single();

      if (duplicatePlan) {
        return NextResponse.json(
          { error: "A plan with this slug already exists" },
          { status: 409 },
        );
      }
    }

    // Check if plan has active subscriptions before making certain changes
    if (body.is_active === false) {
      const { data: activeSubscriptions, error: subError } = await supabase
        .from("saas_subscriptions")
        .select("id")
        .eq("plan_id", params.id)
        .in("status", ["active", "trialing"])
        .limit(1);

      if (subError) {
        console.error("Error checking subscriptions:", subError);
        return NextResponse.json(
          { error: "Failed to check plan subscriptions" },
          { status: 500 },
        );
      }

      if (activeSubscriptions && activeSubscriptions.length > 0) {
        return NextResponse.json(
          { error: "Cannot deactivate plan with active subscriptions" },
          { status: 400 },
        );
      }
    }

    // Prepare update data
    const updateData = {
      ...body,
      updated_at: new Date().toISOString(),
    };

    // Remove id from update data if present
    delete updateData.id;

    const { data: updatedPlan, error: updateError } = await supabase
      .from("saas_plans")
      .update(updateData)
      .eq("id", params.id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating plan:", updateError);
      return NextResponse.json(
        { error: "Failed to update plan" },
        { status: 500 },
      );
    }

    return NextResponse.json(updatedPlan);
  } catch (error) {
    console.error(
      "Unexpected error in PATCH /api/saas-admin/plans/[id]:",
      error,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// DELETE /api/saas-admin/plans/[id] - Delete plan
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

    // Check if plan exists
    const { data: existingPlan, error: fetchError } = await supabase
      .from("saas_plans")
      .select("id, name")
      .eq("id", params.id)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return NextResponse.json({ error: "Plan not found" }, { status: 404 });
      }
      console.error("Error fetching plan:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch plan" },
        { status: 500 },
      );
    }

    // Check if plan has any subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from("saas_subscriptions")
      .select("id")
      .eq("plan_id", params.id)
      .limit(1);

    if (subError) {
      console.error("Error checking subscriptions:", subError);
      return NextResponse.json(
        { error: "Failed to check plan subscriptions" },
        { status: 500 },
      );
    }

    if (subscriptions && subscriptions.length > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot delete plan with existing subscriptions. Deactivate it instead.",
        },
        { status: 400 },
      );
    }

    // Delete the plan
    const { error: deleteError } = await supabase
      .from("saas_plans")
      .delete()
      .eq("id", params.id);

    if (deleteError) {
      console.error("Error deleting plan:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete plan" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      message: `Plan "${existingPlan.name}" deleted successfully`,
    });
  } catch (error) {
    console.error(
      "Unexpected error in DELETE /api/saas-admin/plans/[id]:",
      error,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
