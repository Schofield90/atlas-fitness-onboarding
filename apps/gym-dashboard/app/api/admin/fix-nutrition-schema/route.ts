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

    // Step 1: Check if nutrition_profiles table exists and get its structure
    const { data: tableCheck, error: tableError } = await supabase.rpc(
      "run_sql",
      {
        query: `
          SELECT column_name, data_type, is_nullable 
          FROM information_schema.columns 
          WHERE table_name = 'nutrition_profiles' 
          ORDER BY ordinal_position;
        `,
      },
    );

    let currentColumns: string[] = [];
    if (tableCheck && Array.isArray(tableCheck)) {
      currentColumns = tableCheck.map((col: any) => col.column_name);
    }

    const results: any = {
      currentColumns,
      migrations: [],
    };

    // Step 2: Add client_id column if it doesn't exist
    if (!currentColumns.includes("client_id")) {
      const { error: addClientIdError } = await supabase.rpc("run_sql", {
        query: `
          ALTER TABLE nutrition_profiles 
          ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE CASCADE;
        `,
      });

      if (!addClientIdError) {
        results.migrations.push("Added client_id column");

        // Create index for client_id
        await supabase.rpc("run_sql", {
          query: `
            CREATE INDEX IF NOT EXISTS idx_nutrition_profiles_client_id 
            ON nutrition_profiles(client_id) WHERE client_id IS NOT NULL;
          `,
        });
        results.migrations.push("Added client_id index");
      }
    }

    // Step 3: Make lead_id nullable if it isn't already
    const { error: nullableError } = await supabase.rpc("run_sql", {
      query: `
        ALTER TABLE nutrition_profiles 
        ALTER COLUMN lead_id DROP NOT NULL;
      `,
    });

    if (!nullableError) {
      results.migrations.push("Made lead_id nullable");
    }

    // Step 4: Add alternative column names for compatibility
    const columnsToAdd = [
      {
        name: "sex",
        type: "VARCHAR(10)",
        check: "CHECK (sex IN ('MALE', 'FEMALE', 'OTHER'))",
      },
      {
        name: "height",
        type: "INTEGER",
        check: "CHECK (height > 0 AND height <= 300)",
      },
      {
        name: "current_weight",
        type: "DECIMAL(5,2)",
        check: "CHECK (current_weight > 0 AND current_weight <= 500)",
      },
      {
        name: "goal_weight",
        type: "DECIMAL(5,2)",
        check: "CHECK (goal_weight > 0 AND goal_weight <= 500)",
      },
      {
        name: "target_protein",
        type: "INTEGER",
        check: "CHECK (target_protein >= 0)",
      },
      {
        name: "target_carbs",
        type: "INTEGER",
        check: "CHECK (target_carbs >= 0)",
      },
      { name: "target_fat", type: "INTEGER", check: "CHECK (target_fat >= 0)" },
      {
        name: "target_fiber",
        type: "INTEGER DEFAULT 25",
        check: "CHECK (target_fiber >= 0)",
      },
    ];

    for (const col of columnsToAdd) {
      if (!currentColumns.includes(col.name)) {
        const query = `
          ALTER TABLE nutrition_profiles 
          ADD COLUMN IF NOT EXISTS ${col.name} ${col.type} ${col.check || ""};
        `;

        const { error } = await supabase.rpc("run_sql", { query });
        if (!error) {
          results.migrations.push(`Added ${col.name} column`);
        }
      }
    }

    // Step 5: Drop and recreate the constraint to allow either client_id or lead_id
    await supabase.rpc("run_sql", {
      query: `
        ALTER TABLE nutrition_profiles 
        DROP CONSTRAINT IF EXISTS nutrition_profiles_person_ref_check;
      `,
    });

    const { error: constraintError } = await supabase.rpc("run_sql", {
      query: `
        ALTER TABLE nutrition_profiles 
        ADD CONSTRAINT nutrition_profiles_person_ref_check 
        CHECK (
          (client_id IS NOT NULL AND lead_id IS NULL) OR 
          (client_id IS NULL AND lead_id IS NOT NULL) OR
          (client_id IS NOT NULL AND lead_id IS NOT NULL)
        );
      `,
    });

    if (!constraintError) {
      results.migrations.push("Updated person reference constraint");
    }

    // Step 6: Update RLS policies
    await supabase.rpc("run_sql", {
      query: `
        DROP POLICY IF EXISTS "Clients can view own nutrition profile" ON nutrition_profiles;
      `,
    });

    const { error: policyError } = await supabase.rpc("run_sql", {
      query: `
        CREATE POLICY "Clients can view own nutrition profile" ON nutrition_profiles
        FOR SELECT USING (
          client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()) OR
          lead_id IN (SELECT id FROM leads WHERE user_id = auth.uid())
        );
      `,
    });

    if (!policyError) {
      results.migrations.push("Updated RLS policies");
    }

    // Step 7: Refresh PostgREST schema cache
    const { error: refreshError } = await supabase.rpc(
      "pgrst_reload_schema_cache",
      {},
    );

    if (!refreshError) {
      results.migrations.push("Refreshed schema cache");
    }

    // Step 8: Test the schema
    const testProfile = {
      client_id: "00000000-0000-0000-0000-000000000000",
      organization_id: "00000000-0000-0000-0000-000000000000",
      age: 25,
      gender: "MALE",
      height_cm: 180,
      weight_kg: 75,
      goal: "MAINTAIN",
      activity_level: "MODERATELY_ACTIVE",
      bmr: 1800,
      tdee: 2500,
      target_calories: 2500,
      protein_grams: 150,
      carbs_grams: 300,
      fat_grams: 80,
    };

    const { error: testError } = await supabase
      .from("nutrition_profiles")
      .insert(testProfile);

    results.schemaTest = {
      success: !testError || testError.code === "23503", // FK error is expected with test UUIDs
      error: testError?.message,
    };

    // Clean up test insert if it succeeded
    if (!testError) {
      await supabase
        .from("nutrition_profiles")
        .delete()
        .eq("client_id", "00000000-0000-0000-0000-000000000000");
    }

    return NextResponse.json({
      success: true,
      message: "Schema migration completed",
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
