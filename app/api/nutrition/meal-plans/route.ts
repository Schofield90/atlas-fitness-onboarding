import { NextRequest, NextResponse } from "next/server";
import { requireAuth, createErrorResponse } from "@/app/lib/api/auth-check";

export async function GET(request: NextRequest) {
  try {
    // Check authentication and get organization
    const userWithOrg = await requireAuth();

    // Get profileId from query params
    const searchParams = request.nextUrl.searchParams;
    const profileId = searchParams.get("profileId");

    if (!profileId) {
      return NextResponse.json(
        { error: "Profile ID is required" },
        { status: 400 },
      );
    }

    // Create Supabase client with service role to bypass RLS
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const { createClient: createServiceClient } = await import(
      "@supabase/supabase-js"
    );
    const supabaseAdmin = createServiceClient(supabaseUrl, supabaseServiceKey);

    // Get active meal plan for the profile
    console.log("Fetching meal plan for profile:", profileId);

    const { data: mealPlan, error } = await supabaseAdmin
      .from("meal_plans")
      .select("*")
      .eq("profile_id", profileId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = not found
      console.error("Error fetching meal plan:", {
        error: error.message,
        code: error.code,
        profile_id: profileId,
      });
      return createErrorResponse(error, 500);
    }

    // If no meal plan exists, return null
    if (!mealPlan) {
      return NextResponse.json({
        success: true,
        data: null,
      });
    }

    console.log("Found active meal plan:", mealPlan.id);

    return NextResponse.json({
      success: true,
      data: mealPlan,
    });
  } catch (error) {
    console.error("Error in GET /api/nutrition/meal-plans:", error);
    return createErrorResponse(error);
  }
}
