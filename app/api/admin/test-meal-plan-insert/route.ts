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

    console.log("Testing simple meal plan insert...");

    // Test 1: Check if meal_data column exists
    const { data: columnTest, error: columnError } = await supabaseAdmin
      .from("meal_plans")
      .select("meal_data")
      .limit(1);

    const hasMealDataColumn =
      !columnError || !columnError.message?.includes("column");

    // Test 2: Get a nutrition profile to use
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from("nutrition_profiles")
      .select("id, organization_id")
      .limit(1);

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({
        success: false,
        message:
          "No nutrition profiles found - create a nutrition profile first",
        hasMealDataColumn,
      });
    }

    const profile = profiles[0];

    // Test 3: Try to insert a simple meal plan
    const testDate = new Date().toISOString().split("T")[0];
    const testPlan = {
      nutrition_profile_id: profile.id,
      organization_id: profile.organization_id,
      name: `Test Plan ${Date.now()}`,
      description: "Simple test meal plan",
      meal_data: {
        test: true,
        created: new Date().toISOString(),
      },
      is_active: true,
      daily_calories: 2000,
      daily_protein: 150,
      daily_carbs: 250,
      daily_fat: 67,
      start_date: testDate,
      end_date: testDate,
    };

    console.log("Attempting to insert:", JSON.stringify(testPlan, null, 2));

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("meal_plans")
      .insert(testPlan)
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({
        success: false,
        message: "Failed to insert meal plan",
        error: {
          message: insertError.message,
          code: insertError.code,
          hint: insertError.hint,
          details: insertError.details,
        },
        testData: testPlan,
        hasMealDataColumn,
      });
    }

    // Clean up test data
    if (inserted) {
      await supabaseAdmin.from("meal_plans").delete().eq("id", inserted.id);
    }

    return NextResponse.json({
      success: true,
      message: "Meal plan insert successful!",
      insertedId: inserted.id,
      hasMealDataColumn,
    });
  } catch (error) {
    console.error("Test error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Test failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
