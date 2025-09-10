import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { generateMealPlan } from "@/app/lib/openai";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const {
      nutritionProfile,
      profileId,
      preferences,
      daysToGenerate = 7,
    } = await request.json();

    // Support both nutritionProfile object or profileId
    let profile = nutritionProfile;

    if (!profile && profileId) {
      // Fetch the profile if only ID was provided
      const { data: fetchedProfile, error: profileError } = await supabase
        .from("nutrition_profiles")
        .select("*")
        .eq("id", profileId)
        .single();

      if (profileError || !fetchedProfile) {
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

    // Generate meal plan using OpenAI with timeout
    console.log("Generating AI meal plan for:", profile);

    // Generate meal plan with longer timeout for Vercel (max 60s for Pro)
    let mealPlanData;
    try {
      // Set a timeout slightly below Vercel's limit
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Meal plan generation timeout")),
          55000, // 55 seconds (below Vercel's 60s limit)
        ),
      );

      // Race between the actual API call and timeout
      mealPlanData = await Promise.race([
        generateMealPlan(profile, preferences, daysToGenerate),
        timeoutPromise,
      ]);

      if (!mealPlanData || !mealPlanData.meal_plan) {
        throw new Error("Invalid meal plan data generated");
      }
    } catch (error: any) {
      console.error("Meal plan generation error:", error.message);

      // Check if it's a timeout or other error
      const isTimeout = error.message.includes("timeout");

      return NextResponse.json(
        {
          success: false,
          error: isTimeout
            ? "Meal plan generation is taking longer than expected. Please try again with fewer days."
            : "Failed to generate meal plan. Please try again.",
          details: isTimeout
            ? `Try generating ${Math.max(1, Math.floor(daysToGenerate / 2))} days instead of ${daysToGenerate} days.`
            : error.message,
        },
        { status: 503 },
      );
    }

    // Transform the meal plan data into the format expected by the database
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + daysToGenerate);

    const mealPlan = {
      id: crypto.randomUUID(),
      profile_id: profile.id,
      client_id: profile.client_id,
      organization_id: profile.organization_id,
      name: `${daysToGenerate}-Day AI Meal Plan`,
      description: `Personalized meal plan with ${profile.target_calories} calories, ${profile.protein_grams}g protein`,
      start_date: startDate.toISOString().split("T")[0],
      end_date: endDate.toISOString().split("T")[0],
      status: "active", // Using status instead of is_active
      duration_days: daysToGenerate,
      meals_per_day: profile.meals_per_day || 3,
      // Daily totals
      daily_calories: profile.target_calories,
      daily_protein: profile.protein_grams,
      daily_carbs: profile.carbs_grams,
      daily_fat: profile.fat_grams,
      daily_fiber: profile.fiber_grams || 25,
      // Aggregate totals
      total_calories: profile.target_calories * daysToGenerate,
      total_protein: profile.protein_grams * daysToGenerate,
      total_carbs: profile.carbs_grams * daysToGenerate,
      total_fat: profile.fat_grams * daysToGenerate,
      // AI metadata
      ai_model: "gpt-3.5-turbo",
      generation_params: {
        daysToGenerate,
        preferences,
      },
      // Meal data - support both formats
      meal_data: {
        ...mealPlanData.meal_plan,
        week_plan: Object.entries(mealPlanData.meal_plan || {}).map(
          ([key, dayData]: [string, any]) => ({
            day: key.replace("day_", "Day "),
            ...dayData,
          }),
        ),
        shopping_list: mealPlanData.shopping_list,
        meal_prep_tips: mealPlanData.meal_prep_tips,
      },
      shopping_list: mealPlanData.shopping_list,
      meal_prep_tips: mealPlanData.meal_prep_tips,
      created_at: new Date().toISOString(),
    };

    // Check if there's already an active meal plan and deactivate it
    const { data: existingPlan } = await supabase
      .from("meal_plans")
      .select("id")
      .eq("profile_id", profile.id)
      .eq("status", "active")
      .single();

    if (existingPlan) {
      await supabase
        .from("meal_plans")
        .update({ status: "archived" })
        .eq("id", existingPlan.id);
    }

    // Save the new meal plan to database
    const { data: newPlan, error: planError } = await supabase
      .from("meal_plans")
      .insert(mealPlan)
      .select()
      .single();

    if (planError) {
      console.error("Error saving meal plan:", planError);
      // Return the generated plan even if save fails
      return NextResponse.json({
        success: true,
        data: mealPlan,
        warning: "Meal plan generated but not saved to database",
      });
    }

    return NextResponse.json({
      success: true,
      data: newPlan || mealPlan,
      message: "AI meal plan generated successfully",
    });
  } catch (error: any) {
    console.error("Error generating meal plan:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to generate meal plan",
      },
      { status: 500 },
    );
  }
}
