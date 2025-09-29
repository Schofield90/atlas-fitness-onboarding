import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/app/lib/api/auth-check";
import { createClient } from "@supabase/supabase-js";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const userWithOrg = await requireAuth();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get the profile ID from query params
    const searchParams = request.nextUrl.searchParams;
    const profileId = searchParams.get("profileId");

    // Get client info
    const { data: client } = await supabaseAdmin
      .from("clients")
      .select("*")
      .eq("user_id", userWithOrg.id)
      .single();

    // Get nutrition profile
    const { data: nutritionProfile } = await supabaseAdmin
      .from("nutrition_profiles")
      .select("*")
      .eq("client_id", client?.id)
      .single();

    // Query meal plans with all possible column variations
    let query = supabaseAdmin.from("meal_plans").select("*");

    if (profileId) {
      // Try profile_id first, then nutrition_profile_id
      const { data: plansByProfileId } = await supabaseAdmin
        .from("meal_plans")
        .select("*")
        .eq("profile_id", profileId);

      const { data: plansByNutritionProfileId } = await supabaseAdmin
        .from("meal_plans")
        .select("*")
        .eq("nutrition_profile_id", profileId);

      return NextResponse.json({
        success: true,
        debug: {
          user_id: userWithOrg.id,
          client_id: client?.id,
          nutrition_profile_id: nutritionProfile?.id,
          provided_profile_id: profileId,
          plans_by_profile_id: plansByProfileId?.length || 0,
          plans_by_nutrition_profile_id: plansByNutritionProfileId?.length || 0,
          sample_plan_profile_id: plansByProfileId?.[0] || null,
          sample_plan_nutrition_profile_id:
            plansByNutritionProfileId?.[0] || null,
        },
      });
    }

    // Get all meal plans for this organization
    const { data: allPlans } = await supabaseAdmin
      .from("meal_plans")
      .select("*")
      .eq("organization_id", userWithOrg.organizationId)
      .limit(10);

    return NextResponse.json({
      success: true,
      debug: {
        user_id: userWithOrg.id,
        organization_id: userWithOrg.organizationId,
        client_id: client?.id,
        nutrition_profile_id: nutritionProfile?.id,
        total_plans_in_org: allPlans?.length || 0,
        sample_plan: allPlans?.[0] || null,
        all_plans_summary: allPlans?.map((p) => ({
          id: p.id,
          profile_id: p.profile_id,
          nutrition_profile_id: p.nutrition_profile_id,
          client_id: p.client_id,
          start_date: p.start_date,
          status: p.status,
          is_active: p.is_active,
          created_at: p.created_at,
        })),
      },
    });
  } catch (error) {
    console.error("Debug error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
