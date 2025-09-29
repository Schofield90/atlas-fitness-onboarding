import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { requireAuth, createErrorResponse } from "@/app/lib/api/auth-check";
import OpenAI from "openai";

// Lazy load OpenAI client to avoid browser environment errors during build
let openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
}

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    // Check authentication and get organization
    const userWithOrg = await requireAuth();

    // Create Supabase client
    const supabase = await createClient();

    const mealId = params.id;
    const body = await request.json();
    const { constraints } = body;

    // Get existing meal with its meal plan and user profile
    const { data: existingMeal, error: mealError } = await supabase
      .from("nutrition_meals")
      .select(
        `
        *,
        nutrition_ingredients (*),
        nutrition_meal_plans!inner (
          id,
          user_id,
          organization_id,
          target_calories,
          target_protein,
          target_carbs,
          target_fat,
          target_fiber
        )
      `,
      )
      .eq("id", mealId)
      .eq("nutrition_meal_plans.user_id", userWithOrg.id)
      .eq("nutrition_meal_plans.organization_id", userWithOrg.organizationId)
      .single();

    if (mealError || !existingMeal) {
      return NextResponse.json(
        { error: "Meal not found or access denied" },
        { status: 404 },
      );
    }

    // Get user's nutrition profile for preferences
    const { data: profile, error: profileError } = await supabase
      .from("nutrition_profiles")
      .select("*")
      .eq("user_id", userWithOrg.id)
      .eq("organization_id", userWithOrg.organizationId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Nutrition profile not found" },
        { status: 404 },
      );
    }

    // Generate new meal using OpenAI
    const newMealData = await regenerateMeal(
      existingMeal,
      profile,
      constraints,
    );

    if (!newMealData) {
      return NextResponse.json(
        { error: "Failed to generate new meal" },
        { status: 500 },
      );
    }

    // Update the meal
    const { data: updatedMeal, error: updateError } = await supabase
      .from("nutrition_meals")
      .update({
        calories: newMealData.calories,
        protein: newMealData.protein,
        carbs: newMealData.carbs,
        fat: newMealData.fat,
        fiber: newMealData.fiber || 0,
        recipe: newMealData.recipe,
        prep_minutes: newMealData.prepMinutes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", mealId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating meal:", updateError);
      return createErrorResponse(updateError, 500);
    }

    // Delete old ingredients
    await supabase.from("nutrition_ingredients").delete().eq("meal_id", mealId);

    // Insert new ingredients
    if (newMealData.ingredients && newMealData.ingredients.length > 0) {
      const { error: ingredientsError } = await supabase
        .from("nutrition_ingredients")
        .insert(
          newMealData.ingredients.map((ing: any) => ({
            meal_id: mealId,
            item: ing.item,
            grams: ing.grams,
            calories: ing.calories || 0,
            protein: ing.protein || 0,
            carbs: ing.carbs || 0,
            fat: ing.fat || 0,
          })),
        );

      if (ingredientsError) {
        console.error("Error inserting new ingredients:", ingredientsError);
      }
    }

    // Fetch final meal with ingredients
    const { data: finalMeal, error: fetchError } = await supabase
      .from("nutrition_meals")
      .select(
        `
        *,
        nutrition_ingredients (*)
      `,
      )
      .eq("id", mealId)
      .single();

    if (fetchError) {
      console.error("Error fetching regenerated meal:", fetchError);
      return createErrorResponse(fetchError, 500);
    }

    return NextResponse.json({
      success: true,
      message: "Meal regenerated successfully",
      data: {
        ...finalMeal,
        ingredients: finalMeal.nutrition_ingredients || [],
      },
    });
  } catch (error) {
    console.error("Error in POST /api/nutrition/meals/[id]/regenerate:", error);
    return createErrorResponse(error);
  }
}

async function regenerateMeal(
  existingMeal: any,
  profile: any,
  additionalConstraints?: string,
) {
  const mealType = existingMeal.name;
  const targetMacros = {
    calories: existingMeal.calories,
    protein: existingMeal.protein,
    carbs: existingMeal.carbs,
    fat: existingMeal.fat,
    fiber: existingMeal.fiber,
  };

  const systemPrompt = `You are a professional nutritionist creating a meal replacement.
  
  Create a new ${mealType} meal that closely matches these macro targets:
  - Calories: ${targetMacros.calories} (±50 calories)
  - Protein: ${targetMacros.protein}g (±5g)
  - Carbs: ${targetMacros.carbs}g (±5g)
  - Fat: ${targetMacros.fat}g (±3g)
  - Fiber: ${targetMacros.fiber}g
  
  User preferences:
  - Dietary preferences: ${profile.dietary_preferences?.join(", ") || "None"}
  - Allergies: ${profile.allergies?.join(", ") || "None"}
  - Likes: ${profile.food_likes?.join(", ") || "Various foods"}
  - Dislikes: ${profile.food_dislikes?.join(", ") || "None"}
  - Cooking time: ${profile.cooking_time || "MODERATE"}
  - Budget: ${profile.budget_constraint || "MODERATE"}
  
  Additional constraints: ${additionalConstraints || "None"}
  
  Current meal to replace: ${existingMeal.recipe}
  
  Create a DIFFERENT meal with DIFFERENT main ingredients.
  
  Return a JSON object with this structure:
  {
    "calories": 400,
    "protein": 30,
    "carbs": 45,
    "fat": 12,
    "fiber": 5,
    "recipe": "Step by step recipe instructions",
    "prepMinutes": 15,
    "ingredients": [
      {
        "item": "Chicken breast",
        "grams": 150,
        "calories": 165,
        "protein": 31,
        "carbs": 0,
        "fat": 3.6
      }
    ]
  }`;

  try {
    const completion = await getOpenAI().chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content:
            "Generate the new meal now. Make sure it's different from the current meal.",
        },
      ],
      temperature: 0.8,
      max_tokens: 1000,
      response_format: { type: "json_object" },
    });

    const newMealData = JSON.parse(
      completion.choices[0]?.message?.content || "{}",
    );
    return newMealData;
  } catch (error) {
    console.error("Error generating new meal:", error);
    return null;
  }
}
