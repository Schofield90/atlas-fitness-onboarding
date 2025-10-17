import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: Request) {
  try {
    // Create admin client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const results: any = {
      migrations: [],
    };

    // Create meal_plans table if it doesn't exist
    const { error: createTableError } = await supabase.rpc("run_sql", {
      query: `
        CREATE TABLE IF NOT EXISTS meal_plans (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          nutrition_profile_id UUID NOT NULL REFERENCES nutrition_profiles(id) ON DELETE CASCADE,
          organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          description TEXT,
          duration_days INTEGER DEFAULT 7,
          meals_per_day INTEGER DEFAULT 5,
          daily_calories INTEGER,
          daily_protein INTEGER,
          daily_carbs INTEGER,
          daily_fat INTEGER,
          daily_fiber INTEGER DEFAULT 25,
          meal_data JSONB,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `,
    });

    if (!createTableError) {
      results.migrations.push("Created meal_plans table");
    }

    // Add indexes
    await supabase.rpc("run_sql", {
      query: `
        CREATE INDEX IF NOT EXISTS idx_meal_plans_nutrition_profile_id 
        ON meal_plans(nutrition_profile_id);
      `,
    });

    await supabase.rpc("run_sql", {
      query: `
        CREATE INDEX IF NOT EXISTS idx_meal_plans_organization_id 
        ON meal_plans(organization_id);
      `,
    });

    await supabase.rpc("run_sql", {
      query: `
        CREATE INDEX IF NOT EXISTS idx_meal_plans_is_active 
        ON meal_plans(is_active);
      `,
    });

    results.migrations.push("Added indexes");

    // Enable RLS
    await supabase.rpc("run_sql", {
      query: `ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;`,
    });

    // Drop and recreate policies
    const policies = [
      "Users can view their own meal plans",
      "Users can create their own meal plans",
      "Users can update their own meal plans",
      "Users can delete their own meal plans",
    ];

    for (const policy of policies) {
      await supabase.rpc("run_sql", {
        query: `DROP POLICY IF EXISTS "${policy}" ON meal_plans;`,
      });
    }

    // Create RLS policies
    await supabase.rpc("run_sql", {
      query: `
        CREATE POLICY "Users can view their own meal plans" ON meal_plans
        FOR SELECT USING (
          nutrition_profile_id IN (
            SELECT id FROM nutrition_profiles 
            WHERE client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
          )
        );
      `,
    });

    await supabase.rpc("run_sql", {
      query: `
        CREATE POLICY "Users can create their own meal plans" ON meal_plans
        FOR INSERT WITH CHECK (
          nutrition_profile_id IN (
            SELECT id FROM nutrition_profiles 
            WHERE client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
          )
        );
      `,
    });

    await supabase.rpc("run_sql", {
      query: `
        CREATE POLICY "Users can update their own meal plans" ON meal_plans
        FOR UPDATE USING (
          nutrition_profile_id IN (
            SELECT id FROM nutrition_profiles 
            WHERE client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
          )
        );
      `,
    });

    await supabase.rpc("run_sql", {
      query: `
        CREATE POLICY "Users can delete their own meal plans" ON meal_plans
        FOR DELETE USING (
          nutrition_profile_id IN (
            SELECT id FROM nutrition_profiles 
            WHERE client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
          )
        );
      `,
    });

    results.migrations.push("Created RLS policies");

    // Refresh PostgREST schema cache
    const { error: refreshError } = await supabase.rpc(
      "pgrst_reload_schema_cache",
      {},
    );

    if (!refreshError) {
      results.migrations.push("Refreshed schema cache");
    }

    return NextResponse.json({
      success: true,
      message: "Meal plans table created successfully",
      results,
    });
  } catch (error: any) {
    console.error("Migration error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        details: error,
      },
      { status: 500 },
    );
  }
}
