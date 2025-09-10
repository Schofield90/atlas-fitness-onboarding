import { NextRequest, NextResponse } from "next/server";
import { requireAuth, createErrorResponse } from "@/app/lib/api/auth-check";
import crypto from "crypto";

// Helper to generate cache key from inputs
function generateCacheKey(
  profile: any,
  preferences: any,
  days: number,
): string {
  const key = {
    calories: Math.round(profile.target_calories / 100) * 100, // Round to nearest 100
    protein: Math.round(profile.protein_grams / 10) * 10, // Round to nearest 10
    dietary: preferences?.dietary_type || "balanced",
    days,
  };
  return crypto.createHash("md5").update(JSON.stringify(key)).digest("hex");
}

// Generate instant skeleton with meal titles and macros
function generateSkeleton(profile: any, daysToGenerate: number) {
  const mealTypes = ["breakfast", "lunch", "dinner", "snack"];
  const skeleton: any = {};

  // Pre-defined meal templates for instant response
  const mealTemplates = {
    breakfast: [
      "Protein Power Pancakes",
      "Greek Yogurt Parfait",
      "Scrambled Eggs & Toast",
      "Overnight Oats",
      "Smoothie Bowl",
      "Avocado Toast with Eggs",
      "Protein Waffles",
    ],
    lunch: [
      "Grilled Chicken Salad",
      "Turkey Wrap",
      "Quinoa Buddha Bowl",
      "Salmon & Rice",
      "Chicken Stir-Fry",
      "Mediterranean Bowl",
      "Tuna Sandwich",
    ],
    dinner: [
      "Baked Salmon with Vegetables",
      "Chicken Breast & Sweet Potato",
      "Beef Stir-Fry",
      "Turkey Meatballs & Pasta",
      "Grilled Steak & Salad",
      "Chicken Curry",
      "Fish Tacos",
    ],
    snack: [
      "Protein Shake",
      "Mixed Nuts",
      "Greek Yogurt",
      "Protein Bar",
      "Apple with Almond Butter",
      "Cottage Cheese",
      "Hard-Boiled Eggs",
    ],
  };

  const mealDistribution = {
    breakfast: 0.25,
    lunch: 0.35,
    dinner: 0.35,
    snack: 0.05,
  };

  for (let day = 1; day <= daysToGenerate; day++) {
    const dayMeals = [];

    for (const mealType of mealTypes) {
      const templates = mealTemplates[mealType as keyof typeof mealTemplates];
      const mealName = templates[Math.floor(Math.random() * templates.length)];

      dayMeals.push({
        type: mealType,
        name: `Day ${day} ${mealName}`,
        calories: Math.round(
          profile.target_calories *
            mealDistribution[mealType as keyof typeof mealDistribution],
        ),
        protein: Math.round(
          profile.protein_grams *
            mealDistribution[mealType as keyof typeof mealDistribution],
        ),
        carbs: Math.round(
          profile.carbs_grams *
            mealDistribution[mealType as keyof typeof mealDistribution],
        ),
        fat: Math.round(
          profile.fat_grams *
            mealDistribution[mealType as keyof typeof mealDistribution],
        ),
        status: "pending_enrichment", // Will be filled by background job
      });
    }

    skeleton[`day_${day}`] = {
      meals: dayMeals,
      daily_totals: {
        calories: profile.target_calories,
        protein: profile.protein_grams,
        carbs: profile.carbs_grams,
        fat: profile.fat_grams,
      },
    };
  }

  return skeleton;
}

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

    // Check cache first
    const cacheKey = generateCacheKey(profile, preferences, daysToGenerate);
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const { createClient: createServiceClient } = await import(
      "@supabase/supabase-js"
    );
    const supabaseAdmin = createServiceClient(supabaseUrl, supabaseServiceKey);

    const { data: cachedPlan } = await supabaseAdmin
      .from("meal_plan_cache")
      .select("*")
      .eq("cache_key", cacheKey)
      .single();

    if (cachedPlan) {
      // Update usage stats
      await supabaseAdmin
        .from("meal_plan_cache")
        .update({
          usage_count: cachedPlan.usage_count + 1,
          last_used_at: new Date().toISOString(),
        })
        .eq("id", cachedPlan.id);

      console.log("Serving meal plan from cache");

      // Return cached plan immediately
      return NextResponse.json({
        success: true,
        cached: true,
        data: {
          meal_plan: cachedPlan.meal_data,
          nutrition_totals: cachedPlan.nutrition_totals,
          shopping_list: cachedPlan.shopping_list,
        },
      });
    }

    // Generate instant skeleton
    const skeleton = generateSkeleton(profile, daysToGenerate);

    // Try to create job for background processing
    const { data: job, error: jobError } = await supabaseAdmin
      .from("meal_plan_jobs")
      .insert({
        profile_id: profile.id,
        client_id: profile.client_id,
        organization_id: userWithOrg.organizationId,
        status: "pending",
        days_requested: daysToGenerate,
        preferences: preferences || {},
        nutrition_profile: profile,
        skeleton_data: skeleton,
      })
      .select()
      .single();

    if (jobError) {
      console.error("Error creating job (table may not exist):", jobError);
      // Fallback to direct generation if job table doesn't exist
      console.log("Falling back to direct generation");

      try {
        const { generateMealPlan } = await import("@/app/lib/openai");
        const mealPlanData = await generateMealPlan(
          profile,
          preferences,
          daysToGenerate,
        );

        // Save directly to meal_plans table
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
          throw saveError;
        }

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
      } catch (fallbackError: any) {
        console.error("Fallback generation also failed:", fallbackError);
        return createErrorResponse(fallbackError);
      }
    }

    console.log("Created meal plan job:", job.id);

    // Trigger processing via separate endpoint to avoid serverless timeout issues
    // This ensures the processing happens even after this response is sent
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      `https://${request.headers.get("host")}`;

    fetch(`${baseUrl}/api/nutrition/process-job/${job.id}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    }).catch((err) => {
      console.error("Failed to trigger job processing:", err);
    });

    // Return immediately with job ID and skeleton
    return NextResponse.json(
      {
        success: true,
        jobId: job.id,
        status: "processing",
        skeleton: skeleton,
        message:
          "Your meal plan is being generated. Check back in a few seconds!",
      },
      { status: 202 },
    ); // 202 Accepted
  } catch (error: any) {
    console.error("Error in meal plan generation:", error);
    return createErrorResponse(error);
  }
}
