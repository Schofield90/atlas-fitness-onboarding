import { NextRequest, NextResponse } from "next/server";
import { requireAuth, createErrorResponse } from "@/app/lib/api/auth-check";
import OpenAI from "openai";

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

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

      // Determine meal structure based on meals_per_day preference
      const mealsPerDay = profile.meals_per_day || 3;
      console.log("Generating meal plan for meals_per_day:", mealsPerDay);

      let mealStructure = "";
      let mealExamples = [];

      if (mealsPerDay === 2) {
        // 2 meals: Brunch and Dinner
        mealStructure = "2 meals per day (brunch and dinner)";
        mealExamples = [
          {
            type: "brunch",
            name: "Brunch",
            calories: 0.5,
            protein: 0.5,
            carbs: 0.5,
            fat: 0.5,
          },
          {
            type: "dinner",
            name: "Dinner",
            calories: 0.5,
            protein: 0.5,
            carbs: 0.5,
            fat: 0.5,
          },
        ];
      } else if (mealsPerDay === 3) {
        // 3 meals: Breakfast, Lunch, Dinner
        mealStructure = "3 meals per day (breakfast, lunch, dinner)";
        mealExamples = [
          {
            type: "breakfast",
            name: "Breakfast",
            calories: 0.3,
            protein: 0.3,
            carbs: 0.3,
            fat: 0.3,
          },
          {
            type: "lunch",
            name: "Lunch",
            calories: 0.35,
            protein: 0.35,
            carbs: 0.35,
            fat: 0.35,
          },
          {
            type: "dinner",
            name: "Dinner",
            calories: 0.35,
            protein: 0.35,
            carbs: 0.35,
            fat: 0.35,
          },
        ];
      } else if (mealsPerDay === 4) {
        // 4 meals: Breakfast, Lunch, Snack, Dinner
        mealStructure =
          "4 meals per day (breakfast, lunch, afternoon snack, dinner)";
        mealExamples = [
          {
            type: "breakfast",
            name: "Breakfast",
            calories: 0.25,
            protein: 0.25,
            carbs: 0.25,
            fat: 0.25,
          },
          {
            type: "lunch",
            name: "Lunch",
            calories: 0.3,
            protein: 0.3,
            carbs: 0.3,
            fat: 0.3,
          },
          {
            type: "snack",
            name: "Afternoon Snack",
            calories: 0.15,
            protein: 0.15,
            carbs: 0.15,
            fat: 0.15,
          },
          {
            type: "dinner",
            name: "Dinner",
            calories: 0.3,
            protein: 0.3,
            carbs: 0.3,
            fat: 0.3,
          },
        ];
      } else if (mealsPerDay === 5) {
        // 5 meals: Could be interpreted as 5 full meals OR 3 meals + 2 snacks
        // Let's make it 5 actual meals for bodybuilders/athletes
        mealStructure =
          "5 meals per day (breakfast, mid-morning meal, lunch, afternoon meal, dinner)";
        mealExamples = [
          {
            type: "breakfast",
            name: "Breakfast",
            calories: 0.2,
            protein: 0.2,
            carbs: 0.2,
            fat: 0.2,
          },
          {
            type: "meal",
            name: "Mid-Morning Meal",
            calories: 0.2,
            protein: 0.2,
            carbs: 0.2,
            fat: 0.2,
          },
          {
            type: "lunch",
            name: "Lunch",
            calories: 0.2,
            protein: 0.2,
            carbs: 0.2,
            fat: 0.2,
          },
          {
            type: "meal",
            name: "Afternoon Meal",
            calories: 0.2,
            protein: 0.2,
            carbs: 0.2,
            fat: 0.2,
          },
          {
            type: "dinner",
            name: "Dinner",
            calories: 0.2,
            protein: 0.2,
            carbs: 0.2,
            fat: 0.2,
          },
        ];
      } else {
        // 6 meals: 6 actual meals for serious athletes
        mealStructure =
          "6 meals per day (breakfast, mid-morning, lunch, mid-afternoon, dinner, evening meal)";
        mealExamples = [
          {
            type: "breakfast",
            name: "Breakfast",
            calories: 0.17,
            protein: 0.17,
            carbs: 0.17,
            fat: 0.17,
          },
          {
            type: "meal",
            name: "Mid-Morning Meal",
            calories: 0.16,
            protein: 0.16,
            carbs: 0.16,
            fat: 0.16,
          },
          {
            type: "lunch",
            name: "Lunch",
            calories: 0.17,
            protein: 0.17,
            carbs: 0.17,
            fat: 0.17,
          },
          {
            type: "meal",
            name: "Mid-Afternoon Meal",
            calories: 0.16,
            protein: 0.16,
            carbs: 0.16,
            fat: 0.16,
          },
          {
            type: "dinner",
            name: "Dinner",
            calories: 0.17,
            protein: 0.17,
            carbs: 0.17,
            fat: 0.17,
          },
          {
            type: "meal",
            name: "Evening Meal",
            calories: 0.17,
            protein: 0.17,
            carbs: 0.17,
            fat: 0.17,
          },
        ];
      }

      // Build meal examples for the prompt
      const mealExampleJson = mealExamples.map((meal) => ({
        type: meal.type,
        name: meal.name,
        calories: Math.round(profile.target_calories * meal.calories),
        protein: Math.round(profile.protein_grams * meal.protein),
        carbs: Math.round(profile.carbs_grams * meal.carbs),
        fat: Math.round(profile.fat_grams * meal.fat),
        ingredients: ["ingredient1", "ingredient2"],
        instructions: "Brief instructions",
      }));

      // Create a simplified prompt for faster generation
      const prompt = `Create a ${daysToGenerate}-day meal plan with these requirements:
- Daily calories: ${profile.target_calories}
- Daily protein: ${profile.protein_grams}g
- Daily carbs: ${profile.carbs_grams}g
- Daily fat: ${profile.fat_grams}g
- Goal: ${profile.goal || "maintain weight"}
- Dietary preferences: ${preferences?.dietary_type || "balanced"}
- Meal structure: ${mealStructure}

Generate a JSON response with this exact structure:
{
  "meal_plan": {
    "day_1": {
      "meals": ${JSON.stringify(mealExampleJson, null, 2)}
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

      // Add any missing days with simple structure based on meals_per_day
      for (let i = 1; i <= daysToGenerate; i++) {
        if (!mealPlanData.meal_plan[`day_${i}`]) {
          const dayMeals = [];

          // Generate meals based on the meal structure
          mealExamples.forEach((mealTemplate, index) => {
            let mealName = "";
            let ingredients = [];
            let instructions = "";

            // Create varied default meals based on type
            if (
              mealTemplate.type === "breakfast" ||
              mealTemplate.type === "brunch"
            ) {
              mealName = `Day ${i} ${mealTemplate.name}`;
              ingredients = ["eggs", "toast", "avocado"];
              instructions = "Cook eggs, toast bread, slice avocado";
            } else if (mealTemplate.type === "lunch") {
              mealName = `Day ${i} Lunch`;
              ingredients = ["chicken", "rice", "vegetables"];
              instructions = "Grill chicken, cook rice, steam vegetables";
            } else if (mealTemplate.type === "dinner") {
              mealName = `Day ${i} Dinner`;
              ingredients = ["salmon", "quinoa", "salad"];
              instructions = "Bake salmon, cook quinoa, prepare salad";
            } else if (mealTemplate.type === "meal") {
              // Additional meals for 5-6 meal plans
              if (mealTemplate.name.includes("Morning")) {
                mealName = `Day ${i} Mid-Morning Meal`;
                ingredients = ["chicken wrap", "sweet potato", "spinach"];
                instructions =
                  "Prepare chicken wrap with sweet potato and spinach";
              } else if (mealTemplate.name.includes("Afternoon")) {
                mealName = `Day ${i} Afternoon Meal`;
                ingredients = ["tuna", "whole grain pasta", "mixed greens"];
                instructions = "Mix tuna with pasta and serve with greens";
              } else {
                mealName = `Day ${i} Evening Meal`;
                ingredients = ["lean beef", "brown rice", "broccoli"];
                instructions =
                  "Cook beef, serve with rice and steamed broccoli";
              }
            } else if (mealTemplate.type === "snack") {
              if (mealTemplate.name.includes("Morning")) {
                mealName = `Day ${i} Morning Snack`;
                ingredients = ["apple", "almond butter"];
                instructions = "Slice apple, serve with almond butter";
              } else if (mealTemplate.name.includes("Afternoon")) {
                mealName = `Day ${i} Afternoon Snack`;
                ingredients = ["greek yogurt", "berries"];
                instructions = "Mix yogurt with berries";
              } else {
                mealName = `Day ${i} Evening Snack`;
                ingredients = ["protein bar", "nuts"];
                instructions = "Enjoy protein bar with nuts";
              }
            }

            dayMeals.push({
              type: mealTemplate.type,
              name: mealName,
              calories: Math.round(
                profile.target_calories * mealTemplate.calories,
              ),
              protein: Math.round(profile.protein_grams * mealTemplate.protein),
              carbs: Math.round(profile.carbs_grams * mealTemplate.carbs),
              fat: Math.round(profile.fat_grams * mealTemplate.fat),
              ingredients,
              instructions,
            });
          });

          mealPlanData.meal_plan[`day_${i}`] = { meals: dayMeals };
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

      // Return a fallback meal plan if generation fails (dynamic based on meals_per_day)
      const fallbackMealPlan: any = {};
      for (let i = 1; i <= daysToGenerate; i++) {
        const dayMeals = [];

        // Generate fallback meals based on the meal structure
        mealExamples.forEach((mealTemplate) => {
          let meal: any = {
            type: mealTemplate.type,
            calories: Math.round(
              profile.target_calories * mealTemplate.calories,
            ),
            protein: Math.round(profile.protein_grams * mealTemplate.protein),
            carbs: Math.round(profile.carbs_grams * mealTemplate.carbs),
            fat: Math.round(profile.fat_grams * mealTemplate.fat),
          };

          // Set meal details based on type
          if (mealTemplate.type === "breakfast") {
            meal.name = "Protein Oatmeal";
            meal.ingredients = [
              "oats",
              "protein powder",
              "berries",
              "almond butter",
            ];
            meal.instructions =
              "Mix oats with protein powder, top with berries and almond butter";
          } else if (mealTemplate.type === "brunch") {
            meal.name = "Eggs Benedict Bowl";
            meal.ingredients = ["eggs", "english muffin", "ham", "hollandaise"];
            meal.instructions =
              "Poach eggs, toast muffin, layer with ham and sauce";
          } else if (mealTemplate.type === "lunch") {
            meal.name = "Grilled Chicken Bowl";
            meal.ingredients = [
              "chicken breast",
              "brown rice",
              "mixed vegetables",
            ];
            meal.instructions =
              "Grill chicken, serve over rice with steamed vegetables";
          } else if (mealTemplate.type === "dinner") {
            meal.name = "Salmon & Sweet Potato";
            meal.ingredients = ["salmon", "sweet potato", "green beans"];
            meal.instructions =
              "Bake salmon and sweet potato, steam green beans";
          } else if (mealTemplate.type === "meal") {
            // Additional full meals for 5-6 meal plans
            if (mealTemplate.name.includes("Morning")) {
              meal.name = "Mid-Morning Power Bowl";
              meal.ingredients = [
                "turkey breast",
                "quinoa",
                "bell peppers",
                "olive oil",
              ];
              meal.instructions =
                "Grill turkey, mix with quinoa and sautéed peppers";
            } else if (mealTemplate.name.includes("Afternoon")) {
              meal.name = "Afternoon Protein Plate";
              meal.ingredients = ["lean beef", "sweet potato", "asparagus"];
              meal.instructions =
                "Pan-sear beef, roast sweet potato, steam asparagus";
            } else {
              meal.name = "Evening Recovery Meal";
              meal.ingredients = [
                "white fish",
                "jasmine rice",
                "mixed vegetables",
              ];
              meal.instructions = "Bake fish, cook rice, stir-fry vegetables";
            }
          } else if (mealTemplate.type === "snack") {
            if (mealTemplate.name.includes("Morning")) {
              meal.name = "Protein Shake";
              meal.ingredients = ["protein powder", "banana", "milk"];
              meal.instructions = "Blend all ingredients until smooth";
            } else if (mealTemplate.name.includes("Afternoon")) {
              meal.name = "Greek Yogurt & Nuts";
              meal.ingredients = ["greek yogurt", "mixed nuts", "honey"];
              meal.instructions = "Top yogurt with nuts and drizzle honey";
            } else {
              meal.name = "Cottage Cheese Bowl";
              meal.ingredients = [
                "cottage cheese",
                "cucumber",
                "cherry tomatoes",
              ];
              meal.instructions = "Mix cottage cheese with sliced vegetables";
            }
          }

          dayMeals.push(meal);
        });

        fallbackMealPlan[`day_${i}`] = { meals: dayMeals };
      }

      return NextResponse.json({
        success: true,
        data: {
          meal_plan: fallbackMealPlan,
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
