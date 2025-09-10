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

    // Step 1: Add missing columns to organization_staff table
    const columnsToAdd = [
      { name: "role", type: "TEXT DEFAULT 'member'" },
      { name: "is_active", type: "BOOLEAN DEFAULT true" },
      { name: "permissions", type: "JSONB DEFAULT '[]'::jsonb" },
      { name: "system_mode", type: "TEXT DEFAULT 'ai_coach'" },
      { name: "visible_systems", type: "TEXT[] DEFAULT ARRAY['ai_coach']" },
    ];

    for (const col of columnsToAdd) {
      const { error } = await supabase.rpc("run_sql", {
        query: `
          ALTER TABLE organization_staff 
          ADD COLUMN IF NOT EXISTS ${col.name} ${col.type};
        `,
      });

      if (!error) {
        results.migrations.push(`Added ${col.name} column`);
      }
    }

    // Step 2: Ensure there's at least one staff record for the test user
    const { data: existingStaff } = await supabase
      .from("organization_staff")
      .select("*")
      .eq("user_id", "9f2385c4-c178-435f-80ff-75972314ca2a")
      .eq("organization_id", "63589490-8f55-4157-bd3a-e141594b748e")
      .single();

    if (!existingStaff) {
      const { error: insertError } = await supabase
        .from("organization_staff")
        .insert({
          organization_id: "63589490-8f55-4157-bd3a-e141594b748e",
          user_id: "9f2385c4-c178-435f-80ff-75972314ca2a",
          role: "admin",
          is_active: true,
          permissions: ["all"],
          system_mode: "ai_coach",
          visible_systems: ["ai_coach", "nutrition"],
        });

      if (!insertError) {
        results.migrations.push("Created staff record for test user");
      }
    } else {
      // Update existing record to ensure all fields are set
      const { error: updateError } = await supabase
        .from("organization_staff")
        .update({
          role: existingStaff.role || "admin",
          is_active: existingStaff.is_active ?? true,
          permissions: existingStaff.permissions || ["all"],
          system_mode: existingStaff.system_mode || "ai_coach",
          visible_systems: existingStaff.visible_systems || [
            "ai_coach",
            "nutrition",
          ],
        })
        .eq("user_id", "9f2385c4-c178-435f-80ff-75972314ca2a")
        .eq("organization_id", "63589490-8f55-4157-bd3a-e141594b748e");

      if (!updateError) {
        results.migrations.push("Updated staff record for test user");
      }
    }

    // Step 3: Add indexes for performance
    await supabase.rpc("run_sql", {
      query: `
        CREATE INDEX IF NOT EXISTS idx_organization_staff_user_id 
        ON organization_staff(user_id);
      `,
    });

    await supabase.rpc("run_sql", {
      query: `
        CREATE INDEX IF NOT EXISTS idx_organization_staff_organization_id 
        ON organization_staff(organization_id);
      `,
    });

    results.migrations.push("Added indexes");

    // Step 4: Refresh PostgREST schema cache
    const { error: refreshError } = await supabase.rpc(
      "pgrst_reload_schema_cache",
      {},
    );

    if (!refreshError) {
      results.migrations.push("Refreshed schema cache");
    }

    return NextResponse.json({
      success: true,
      message: "Organization staff table fixed",
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
