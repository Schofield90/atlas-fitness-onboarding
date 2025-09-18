import { NextRequest, NextResponse } from "next/server";
import { requireAuth, createErrorResponse } from "@/app/lib/api/auth-check";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

// Set max duration for generation
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const userWithOrg = await requireAuth();

    const { nutritionProfile, date } = await request.json();

    if (!nutritionProfile) {
      return NextResponse.json(
        { success: false, error: "Nutrition profile is required" },
        { status: 400 },
      );
    }

    if (!nutritionProfile.id) {
      return NextResponse.json(
        { success: false, error: "Nutrition profile ID is required" },
        { status: 400 },
      );
    }

    console.log("Generating meal plan with library for date:", date);
    console.log("Nutrition profile ID:", nutritionProfile.id);
    console.log("Organization ID:", userWithOrg.organizationId);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate daily targets
    const dailyCalories = nutritionProfile.target_calories || 2000;
    const dailyProtein = nutritionProfile.protein_grams || 150;
    const dailyCarbs = nutritionProfile.carbs_grams || 250;
    const dailyFat = nutritionProfile.fat_grams || 67;

    // Build dietary preferences and restrictions
    const dietaryPrefs = nutritionProfile.dietary_preferences || [];
    const allergies = nutritionProfile.allergies || [];
    const dislikes = nutritionProfile.food_dislikes || [];

    // Meal distribution targets
    const mealTargets = [
      {
        type: "breakfast",
        calories: dailyCalories * 0.25,
        protein: dailyProtein * 0.25,
      },
      {
        type: "morning_snack",
        calories: dailyCalories * 0.1,
        protein: dailyProtein * 0.1,
      },
      {
        type: "lunch",
        calories: dailyCalories * 0.3,
        protein: dailyProtein * 0.3,
      },
      {
        type: "afternoon_snack",
        calories: dailyCalories * 0.1,
        protein: dailyProtein * 0.1,
      },
      {
        type: "dinner",
        calories: dailyCalories * 0.25,
        protein: dailyProtein * 0.25,
      },
    ];

    const selectedMeals = [];
    const usedRecipeIds: string[] = [];

    // Get recently used recipes from the last 7 days to avoid repetition
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: recentlyUsedRecipes } = await supabaseAdmin
      .from("recipe_usage_log")
      .select("recipe_id")
      .eq("user_id", userWithOrg.id)
      .gte("used_for_date", sevenDaysAgo.toISOString().split("T")[0])
      .lt("used_for_date", date);

    const recentlyUsedRecipeIds =
      recentlyUsedRecipes?.map((r) => r.recipe_id) || [];
    console.log(
      `Found ${recentlyUsedRecipeIds.length} recently used recipes to avoid`,
    );

    // Try to find suitable recipes from the library for each meal
    for (const target of mealTargets) {
      let query = supabaseAdmin
        .from("recipes")
        .select("*")
        .eq("status", "active")
        .eq("meal_type", target.type)
        .gte("calories", target.calories * 0.8) // Within 20% of target
        .lte("calories", target.calories * 1.2)
        .order("rating", { ascending: false })
        .limit(20); // Increased from 10 to 20 for better variety

      // Exclude recently used recipes
      if (recentlyUsedRecipeIds.length > 0) {
        query = query.not("id", "in", `(${recentlyUsedRecipeIds.join(",")})`);
      }

      // Apply dietary preferences
      if (dietaryPrefs.length > 0) {
        query = query.contains("dietary_tags", dietaryPrefs);
      }

      // Exclude allergens
      if (allergies.length > 0) {
        query = query.not("allergens", "cs", `{${allergies.join(",")}}`);
      }

      const { data: recipes, error } = await query;

      if (!error && recipes && recipes.length > 0) {
        // Select a recipe with weighted randomization - prefer top recipes but allow variety
        // Use top 50% of available recipes but still randomize within that range
        const selectionPool = Math.min(
          Math.max(5, Math.ceil(recipes.length * 0.5)),
          recipes.length,
        );
        const selectedRecipe =
          recipes[Math.floor(Math.random() * selectionPool)];

        console.log(
          `Selected recipe ${selectedRecipe.name} from pool of ${selectionPool} out of ${recipes.length} available`,
        );

        selectedMeals.push({
          name: selectedRecipe.name,
          description: selectedRecipe.description,
          type: target.type,
          prep_time: `${selectedRecipe.prep_time} minutes`,
          cook_time: `${selectedRecipe.cook_time} minutes`,
          calories: selectedRecipe.calories,
          protein: selectedRecipe.protein,
          carbs: selectedRecipe.carbs,
          fat: selectedRecipe.fat,
          ingredients: selectedRecipe.ingredients,
          instructions: selectedRecipe.instructions,
          recipe_id: selectedRecipe.id, // Track which recipe was used
        });

        usedRecipeIds.push(selectedRecipe.id);

        // Log recipe usage
        try {
          await supabaseAdmin.from("recipe_usage_log").insert({
            recipe_id: selectedRecipe.id,
            user_id: userWithOrg.id,
            organization_id: userWithOrg.organizationId,
            used_for_date: date,
          });
        } catch (err) {
          console.error("Error logging recipe usage:", err);
        }
      }
    }

    // If we couldn't find enough recipes in the library, generate the missing ones
    if (selectedMeals.length < 5) {
      console.log(
        `Found ${selectedMeals.length} recipes in library, generating ${5 - selectedMeals.length} more`,
      );

      const missingMealTypes = mealTargets
        .filter(
          (target, index) => !selectedMeals.find((m) => m.type === target.type),
        )
        .map((t) => t.type);

      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      const prompt = `Generate ${5 - selectedMeals.length} meals for: ${missingMealTypes.join(", ")}.
Targets: ${dailyCalories}cal, ${dailyProtein}g protein.
Diet: ${dietaryPrefs.join(", ") || "none"}. Avoid: ${allergies.join(", ") || "none"}.
Use British measurements (g, ml). Return JSON:
{
  "meals": [
    {
      "name": "meal name",
      "description": "brief description",
      "meal_type": "breakfast|morning_snack|lunch|afternoon_snack|dinner",
      "prep_time": "X minutes",
      "cook_time": "Y minutes",
      "calories": number,
      "protein": number,
      "carbs": number,
      "fat": number,
      "ingredients": [{"item": "name", "amount": "100", "unit": "g"}],
      "instructions": ["Step 1", "Step 2", "Step 3"]
    }
  ]
}`;

      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content:
              "You are a nutritionist. Return only valid JSON. Use British measurements.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1500,
        response_format: { type: "json_object" },
      });

      const generatedMeals = JSON.parse(
        completion.choices[0].message.content || "{}",
      );

      // Save generated meals to the recipe library for future use
      if (generatedMeals.meals) {
        for (const meal of generatedMeals.meals) {
          selectedMeals.push({
            ...meal,
            type: meal.meal_type,
          });

          // Save to recipe library (check for duplicates first)
          let newRecipe = null;
          try {
            // Check if recipe with same name and similar nutrition already exists
            const { data: existingRecipes } = await supabaseAdmin
              .from("recipes")
              .select("id, name, calories, protein")
              .eq("name", meal.name)
              .eq("organization_id", userWithOrg.organizationId)
              .eq("status", "active");

            const isDuplicate = existingRecipes?.some(
              (existing) =>
                Math.abs(existing.calories - meal.calories) < 20 &&
                Math.abs(existing.protein - meal.protein) < 5,
            );

            if (isDuplicate) {
              console.log(
                `Recipe ${meal.name} already exists in library, skipping save`,
              );
            } else {
              console.log(
                "Saving recipe to library:",
                meal.name,
                "for user:",
                userWithOrg.id,
              );
              const { data, error } = await supabaseAdmin
                .from("recipes")
                .insert({
                  name: meal.name,
                  description: meal.description,
                  meal_type: meal.meal_type,
                  calories: meal.calories,
                  protein: meal.protein,
                  carbs: meal.carbs,
                  fat: meal.fat,
                  prep_time: parseInt(meal.prep_time) || 15,
                  cook_time: parseInt(meal.cook_time) || 20,
                  ingredients: meal.ingredients,
                  instructions: meal.instructions,
                  dietary_tags: dietaryPrefs,
                  allergens: [],
                  source: "ai_generated",
                  created_by: userWithOrg.id,
                  organization_id: userWithOrg.organizationId,
                  status: "active",
                  rating: 0.8, // Default rating for AI generated recipes
                  upvotes: 0,
                  downvotes: 0,
                  times_used: 1,
                })
                .select()
                .single();

              if (!error) {
                newRecipe = data;
                console.log(
                  "Successfully saved recipe to library:",
                  newRecipe.id,
                  newRecipe.name,
                );
              } else {
                console.error("Error saving recipe to library:", {
                  error: error.message,
                  code: error.code,
                  hint: error.hint,
                  details: error.details,
                });
              }
            }
          } catch (err) {
            console.error("Error saving recipe to library:", err);
          }

          if (newRecipe) {
            usedRecipeIds.push(newRecipe.id);
          }
        }
      }
    }

    // Calculate totals
    const totals = selectedMeals.reduce(
      (acc, meal) => ({
        calories: acc.calories + meal.calories,
        protein: acc.protein + meal.protein,
        carbs: acc.carbs + meal.carbs,
        fat: acc.fat + meal.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
    );

    const mealPlan = {
      meals: selectedMeals,
      totals,
      recipe_ids: usedRecipeIds, // Track which recipes were used
    };

    // Label meals properly
    const mealTypes = [
      "Breakfast",
      "Morning Snack",
      "Lunch",
      "Afternoon Snack",
      "Dinner",
    ];
    mealPlan.meals = mealPlan.meals.map((meal: any, index: number) => ({
      ...meal,
      type: mealTypes[index],
    }));

    // Save the meal plan with date information in meal_data
    const mealPlanWithDate = {
      ...mealPlan,
      date: date, // Store the date in the meal_data JSONB
    };

    // Parse the date string to ensure it's in the correct format
    const planDate = new Date(date);
    const dateString = planDate.toISOString().split("T")[0]; // Format as YYYY-MM-DD

    // First, we need to find the client record
    let clientId = null;

    // Check if there's a client record for this user by user_id
    const { data: clientRecord } = await supabaseAdmin
      .from("clients")
      .select("id")
      .eq("user_id", userWithOrg.id)
      .single();

    if (clientRecord) {
      clientId = clientRecord.id;
      console.log("Found existing client record:", clientId);
    } else {
      // If no client by user_id, check if the user is a client themselves
      const { data: clientById } = await supabaseAdmin
        .from("clients")
        .select("id")
        .eq("id", userWithOrg.id)
        .single();

      if (clientById) {
        clientId = clientById.id;
        console.log("User is a client themselves:", clientId);
      } else {
        console.log("No client record found for user:", userWithOrg.id);
        // Continue without client_id - it might be nullable
      }
    }

    // Check if a meal plan already exists for this date
    // Using the actual column names from the database
    const { data: existingPlan } = await supabaseAdmin
      .from("meal_plans")
      .select("id, meal_data")
      .eq("profile_id", nutritionProfile.id) // Changed from nutrition_profile_id
      .eq("start_date", dateString)
      .single();

    let savedPlan;
    let saveError;

    if (existingPlan) {
      // Update existing plan - using the actual column names from the database
      const updateData: any = {
        name: `Meal Plan ${dateString}`,
        meal_data: mealPlanWithDate,
        status: "active", // Changed from is_active
        total_calories: totals.calories, // Changed from daily_calories
        total_protein: totals.protein, // Changed from daily_protein
        total_carbs: totals.carbs, // Changed from daily_carbs
        total_fat: totals.fat, // Changed from daily_fat
        start_date: dateString,
        end_date: dateString,
        updated_at: new Date().toISOString(),
      };

      // Only add client_id if we have one
      if (clientId) {
        updateData.client_id = clientId;
      }

      const { data, error } = await supabaseAdmin
        .from("meal_plans")
        .update(updateData)
        .eq("id", existingPlan.id)
        .select()
        .single();
      savedPlan = data;
      saveError = error;
    } else {
      // Create new plan - using the actual column names from the database
      const insertData: any = {
        profile_id: nutritionProfile.id, // Changed from nutrition_profile_id
        organization_id: userWithOrg.organizationId,
        name: `Meal Plan ${dateString}`,
        meal_data: mealPlanWithDate,
        status: "active", // Changed from is_active
        total_calories: totals.calories, // Changed from daily_calories
        total_protein: totals.protein, // Changed from daily_protein
        total_carbs: totals.carbs, // Changed from daily_carbs
        total_fat: totals.fat, // Changed from daily_fat
        start_date: dateString,
        end_date: dateString,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Only add client_id if we have one
      if (clientId) {
        insertData.client_id = clientId;
      }

      const { data, error } = await supabaseAdmin
        .from("meal_plans")
        .insert(insertData)
        .select()
        .single();
      savedPlan = data;
      saveError = error;
    }

    if (saveError) {
      console.error("Error saving meal plan:", {
        error: saveError.message,
        code: saveError.code,
        hint: saveError.hint,
        details: saveError.details,
        nutritionProfileId: nutritionProfile.id,
        organizationId: userWithOrg.organizationId,
      });

      // Return error response if meal plan save failed
      return NextResponse.json(
        {
          success: false,
          error: "Failed to save meal plan to database",
          details: {
            message: saveError.message,
            code: saveError.code,
            hint: saveError.hint,
          },
        },
        { status: 500 },
      );
    }

    // Save generated meals to recipe library for future use
    console.log("Saving recipes to library...");
    for (const meal of selectedMeals) {
      if (!meal.recipe_id) {
        // This is a newly generated meal, save it to the library
        try {
          // Parse prep_time and cook_time from strings like "15 minutes" to numbers
          const parseTime = (timeStr: any) => {
            if (typeof timeStr === "number") return timeStr;
            if (typeof timeStr === "string") {
              const match = timeStr.match(/(\d+)/);
              return match ? parseInt(match[1]) : 15;
            }
            return 15;
          };

          const recipeData = {
            name: meal.name,
            description: meal.description || `AI-generated ${meal.type} recipe`,
            meal_type: meal.type.toLowerCase().replace(" ", "_"),
            calories: Math.round(meal.calories),
            protein: parseFloat(meal.protein.toFixed(2)),
            carbs: parseFloat(meal.carbs.toFixed(2)),
            fat: parseFloat(meal.fat.toFixed(2)),
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
            created_by: userWithOrg.id,
            organization_id: userWithOrg.organizationId,
            status: "active",
            is_featured: false,
          };

          // Check if recipe with same name and similar nutrition already exists
          const { data: existingRecipes } = await supabaseAdmin
            .from("recipes")
            .select("id, name, calories, protein")
            .eq("name", recipeData.name)
            .eq("organization_id", userWithOrg.organizationId)
            .eq("status", "active");

          const isDuplicate = existingRecipes?.some(
            (existing) =>
              Math.abs(existing.calories - recipeData.calories) < 20 &&
              Math.abs(existing.protein - recipeData.protein) < 5,
          );

          if (isDuplicate) {
            console.log(
              `Recipe ${recipeData.name} already exists in library, skipping save`,
            );
            continue; // Skip saving this duplicate recipe
          }

          console.log("Saving recipe:", recipeData.name);
          console.log(
            "Recipe data being saved:",
            JSON.stringify(recipeData, null, 2),
          );

          const { data: savedRecipe, error: recipeError } = await supabaseAdmin
            .from("recipes")
            .insert(recipeData)
            .select()
            .single();

          if (recipeError) {
            console.error("Error saving recipe to library:", {
              error: recipeError.message,
              code: recipeError.code,
              details: recipeError.details,
              hint: recipeError.hint,
              recipeData: recipeData,
            });
          } else {
            console.log(
              "Recipe saved successfully:",
              savedRecipe.id,
              savedRecipe.name,
            );
          }
        } catch (err) {
          console.error("Error processing recipe for library:", err);
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        id: savedPlan?.id,
        date,
        ...mealPlan,
        from_library: selectedMeals.filter((m: any) => m.recipe_id).length,
        generated: selectedMeals.filter((m: any) => !m.recipe_id).length,
      },
    });
  } catch (error: any) {
    console.error("Error generating meal plan with library:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to generate meal plan",
      },
      { status: 500 },
    );
  }
}
