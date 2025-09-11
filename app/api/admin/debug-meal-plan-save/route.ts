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

    console.log("Testing meal plan saving...");

    // 1. Get table columns
    const { data: columnsTest, error: columnsError } = await supabaseAdmin
      .from("meal_plans")
      .select("*")
      .limit(0);

    // 2. Try to insert a minimal test meal plan
    const testDate = new Date().toISOString().split("T")[0];
    const minimalPlan = {
      name: `Test Plan ${Date.now()}`,
      description: "Test meal plan",
      is_active: true,
      daily_calories: 2000,
      daily_protein: 150,
      daily_carbs: 250,
      daily_fat: 67,
      start_date: testDate,
      end_date: testDate,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: insertTest, error: insertError } = await supabaseAdmin
      .from("meal_plans")
      .insert(minimalPlan)
      .select()
      .single();

    // 3. Try with nutrition_profile_id (might be required)
    let withProfileTest = null;
    let withProfileError = null;

    if (insertError) {
      // Get a sample nutrition profile
      const { data: profile } = await supabaseAdmin
        .from("nutrition_profiles")
        .select("id, organization_id")
        .limit(1)
        .single();

      if (profile) {
        const planWithProfile = {
          ...minimalPlan,
          nutrition_profile_id: profile.id,
          organization_id: profile.organization_id,
        };

        const result = await supabaseAdmin
          .from("meal_plans")
          .insert(planWithProfile)
          .select()
          .single();

        withProfileTest = result.data;
        withProfileError = result.error;
      }
    }

    // 4. Check if there are any required columns
    const { data: checkConstraints } = await supabaseAdmin
      .rpc("get_table_constraints", { table_name: "meal_plans" })
      .catch(() => ({ data: null }));

    return NextResponse.json({
      success: true,
      tests: {
        tableExists: !columnsError,
        minimalInsert: {
          success: !!insertTest,
          data: insertTest,
          error: insertError
            ? {
                message: insertError.message,
                code: insertError.code,
                hint: insertError.hint,
                details: insertError.details,
              }
            : null,
        },
        withProfileInsert: {
          success: !!withProfileTest,
          data: withProfileTest,
          error: withProfileError
            ? {
                message: withProfileError.message,
                code: withProfileError.code,
                hint: withProfileError.hint,
                details: withProfileError.details,
              }
            : null,
        },
        constraints: checkConstraints,
      },
      recommendation: insertError
        ? "Meal plan insert failed - check if nutrition_profile_id is required"
        : "Meal plans can be saved successfully",
    });
  } catch (error) {
    console.error("Debug error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Debug failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
