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

    console.log("Applying meal_data column migration...");

    // Check current columns in meal_plans
    const { data: currentPlan, error: checkError } = await supabaseAdmin
      .from("meal_plans")
      .select("*")
      .limit(1)
      .single();

    const currentColumns = currentPlan ? Object.keys(currentPlan) : [];
    const hasMealData = currentColumns.includes("meal_data");

    if (hasMealData) {
      return NextResponse.json({
        success: true,
        message: "meal_data column already exists",
        columns: currentColumns,
      });
    }

    // If meal_data doesn't exist, we need to add it
    // Since we can't run raw SQL, we'll provide instructions
    return NextResponse.json({
      success: false,
      message: "meal_data column is missing",
      columns: currentColumns,
      instruction: "Please run the following SQL in your database:",
      sql: `
-- Add meal_data column to meal_plans
ALTER TABLE meal_plans 
ADD COLUMN IF NOT EXISTS meal_data JSONB;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_meal_plans_meal_data 
ON meal_plans USING gin (meal_data);

-- Grant permissions
GRANT ALL ON meal_plans TO authenticated;
GRANT ALL ON meal_plans TO service_role;
      `,
    });
  } catch (error) {
    console.error("Migration check error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Migration check failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
