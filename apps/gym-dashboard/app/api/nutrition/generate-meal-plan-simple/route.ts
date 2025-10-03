import { NextRequest, NextResponse } from "next/server";
import { requireAuth, createErrorResponse } from "@/app/lib/api/auth-check";

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

// Set max duration for Vercel Pro plan
export const maxDuration = 60; // 60 seconds

// Simple meal plan generation without job queues
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const userWithOrg = await requireAuth();

    const {
      nutritionProfile,
      profileId,
      preferences,
      daysToGenerate = 7,
    } = await request.json();

    // Get profile if needed
    let profile = nutritionProfile;
    if (!profile && profileId) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
      const { createClient: createServiceClient } = await import(
        "@supabase/supabase-js"
      );
      const supabaseAdmin = createServiceClient(
        supabaseUrl,
        supabaseServiceKey,
      );

      const { data: fetchedProfile, error } = await supabaseAdmin
        .from("nutrition_profiles")
        .select("*")
        .eq("id", profileId)
        .single();

      if (error || !fetchedProfile) {
        return NextResponse.json(
          { success: false, error: "Nutrition profile not found" },
          { status: 404 },
        );
      }
      profile = fetchedProfile;
    }

    if (!profile) {
      return NextResponse.json(
        { success: false, error: "Nutrition profile is required" },
        { status: 400 },
      );
    }

    console.log("Generating simple meal plan for profile:", profile.id);

    try {
      // Import OpenAI generation function
      const { generateMealPlan } = await import("@/app/lib/openai");

      // Generate meal plan directly
      const mealPlanData = await generateMealPlan(
        profile,
        preferences,
        daysToGenerate,
      );

      // Save to database
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
      const { createClient: createServiceClient } = await import(
        "@supabase/supabase-js"
      );
      const supabaseAdmin = createServiceClient(
        supabaseUrl,
        supabaseServiceKey,
      );

      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + daysToGenerate);

      const { data: savedPlan, error: saveError } = await supabaseAdmin
        .from("meal_plans")
        .insert({
          profile_id: profile.id,
          client_id: profile.client_id,
          organization_id: userWithOrg.organizationId,
          name: `${daysToGenerate}-Day AI Meal Plan`,
          start_date: startDate.toISOString().split("T")[0],
          end_date: endDate.toISOString().split("T")[0],
          status: "active",
          duration_days: daysToGenerate,
          meals_per_day: 3,
          daily_calories: profile.target_calories,
          daily_protein: profile.protein_grams,
          daily_carbs: profile.carbs_grams,
          daily_fat: profile.fat_grams,
          total_calories: profile.target_calories * daysToGenerate,
          total_protein: profile.protein_grams * daysToGenerate,
          total_carbs: profile.carbs_grams * daysToGenerate,
          total_fat: profile.fat_grams * daysToGenerate,
          meal_data: mealPlanData.meal_plan,
          shopping_list: mealPlanData.shopping_list,
          meal_prep_tips: mealPlanData.meal_prep_tips,
          ai_model: "gpt-4-turbo-preview",
        })
        .select()
        .single();

      if (saveError) {
        console.error("Error saving meal plan:", saveError);
        // Return the generated plan even if saving fails
        return NextResponse.json({
          success: true,
          data: {
            meal_plan: mealPlanData.meal_plan,
            nutrition_totals: {
              calories: profile.target_calories * daysToGenerate,
              protein: profile.protein_grams * daysToGenerate,
              carbs: profile.carbs_grams * daysToGenerate,
              fat: profile.fat_grams * daysToGenerate,
            },
            shopping_list: mealPlanData.shopping_list,
            meal_prep_tips: mealPlanData.meal_prep_tips,
          },
        });
      }

      console.log("Meal plan generated and saved successfully");

      return NextResponse.json({
        success: true,
        data: {
          id: savedPlan.id,
          meal_plan: mealPlanData.meal_plan,
          nutrition_totals: {
            calories: profile.target_calories * daysToGenerate,
            protein: profile.protein_grams * daysToGenerate,
            carbs: profile.carbs_grams * daysToGenerate,
            fat: profile.fat_grams * daysToGenerate,
          },
          shopping_list: mealPlanData.shopping_list,
          meal_prep_tips: mealPlanData.meal_prep_tips,
        },
      });
    } catch (generationError: any) {
      console.error("Error generating meal plan:", generationError);

      // Return a more user-friendly error
      if (
        generationError.message?.includes("timeout") ||
        generationError.message?.includes("Gateway")
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Meal plan generation is taking longer than expected. Please try again with fewer days or simpler preferences.",
          },
          { status: 504 },
        );
      }

      return createErrorResponse(generationError);
    }
  } catch (error: any) {
    console.error("Error in meal plan generation:", error);
    return createErrorResponse(error);
  }
}
