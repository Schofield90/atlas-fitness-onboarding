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

    // Get one meal plan to see structure
    const { data: samplePlan, error } = await supabaseAdmin
      .from("meal_plans")
      .select("*")
      .limit(1)
      .single();

    if (error && error.code === "PGRST116") {
      return NextResponse.json({
        success: true,
        message: "No meal plans found in database",
        columns: [],
        sampleData: null,
      });
    }

    if (error) {
      return NextResponse.json({
        success: false,
        error: "Failed to fetch meal plan",
        details: error,
      });
    }

    // Get column names
    const columns = samplePlan ? Object.keys(samplePlan) : [];

    // Count total meal plans
    const { count } = await supabaseAdmin
      .from("meal_plans")
      .select("*", { count: "exact", head: true });

    return NextResponse.json({
      success: true,
      message: `Found ${count} meal plans`,
      columns: columns,
      columnTypes: columns.reduce(
        (acc, col) => {
          acc[col] = typeof samplePlan[col];
          return acc;
        },
        {} as Record<string, string>,
      ),
      sampleData: samplePlan,
      hasData: {
        meal_data: !!samplePlan?.meal_data,
        meals: !!samplePlan?.meals,
        data: !!samplePlan?.data,
        meal_plan_data: !!samplePlan?.meal_plan_data,
      },
    });
  } catch (error) {
    console.error("Error checking meal plans:", error);
    return NextResponse.json(
      { error: "Failed to check meal plans", details: error },
      { status: 500 },
    );
  }
}
