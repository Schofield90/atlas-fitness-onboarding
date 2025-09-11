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

    // Get all active meal plans for the profile
    console.log("Fetching meal plans for profile:", profileId);

    // Use correct column names from 20250910_create_meal_plans_table.sql schema
    // Try to order by date if it exists, otherwise by created_at
    const { data: mealPlans, error } = await supabaseAdmin
      .from("meal_plans")
      .select("*")
      .eq("nutrition_profile_id", profileId)
      .eq("is_active", true)
      .order("created_at", { ascending: false }); // Order by created_at for now

    if (error) {
      console.error("Error fetching meal plans:", {
        error: error.message,
        code: error.code,
        profile_id: profileId,
      });
      return createErrorResponse(error, 500);
    }

    // If no meal plans exist, return empty array
    if (!mealPlans || mealPlans.length === 0) {
      console.log("No meal plans found for profile:", profileId);
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    console.log(
      `Found ${mealPlans.length} active meal plans for profile:`,
      profileId,
    );

    // Transform the meal plans to ensure they have the date field from either date column or meal_data
    const transformedPlans = mealPlans.map((plan) => {
      // Use the date column if available, otherwise try to extract from meal_data or start_date
      const planDate = plan.date || plan.meal_data?.date || plan.start_date;
      return {
        ...plan,
        date: planDate,
        meal_data: {
          ...plan.meal_data,
          date: planDate, // Ensure date is in meal_data for backward compatibility
        },
      };
    });

    return NextResponse.json({
      success: true,
      data: transformedPlans,
    });
  } catch (error) {
    console.error("Error in GET /api/nutrition/meal-plans:", error);
    return createErrorResponse(error);
  }
}
