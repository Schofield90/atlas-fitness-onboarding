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

    console.log("Running recipes diagnostic...");

    // 1. Check if table exists and get column info
    const { data: tableCheck, error: tableError } = await supabaseAdmin
      .from("recipes")
      .select("*")
      .limit(0);

    // 2. Count total recipes
    const { count: totalCount } = await supabaseAdmin
      .from("recipes")
      .select("*", { count: "exact", head: true });

    // 3. Get sample recipes
    const { data: sampleRecipes, error: sampleError } = await supabaseAdmin
      .from("recipes")
      .select("id, name, meal_type, calories, created_at, status")
      .limit(5)
      .order("created_at", { ascending: false });

    // 4. Try to create a minimal test recipe
    const minimalRecipe = {
      name: `Diagnostic Test ${Date.now()}`,
      description: "Minimal test recipe",
      meal_type: "lunch",
      calories: 300,
      protein: 20,
      carbs: 30,
      fat: 10,
      ingredients: JSON.stringify([{ item: "test", amount: "100", unit: "g" }]),
      instructions: JSON.stringify(["Test instruction"]),
      source: "ai_generated",
      status: "active",
    };

    const { data: testCreate, error: createError } = await supabaseAdmin
      .from("recipes")
      .insert(minimalRecipe)
      .select()
      .single();

    // 5. Check RLS policies (skip if RPC not available)
    let policies = null;
    let policyError = null;
    try {
      const result = await supabaseAdmin.rpc("get_policies", {
        table_name: "recipes",
      });
      policies = result.data;
      policyError = result.error;
    } catch (e) {
      policyError = "RPC function not available";
    }

    // 6. Get meal plans with recipes
    const { data: mealPlans, error: mealPlanError } = await supabaseAdmin
      .from("meal_plans")
      .select("id, name, meal_data")
      .not("meal_data", "is", null)
      .limit(3);

    const mealPlanSummary = mealPlans?.map((plan) => ({
      id: plan.id,
      name: plan.name,
      hasMeals: plan.meal_data?.meals?.length || 0,
    }));

    return NextResponse.json({
      success: true,
      diagnostics: {
        tableExists: !tableError,
        totalRecipes: totalCount || 0,
        sampleRecipes: sampleRecipes || [],
        testRecipeCreated: !!testCreate,
        testRecipeId: testCreate?.id,
        testRecipeError: createError
          ? {
              message: createError.message,
              code: createError.code,
              hint: createError.hint,
            }
          : null,
        mealPlansWithData: mealPlanSummary || [],
        errors: {
          table: tableError?.message,
          sample: sampleError?.message,
          create: createError?.message,
          mealPlan: mealPlanError?.message,
        },
      },
      recommendations: [
        totalCount === 0
          ? "No recipes found. Run migration endpoint to import from meal plans."
          : null,
        createError ? "Recipe creation failed. Check table schema." : null,
        !tableError && totalCount > 0 ? "Everything looks good!" : null,
      ].filter(Boolean),
    });
  } catch (error) {
    console.error("Diagnostic error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Diagnostic failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
