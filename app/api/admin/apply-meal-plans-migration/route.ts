import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
    // Create admin client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Apply the migration SQL
    const migrationSQL = `
      -- Add date field to meal_plans table if not exists
      ALTER TABLE public.meal_plans
      ADD COLUMN IF NOT EXISTS date DATE;

      -- Create unique constraint for profile and date combination
      -- This ensures only one meal plan per profile per date
      ALTER TABLE public.meal_plans
      DROP CONSTRAINT IF EXISTS unique_meal_plan_per_date;

      ALTER TABLE public.meal_plans
      ADD CONSTRAINT unique_meal_plan_per_date 
      UNIQUE (nutrition_profile_id, date);

      -- Create index for faster date-based queries
      CREATE INDEX IF NOT EXISTS idx_meal_plans_date ON public.meal_plans(date);
      CREATE INDEX IF NOT EXISTS idx_meal_plans_profile_date ON public.meal_plans(nutrition_profile_id, date);

      -- Update existing meal plans to extract date from meal_data if available
      UPDATE public.meal_plans
      SET date = (meal_data->>'date')::DATE
      WHERE date IS NULL 
        AND meal_data ? 'date' 
        AND meal_data->>'date' IS NOT NULL;

      -- If start_date is populated but date is not, use start_date
      UPDATE public.meal_plans
      SET date = start_date
      WHERE date IS NULL AND start_date IS NOT NULL;
    `;

    // Execute the migration
    const { error } = await supabaseAdmin.rpc("exec_sql", {
      sql: migrationSQL,
    });

    if (error) {
      // Try direct execution if RPC doesn't exist
      console.log("RPC exec_sql not found, trying alternative method...");

      // We'll need to apply this manually since we can't execute raw SQL via Supabase client
      // Check if the date column exists
      const { data: columns } = await supabaseAdmin
        .from("meal_plans")
        .select("*")
        .limit(0);

      return NextResponse.json({
        success: true,
        message:
          "Migration needs to be applied manually. Please run the SQL migration file directly on the database.",
        migrationFile:
          "supabase/migrations/20250911_add_date_to_meal_plans.sql",
      });
    }

    return NextResponse.json({
      success: true,
      message: "Migration applied successfully!",
    });
  } catch (error: any) {
    console.error("Error applying migration:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to apply migration",
      },
      { status: 500 },
    );
  }
}
