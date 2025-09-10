import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { generateMealPlan } from "@/app/lib/openai";

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

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
      preferences,
      daysToGenerate = 7,
    } = await request.json();

    if (!nutritionProfile) {
      return NextResponse.json(
        { success: false, error: "Nutrition profile is required" },
        { status: 400 },
      );
    }

    // Generate meal plan using OpenAI
    console.log("Generating meal plan for:", nutritionProfile);
    const mealPlanData = await generateMealPlan(
      nutritionProfile,
      preferences,
      daysToGenerate,
    );

    // Save meal plan to database (for now, we'll return it directly)
    // In production, you would save this to the meal_plans and meal_plan_meals tables

    // Transform the meal plan data into the format expected by the database
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + daysToGenerate);

    const mealPlan = {
      id: crypto.randomUUID(),
      profile_id: nutritionProfile.id,
      client_id: nutritionProfile.client_id,
      organization_id: nutritionProfile.organization_id,
      name: `${daysToGenerate}-Day Meal Plan`,
      start_date: startDate.toISOString().split("T")[0],
      end_date: endDate.toISOString().split("T")[0],
      status: "active",
      total_calories: nutritionProfile.target_calories * daysToGenerate,
      total_protein: nutritionProfile.protein_grams * daysToGenerate,
      total_carbs: nutritionProfile.carbs_grams * daysToGenerate,
      total_fat: nutritionProfile.fat_grams * daysToGenerate,
      ai_model: "gpt-4-turbo-preview",
      generation_params: {
        daysToGenerate,
        preferences,
      },
      meal_data: mealPlanData.meal_plan,
      shopping_list: mealPlanData.shopping_list,
      meal_prep_tips: mealPlanData.meal_prep_tips,
      created_at: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: mealPlan,
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
