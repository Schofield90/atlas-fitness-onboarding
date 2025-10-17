import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    // Use service role to bypass RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    console.log("Fetching existing meal plans to extract recipes...");

    // First check what columns exist in meal_plans
    const { data: columnsCheck, error: columnsError } = await supabaseAdmin
      .from("meal_plans")
      .select("*")
      .limit(1);

    console.log(
      "Meal plans table columns:",
      columnsCheck ? Object.keys(columnsCheck[0] || {}) : "No data",
    );

    // Get all meal plans - try different column names
    const { data: mealPlans, error: fetchError } = await supabaseAdmin
      .from("meal_plans")
      .select("*")
      .limit(100);

    if (fetchError) {
      console.error("Error fetching meal plans:", fetchError);
      return NextResponse.json({
        success: false,
        error: "Failed to fetch meal plans",
        details: fetchError,
      });
    }

    if (!mealPlans || mealPlans.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No meal plans found to migrate",
        recipesCreated: 0,
      });
    }

    console.log(`Found ${mealPlans.length} meal plans to process`);

    let recipesCreated = 0;
    let recipesFailed = 0;
    const createdRecipes = [];

    // Log first meal plan structure to understand the data
    if (mealPlans && mealPlans.length > 0) {
      console.log(
        "First meal plan structure:",
        JSON.stringify(mealPlans[0], null, 2),
      );
    }

    // Process each meal plan - check different possible column names
    for (const plan of mealPlans) {
      // Try different possible locations for meal data
      const mealData =
        plan.meal_data || plan.meals || plan.data || plan.meal_plan_data;

      if (!mealData?.meals && !Array.isArray(mealData)) {
        console.log(`No meals found in plan ${plan.id}`);
        continue;
      }

      const meals = mealData.meals || mealData;

      // Process each meal in the plan
      for (const meal of meals) {
        if (!meal.name) continue;

        try {
          // Parse time values
          const parseTime = (timeStr: any) => {
            if (typeof timeStr === "number") return timeStr;
            if (typeof timeStr === "string") {
              const match = timeStr.match(/(\d+)/);
              return match ? parseInt(match[1]) : 15;
            }
            return 15;
          };

          // Check if recipe already exists with same name
          const { data: existingRecipe } = await supabaseAdmin
            .from("recipes")
            .select("id, name")
            .eq("name", meal.name)
            .single();

          if (existingRecipe) {
            console.log(`Recipe already exists: ${meal.name}`);
            continue;
          }

          // Map meal type
          let mealType = meal.type?.toLowerCase().replace(" ", "_");
          if (
            ![
              "breakfast",
              "morning_snack",
              "lunch",
              "afternoon_snack",
              "dinner",
            ].includes(mealType)
          ) {
            // Try to guess from the name or default to lunch
            if (meal.type?.toLowerCase().includes("breakfast"))
              mealType = "breakfast";
            else if (meal.type?.toLowerCase().includes("snack")) {
              if (meal.type?.toLowerCase().includes("morning"))
                mealType = "morning_snack";
              else mealType = "afternoon_snack";
            } else if (meal.type?.toLowerCase().includes("dinner"))
              mealType = "dinner";
            else mealType = "lunch";
          }

          const recipeData = {
            name: meal.name,
            description:
              meal.description ||
              `Nutritious ${mealType.replace("_", " ")} option`,
            meal_type: mealType,
            calories: Math.round(meal.calories || 400),
            protein: parseFloat((meal.protein || 20).toFixed(2)),
            carbs: parseFloat((meal.carbs || 50).toFixed(2)),
            fat: parseFloat((meal.fat || 15).toFixed(2)),
            fiber: meal.fiber ? parseFloat(meal.fiber.toFixed(2)) : null,
            sugar: meal.sugar ? parseFloat(meal.sugar.toFixed(2)) : null,
            sodium: meal.sodium ? parseFloat(meal.sodium.toFixed(2)) : null,
            prep_time: parseTime(meal.prep_time),
            cook_time: parseTime(meal.cook_time),
            servings: meal.servings || 1,
            difficulty: "easy",
            ingredients: meal.ingredients || [],
            instructions: meal.instructions || [],
            dietary_tags: meal.dietary_tags || [],
            allergens: meal.allergens || [],
            source: "ai_generated",
            organization_id: plan.organization_id,
            status: "active",
            is_featured: false,
            times_used: 1,
            created_at: plan.created_at,
          };

          console.log(`Creating recipe: ${recipeData.name}`);

          const { data: newRecipe, error: insertError } = await supabaseAdmin
            .from("recipes")
            .insert(recipeData)
            .select()
            .single();

          if (insertError) {
            console.error(`Failed to create recipe ${meal.name}:`, insertError);
            recipesFailed++;
          } else {
            console.log(`Created recipe: ${newRecipe.name}`);
            recipesCreated++;
            createdRecipes.push(newRecipe);
          }
        } catch (err) {
          console.error(`Error processing meal ${meal.name}:`, err);
          recipesFailed++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Migration complete. Created ${recipesCreated} recipes from existing meal plans`,
      recipesCreated,
      recipesFailed,
      sampleRecipes: createdRecipes.slice(0, 5).map((r) => ({
        id: r.id,
        name: r.name,
        meal_type: r.meal_type,
        calories: r.calories,
      })),
    });
  } catch (error) {
    console.error("Error migrating meals to recipes:", error);
    return NextResponse.json(
      { error: "Failed to migrate meals", details: error },
      { status: 500 },
    );
  }
}
