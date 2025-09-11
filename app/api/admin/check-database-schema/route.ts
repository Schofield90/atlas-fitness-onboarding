import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
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

    // Try to get schema information
    const tables = ["meal_plans", "recipes", "nutrition_profiles"];
    const schema = {};

    for (const table of tables) {
      try {
        // Get one row to see columns
        const { data, error } = await supabaseAdmin
          .from(table)
          .select("*")
          .limit(1);

        if (!error) {
          const { count } = await supabaseAdmin
            .from(table)
            .select("*", { count: "exact", head: true });

          schema[table] = {
            exists: true,
            rowCount: count || 0,
            columns: data && data.length > 0 ? Object.keys(data[0]) : [],
            sampleRow: data && data.length > 0 ? data[0] : null,
          };
        } else {
          schema[table] = {
            exists: false,
            error: error.message,
            code: error.code,
          };
        }
      } catch (err) {
        schema[table] = {
          exists: false,
          error: err.message,
        };
      }
    }

    // Create a test meal plan to see what works
    const testMealPlan = {
      name: "Test Meal Plan",
      description: "Testing meal plan structure",
      is_active: true,
      daily_calories: 2000,
      daily_protein: 150,
      daily_carbs: 250,
      daily_fat: 67,
      start_date: new Date().toISOString().split("T")[0],
      end_date: new Date().toISOString().split("T")[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    let mealPlanTest = { success: false, error: null, data: null };

    try {
      const { data, error } = await supabaseAdmin
        .from("meal_plans")
        .insert(testMealPlan)
        .select()
        .single();

      if (error) {
        mealPlanTest.error = {
          message: error.message,
          code: error.code,
          hint: error.hint,
          details: error.details,
        };
      } else {
        mealPlanTest.success = true;
        mealPlanTest.data = data;

        // Delete the test plan
        await supabaseAdmin.from("meal_plans").delete().eq("id", data.id);
      }
    } catch (err) {
      mealPlanTest.error = err.message;
    }

    return NextResponse.json({
      success: true,
      schema,
      mealPlanTest,
      recommendations: [
        !schema.meal_plans?.columns?.includes("meal_data")
          ? "meal_plans table is missing meal_data column - add it via migration"
          : null,
        schema.meal_plans?.rowCount === 0
          ? "No meal plans in database - generate some meal plans first"
          : null,
        schema.recipes?.rowCount === 0
          ? "No recipes in database - they will be created when you generate meal plans"
          : null,
      ].filter(Boolean),
    });
  } catch (error) {
    console.error("Schema check error:", error);
    return NextResponse.json(
      { error: "Failed to check schema", details: error },
      { status: 500 },
    );
  }
}
