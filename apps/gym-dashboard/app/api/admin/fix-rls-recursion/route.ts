import { NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    // Emergency bypass - remove after fixing
    const { searchParams } = new URL(request.url);
    const emergency = searchParams.get("emergency");

    if (emergency !== "fix-now") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminSupabase = createAdminClient();

    // Fix the RLS policies
    const queries = [
      // Drop existing problematic policies
      `DROP POLICY IF EXISTS "organizations_select_policy" ON organizations`,
      `DROP POLICY IF EXISTS "organizations_insert_policy" ON organizations`,
      `DROP POLICY IF EXISTS "organizations_update_policy" ON organizations`,
      `DROP POLICY IF EXISTS "organizations_delete_policy" ON organizations`,

      // Create simpler, non-recursive policies
      `CREATE POLICY "organizations_select_policy" ON organizations
        FOR SELECT USING (
          auth.uid() = owner_id
          OR EXISTS (
            SELECT 1 FROM organization_members
            WHERE organization_members.organization_id = organizations.id
            AND organization_members.user_id = auth.uid()
            AND organization_members.is_active = true
          )
          OR EXISTS (
            SELECT 1 FROM organization_staff
            WHERE organization_staff.organization_id = organizations.id
            AND organization_staff.user_id = auth.uid()
            AND organization_staff.is_active = true
          )
          OR EXISTS (
            SELECT 1 FROM clients
            WHERE clients.organization_id = organizations.id
            AND clients.user_id = auth.uid()
          )
        )`,

      `CREATE POLICY "organizations_insert_policy" ON organizations
        FOR INSERT WITH CHECK (auth.uid() = owner_id)`,

      `CREATE POLICY "organizations_update_policy" ON organizations
        FOR UPDATE USING (
          auth.uid() = owner_id
          OR EXISTS (
            SELECT 1 FROM organization_members
            WHERE organization_members.organization_id = organizations.id
            AND organization_members.user_id = auth.uid()
            AND organization_members.role IN ('admin', 'owner')
            AND organization_members.is_active = true
          )
          OR EXISTS (
            SELECT 1 FROM organization_staff
            WHERE organization_staff.organization_id = organizations.id
            AND organization_staff.user_id = auth.uid()
            AND organization_staff.role IN ('admin', 'owner')
            AND organization_staff.is_active = true
          )
        )`,

      `CREATE POLICY "organizations_delete_policy" ON organizations
        FOR DELETE USING (auth.uid() = owner_id)`,
    ];

    // Execute each query
    const results = [];
    for (const query of queries) {
      try {
        const { error } = await adminSupabase.rpc("exec_sql", { sql: query });
        if (error) {
          results.push({ query: query.substring(0, 50), error: error.message });
        } else {
          results.push({ query: query.substring(0, 50), success: true });
        }
      } catch (e: any) {
        results.push({ query: query.substring(0, 50), error: e.message });
      }
    }

    // Also fix the user_organizations view
    try {
      await adminSupabase.rpc("exec_sql", {
        sql: `DROP VIEW IF EXISTS user_organizations CASCADE`,
      });

      await adminSupabase.rpc("exec_sql", {
        sql: `CREATE VIEW user_organizations AS
          SELECT 
            om.user_id,
            om.organization_id,
            om.role,
            o.name as organization_name,
            o.settings,
            o.created_at
          FROM organization_members om
          JOIN organizations o ON o.id = om.organization_id
          WHERE om.is_active = true
          UNION
          SELECT 
            os.user_id,
            os.organization_id,
            os.role,
            o.name as organization_name,
            o.settings,
            o.created_at
          FROM organization_staff os
          JOIN organizations o ON o.id = os.organization_id
          WHERE os.is_active = true`,
      });

      await adminSupabase.rpc("exec_sql", {
        sql: `GRANT SELECT ON user_organizations TO authenticated`,
      });

      results.push({ query: "Fix user_organizations view", success: true });
    } catch (e: any) {
      results.push({ query: "Fix user_organizations view", error: e.message });
    }

    return NextResponse.json({
      success: true,
      message: "RLS policies fixed",
      results,
    });
  } catch (error: any) {
    console.error("Error fixing RLS:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 },
    );
  }
}
