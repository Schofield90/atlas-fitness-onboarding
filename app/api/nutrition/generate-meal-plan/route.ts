import { NextRequest, NextResponse } from "next/server";
import { requireAuth, createErrorResponse } from "@/app/lib/api/auth-check";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

interface MealPlan {
  id: string;
  nutrition_profile_id: string;
  organization_id: string;
  name: string;
  description: string;
  duration_days: number;
  meals_per_day: number;
  daily_calories: number;
  daily_protein: number;
  daily_carbs: number;
  daily_fat: number;
  daily_fiber: number;
  meal_data: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

function generateSimpleMealPlan(profile: any): any {
  // Simple meal plan generation without AI
  const meals = [];
  const daysOfWeek = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

  for (let day = 0; day < 7; day++) {
    const dayMeals = {
      day: daysOfWeek[day],
      date: new Date(Date.now() + day * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      meals: [],
    };

    // Breakfast
    dayMeals.meals.push({
      type: "Breakfast",
      time: "7:00 AM",
      name: day % 2 === 0 ? "Protein Oatmeal Bowl" : "Scrambled Eggs & Toast",
      description:
        day % 2 === 0
          ? "Steel-cut oats with protein powder, berries, and almonds"
          : "3 eggs scrambled with vegetables, 2 slices whole grain toast",
      calories: Math.round(profile.target_calories * 0.25),
      protein: Math.round(profile.protein_grams * 0.25),
      carbs: Math.round(profile.carbs_grams * 0.25),
      fat: Math.round(profile.fat_grams * 0.25),
      ingredients:
        day % 2 === 0
          ? [
              "1 cup steel-cut oats",
              "1 scoop protein powder",
              "1/2 cup berries",
              "1 tbsp almonds",
            ]
          : [
              "3 large eggs",
              "1 cup mixed vegetables",
              "2 slices whole grain bread",
              "1 tsp butter",
            ],
    });

    // Snack 1
    dayMeals.meals.push({
      type: "Morning Snack",
      time: "10:00 AM",
      name: "Greek Yogurt with Nuts",
      description: "High-protein Greek yogurt with mixed nuts",
      calories: Math.round(profile.target_calories * 0.1),
      protein: Math.round(profile.protein_grams * 0.1),
      carbs: Math.round(profile.carbs_grams * 0.1),
      fat: Math.round(profile.fat_grams * 0.1),
      ingredients: ["1 cup Greek yogurt", "2 tbsp mixed nuts", "1 tsp honey"],
    });

    // Lunch
    dayMeals.meals.push({
      type: "Lunch",
      time: "12:30 PM",
      name:
        day % 3 === 0
          ? "Grilled Chicken Salad"
          : day % 3 === 1
            ? "Turkey Wrap"
            : "Salmon Bowl",
      description:
        day % 3 === 0
          ? "Grilled chicken breast with mixed greens and quinoa"
          : day % 3 === 1
            ? "Whole wheat wrap with turkey, veggies, and hummus"
            : "Baked salmon with brown rice and steamed vegetables",
      calories: Math.round(profile.target_calories * 0.3),
      protein: Math.round(profile.protein_grams * 0.3),
      carbs: Math.round(profile.carbs_grams * 0.3),
      fat: Math.round(profile.fat_grams * 0.3),
      ingredients:
        day % 3 === 0
          ? [
              "200g chicken breast",
              "2 cups mixed greens",
              "1/2 cup quinoa",
              "olive oil dressing",
            ]
          : day % 3 === 1
            ? [
                "1 whole wheat wrap",
                "150g turkey",
                "lettuce, tomato, cucumber",
                "2 tbsp hummus",
              ]
            : [
                "200g salmon",
                "1 cup brown rice",
                "2 cups mixed vegetables",
                "lemon",
              ],
    });

    // Snack 2
    dayMeals.meals.push({
      type: "Afternoon Snack",
      time: "3:30 PM",
      name: "Protein Shake",
      description: "Post-workout protein shake with banana",
      calories: Math.round(profile.target_calories * 0.1),
      protein: Math.round(profile.protein_grams * 0.15),
      carbs: Math.round(profile.carbs_grams * 0.1),
      fat: Math.round(profile.fat_grams * 0.05),
      ingredients: ["1 scoop protein powder", "1 banana", "1 cup almond milk"],
    });

    // Dinner
    dayMeals.meals.push({
      type: "Dinner",
      time: "7:00 PM",
      name: day % 2 === 0 ? "Lean Beef Stir-Fry" : "Grilled Fish & Vegetables",
      description:
        day % 2 === 0
          ? "Lean beef with mixed vegetables and rice noodles"
          : "Grilled white fish with roasted vegetables and sweet potato",
      calories: Math.round(profile.target_calories * 0.25),
      protein: Math.round(profile.protein_grams * 0.2),
      carbs: Math.round(profile.carbs_grams * 0.25),
      fat: Math.round(profile.fat_grams * 0.3),
      ingredients:
        day % 2 === 0
          ? [
              "200g lean beef",
              "2 cups mixed stir-fry vegetables",
              "100g rice noodles",
              "soy sauce",
            ]
          : [
              "200g white fish",
              "2 cups roasted vegetables",
              "1 medium sweet potato",
              "olive oil",
            ],
    });

    meals.push(dayMeals);
  }

  return {
    week_plan: meals,
    shopping_list: generateShoppingList(meals),
    meal_prep_tips: [
      "Prep vegetables on Sunday for the week",
      "Cook grains in bulk and store in containers",
      "Marinate proteins the night before",
      "Pre-portion snacks into containers",
    ],
  };
}

function generateShoppingList(meals: any[]): any {
  return {
    proteins: [
      "Chicken breast (1.4kg)",
      "Salmon fillets (600g)",
      "Lean beef (600g)",
      "Turkey slices (450g)",
      "Eggs (2 dozen)",
      "Greek yogurt (7 cups)",
      "Protein powder (14 scoops)",
    ],
    carbohydrates: [
      "Steel-cut oats (3.5 cups)",
      "Quinoa (1.5 cups)",
      "Brown rice (3 cups)",
      "Sweet potatoes (3 medium)",
      "Whole grain bread (1 loaf)",
      "Whole wheat wraps (3)",
      "Rice noodles (300g)",
    ],
    vegetables: [
      "Mixed salad greens (14 cups)",
      "Mixed vegetables (10 cups)",
      "Stir-fry vegetables (6 cups)",
      "Tomatoes (3)",
      "Cucumbers (2)",
      "Lettuce (1 head)",
    ],
    fruits: ["Berries (3.5 cups)", "Bananas (7)"],
    fats_and_oils: [
      "Almonds (7 tbsp)",
      "Mixed nuts (14 tbsp)",
      "Olive oil",
      "Butter",
    ],
    other: [
      "Almond milk (7 cups)",
      "Honey",
      "Hummus",
      "Soy sauce",
      "Lemon (3)",
    ],
  };
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication and get organization
    const userWithOrg = await requireAuth();

    // Get request body
    const body = await request.json();
    const { profileId } = body;

    if (!profileId) {
      return NextResponse.json(
        { error: "Nutrition profile ID is required" },
        { status: 400 },
      );
    }

    // Create Supabase client with service role
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const { createClient: createServiceClient } = await import(
      "@supabase/supabase-js"
    );
    const supabaseAdmin = createServiceClient(supabaseUrl, supabaseServiceKey);

    // Get the nutrition profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("nutrition_profiles")
      .select("*")
      .eq("id", profileId)
      .eq("organization_id", userWithOrg.organizationId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Nutrition profile not found" },
        { status: 404 },
      );
    }

    // Generate meal plan data (simple version for now)
    const mealPlanData = generateSimpleMealPlan(profile);

    // Check if there's already an active meal plan
    const { data: existingPlan } = await supabaseAdmin
      .from("meal_plans")
      .select("id")
      .eq("nutrition_profile_id", profileId)
      .eq("is_active", true)
      .single();

    if (existingPlan) {
      // Deactivate existing plan
      await supabaseAdmin
        .from("meal_plans")
        .update({ is_active: false })
        .eq("id", existingPlan.id);
    }

    // Create new meal plan
    const { data: newPlan, error: planError } = await supabaseAdmin
      .from("meal_plans")
      .insert({
        nutrition_profile_id: profileId,
        organization_id: userWithOrg.organizationId,
        name: "7-Day Nutrition Plan",
        description: `Personalized meal plan with ${profile.target_calories || profile.daily_calories} calories, ${profile.protein_grams || profile.target_protein}g protein`,
        duration_days: 7,
        meals_per_day: 5,
        daily_calories:
          profile.target_calories || profile.daily_calories || 2000,
        daily_protein: profile.protein_grams || profile.target_protein || 150,
        daily_carbs: profile.carbs_grams || profile.target_carbs || 250,
        daily_fat: profile.fat_grams || profile.target_fat || 65,
        daily_fiber: profile.fiber_grams || profile.target_fiber || 25,
        meal_data: mealPlanData,
        is_active: true,
      })
      .select()
      .single();

    if (planError) {
      console.error("Error creating meal plan:", planError);
      return NextResponse.json(
        { error: "Failed to create meal plan", details: planError },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: newPlan,
      message: "Meal plan generated successfully",
    });
  } catch (error) {
    console.error("Error in POST /api/nutrition/generate-meal-plan:", error);
    return createErrorResponse(error);
  }
}
