import { NextRequest, NextResponse } from "next/server";
import { requireAuth, createErrorResponse } from "@/app/lib/api/auth-check";
import OpenAI from "openai";

// Set max duration for Vercel Pro plan
export const maxDuration = 60; // 60 seconds

// Quick meal plan generation - single API call, no parallel processing
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const userWithOrg = await requireAuth();

    const {
      nutritionProfile,
      profileId,
      preferences,
      daysToGenerate = 3, // Default to 3 days for faster generation
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

    console.log("Generating quick meal plan for profile:", profile.id);

    try {
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      // Create a simplified prompt for faster generation
      const prompt = `Create a ${daysToGenerate}-day meal plan with these requirements:
- Daily calories: ${profile.target_calories}
- Daily protein: ${profile.protein_grams}g
- Daily carbs: ${profile.carbs_grams}g
- Daily fat: ${profile.fat_grams}g
- Goal: ${profile.goal || "maintain weight"}
- Dietary preferences: ${preferences?.dietary_type || "balanced"}

Generate a JSON response with this exact structure:
{
  "meal_plan": {
    "day_1": {
      "meals": [
        {
          "type": "breakfast",
          "name": "Meal Name",
          "calories": 400,
          "protein": 30,
          "carbs": 40,
          "fat": 15,
          "ingredients": ["ingredient1", "ingredient2"],
          "instructions": "Brief instructions"
        },
        {
          "type": "lunch",
          "name": "Meal Name",
          "calories": 500,
          "protein": 40,
          "carbs": 50,
          "fat": 20,
          "ingredients": ["ingredient1", "ingredient2"],
          "instructions": "Brief instructions"
        },
        {
          "type": "dinner",
          "name": "Meal Name",
          "calories": 600,
          "protein": 45,
          "carbs": 60,
          "fat": 25,
          "ingredients": ["ingredient1", "ingredient2"],
          "instructions": "Brief instructions"
        },
        {
          "type": "snack",
          "name": "Snack Name",
          "calories": 200,
          "protein": 15,
          "carbs": 20,
          "fat": 10,
          "ingredients": ["ingredient1"],
          "instructions": "Brief instructions"
        }
      ]
    }
  },
  "shopping_list": {
    "proteins": ["chicken", "eggs", "etc"],
    "grains": ["rice", "oats", "etc"],
    "vegetables": ["broccoli", "spinach", "etc"],
    "fruits": ["apples", "bananas", "etc"],
    "dairy": ["milk", "yogurt", "etc"],
    "other": ["olive oil", "spices", "etc"]
  }
}

Create meals for ${daysToGenerate} days. Keep instructions brief. Focus on simple, practical meals.`;

      // Single API call with GPT-3.5 for speed
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo-1106", // Faster model
        messages: [
          {
            role: "system",
            content:
              "You are a nutrition expert. Generate meal plans in valid JSON format only. Be concise.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 3000, // Limit tokens for speed
        response_format: { type: "json_object" },
      });

      const mealPlanData = JSON.parse(
        completion.choices[0].message.content || "{}",
      );

      // Add any missing days with simple structure
      for (let i = 1; i <= daysToGenerate; i++) {
        if (!mealPlanData.meal_plan[`day_${i}`]) {
          mealPlanData.meal_plan[`day_${i}`] = {
            meals: [
              {
                type: "breakfast",
                name: `Day ${i} Breakfast`,
                calories: Math.round(profile.target_calories * 0.25),
                protein: Math.round(profile.protein_grams * 0.25),
                carbs: Math.round(profile.carbs_grams * 0.25),
                fat: Math.round(profile.fat_grams * 0.25),
                ingredients: ["eggs", "toast", "avocado"],
                instructions: "Cook eggs, toast bread, slice avocado",
              },
              {
                type: "lunch",
                name: `Day ${i} Lunch`,
                calories: Math.round(profile.target_calories * 0.35),
                protein: Math.round(profile.protein_grams * 0.35),
                carbs: Math.round(profile.carbs_grams * 0.35),
                fat: Math.round(profile.fat_grams * 0.35),
                ingredients: ["chicken", "rice", "vegetables"],
                instructions: "Grill chicken, cook rice, steam vegetables",
              },
              {
                type: "dinner",
                name: `Day ${i} Dinner`,
                calories: Math.round(profile.target_calories * 0.35),
                protein: Math.round(profile.protein_grams * 0.35),
                carbs: Math.round(profile.carbs_grams * 0.35),
                fat: Math.round(profile.fat_grams * 0.35),
                ingredients: ["salmon", "quinoa", "salad"],
                instructions: "Bake salmon, cook quinoa, prepare salad",
              },
              {
                type: "snack",
                name: `Day ${i} Snack`,
                calories: Math.round(profile.target_calories * 0.05),
                protein: Math.round(profile.protein_grams * 0.05),
                carbs: Math.round(profile.carbs_grams * 0.05),
                fat: Math.round(profile.fat_grams * 0.05),
                ingredients: ["protein bar"],
                instructions: "Enjoy protein bar",
              },
            ],
          };
        }
      }

      // Ensure shopping list exists
      if (!mealPlanData.shopping_list) {
        mealPlanData.shopping_list = {
          proteins: ["chicken", "salmon", "eggs"],
          grains: ["rice", "quinoa", "oats"],
          vegetables: ["broccoli", "spinach", "tomatoes"],
          fruits: ["apples", "bananas"],
          dairy: ["milk", "yogurt"],
          other: ["olive oil", "spices"],
        };
      }

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
          nutrition_profile_id: profile.id,
          organization_id: userWithOrg.organizationId,
          name: `${daysToGenerate}-Day Quick Meal Plan`,
          description: `AI-generated meal plan for ${profile.goal || "general nutrition"}`,
          duration_days: daysToGenerate,
          meals_per_day: 3,
          daily_calories: profile.target_calories,
          daily_protein: profile.protein_grams,
          daily_carbs: profile.carbs_grams,
          daily_fat: profile.fat_grams,
          meal_data: mealPlanData,
          is_active: true,
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
          },
        });
      }

      console.log("Quick meal plan generated successfully");

      return NextResponse.json({
        success: true,
        data: {
          id: savedPlan.id,
          meal_plan: mealPlanData.meal_plan,
          meal_data: mealPlanData,
          daily_calories: profile.target_calories,
          daily_protein: profile.protein_grams,
          daily_carbs: profile.carbs_grams,
          daily_fat: profile.fat_grams,
          nutrition_totals: {
            calories: profile.target_calories * daysToGenerate,
            protein: profile.protein_grams * daysToGenerate,
            carbs: profile.carbs_grams * daysToGenerate,
            fat: profile.fat_grams * daysToGenerate,
          },
          shopping_list: mealPlanData.shopping_list,
        },
      });
    } catch (generationError: any) {
      console.error("Error generating meal plan:", generationError);

      // Return a fallback meal plan if generation fails
      const fallbackMealPlan: any = {};
      for (let i = 1; i <= daysToGenerate; i++) {
        fallbackMealPlan[`day_${i}`] = {
          meals: [
            {
              type: "breakfast",
              name: "Protein Oatmeal",
              calories: Math.round(profile.target_calories * 0.25),
              protein: Math.round(profile.protein_grams * 0.25),
              carbs: Math.round(profile.carbs_grams * 0.25),
              fat: Math.round(profile.fat_grams * 0.25),
              ingredients: [
                "oats",
                "protein powder",
                "berries",
                "almond butter",
              ],
              instructions:
                "Mix oats with protein powder, top with berries and almond butter",
            },
            {
              type: "lunch",
              name: "Grilled Chicken Bowl",
              calories: Math.round(profile.target_calories * 0.35),
              protein: Math.round(profile.protein_grams * 0.35),
              carbs: Math.round(profile.carbs_grams * 0.35),
              fat: Math.round(profile.fat_grams * 0.35),
              ingredients: ["chicken breast", "brown rice", "mixed vegetables"],
              instructions:
                "Grill chicken, serve over rice with steamed vegetables",
            },
            {
              type: "dinner",
              name: "Salmon & Sweet Potato",
              calories: Math.round(profile.target_calories * 0.35),
              protein: Math.round(profile.protein_grams * 0.35),
              carbs: Math.round(profile.carbs_grams * 0.35),
              fat: Math.round(profile.fat_grams * 0.35),
              ingredients: ["salmon", "sweet potato", "green beans"],
              instructions: "Bake salmon and sweet potato, steam green beans",
            },
            {
              type: "snack",
              name: "Greek Yogurt",
              calories: Math.round(profile.target_calories * 0.05),
              protein: Math.round(profile.protein_grams * 0.05),
              carbs: Math.round(profile.carbs_grams * 0.05),
              fat: Math.round(profile.fat_grams * 0.05),
              ingredients: ["greek yogurt", "honey", "nuts"],
              instructions: "Mix yogurt with honey and nuts",
            },
          ],
        };
      }

      return NextResponse.json({
        success: true,
        data: {
          meal_plan: fallbackMealPlan,
          nutrition_totals: {
            calories: profile.target_calories * daysToGenerate,
            protein: profile.protein_grams * daysToGenerate,
            carbs: profile.carbs_grams * daysToGenerate,
            fat: profile.fat_grams * daysToGenerate,
          },
          shopping_list: {
            proteins: ["chicken", "salmon", "eggs", "greek yogurt"],
            grains: ["oats", "brown rice", "sweet potato"],
            vegetables: ["mixed vegetables", "green beans"],
            fruits: ["berries"],
            dairy: ["greek yogurt"],
            other: ["protein powder", "almond butter", "honey", "nuts"],
          },
        },
      });
    }
  } catch (error: any) {
    console.error("Error in meal plan generation:", error);
    return createErrorResponse(error);
  }
}
