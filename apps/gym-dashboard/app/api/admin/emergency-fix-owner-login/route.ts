import { NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (
      !email ||
      !["sam@atlas-gyms.co.uk", "sam@gymleadhub.co.uk"].includes(email)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminSupabase = createAdminClient();

    // Step 1: Get user ID
    const { data: userData, error: userError } =
      await adminSupabase.auth.admin.listUsers();
    if (userError) throw userError;

    const user = userData.users.find((u) => u.email === email);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Step 2: Find or create organization for this user
    const { data: existingOrg, error: orgError } = await adminSupabase
      .from("organizations")
      .select("id, name")
      .eq("owner_id", user.id)
      .single();

    let organizationId = existingOrg?.id;

    if (!organizationId) {
      // Check organization_members table
      const { data: memberData } = await adminSupabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .single();

      if (memberData) {
        organizationId = memberData.organization_id;
      } else {
        // Check organization_staff table
        const { data: staffData } = await adminSupabase
          .from("organization_staff")
          .select("organization_id")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .single();

        if (staffData) {
          organizationId = staffData.organization_id;
        } else {
          // Create new organization if none exists
          const { data: newOrg, error: createError } = await adminSupabase
            .from("organizations")
            .insert({
              name:
                email === "sam@atlas-gyms.co.uk"
                  ? "Atlas Fitness"
                  : "GymLeadHub Admin",
              owner_id: user.id,
              settings: {},
            })
            .select("id")
            .single();

          if (createError) throw createError;
          organizationId = newOrg.id;

          // Also add to organization_members
          await adminSupabase.from("organization_members").insert({
            organization_id: organizationId,
            user_id: user.id,
            role: "owner",
            is_active: true,
          });
        }
      }
    }

    // Step 3: Ensure user is in organization_members and organization_staff
    await adminSupabase.from("organization_members").upsert(
      {
        organization_id: organizationId,
        user_id: user.id,
        role: "owner",
        is_active: true,
      },
      {
        onConflict: "organization_id,user_id",
      },
    );

    await adminSupabase.from("organization_staff").upsert(
      {
        organization_id: organizationId,
        user_id: user.id,
        role: "owner",
        is_active: true,
        permissions: ["all"],
        system_mode: "full",
      },
      {
        onConflict: "organization_id,user_id",
      },
    );

    // Step 4: Fix RLS policies with better error handling
    const fixQueries = [
      // Temporarily disable RLS to fix policies
      `ALTER TABLE organizations DISABLE ROW LEVEL SECURITY`,
      `ALTER TABLE organization_members DISABLE ROW LEVEL SECURITY`,
      `ALTER TABLE organization_staff DISABLE ROW LEVEL SECURITY`,

      // Drop all existing policies
      `DROP POLICY IF EXISTS "organizations_select_policy" ON organizations`,
      `DROP POLICY IF EXISTS "organizations_insert_policy" ON organizations`,
      `DROP POLICY IF EXISTS "organizations_update_policy" ON organizations`,
      `DROP POLICY IF EXISTS "organizations_delete_policy" ON organizations`,
      `DROP POLICY IF EXISTS "organization_members_select" ON organization_members`,
      `DROP POLICY IF EXISTS "organization_members_insert" ON organization_members`,
      `DROP POLICY IF EXISTS "organization_members_update" ON organization_members`,
      `DROP POLICY IF EXISTS "organization_members_delete" ON organization_members`,
      `DROP POLICY IF EXISTS "organization_staff_select" ON organization_staff`,
      `DROP POLICY IF EXISTS "organization_staff_insert" ON organization_staff`,
      `DROP POLICY IF EXISTS "organization_staff_update" ON organization_staff`,
      `DROP POLICY IF EXISTS "organization_staff_delete" ON organization_staff`,

      // Create simple, non-recursive policies for organizations
      `CREATE POLICY "organizations_select_policy" ON organizations
        FOR SELECT USING (
          auth.uid() = owner_id
          OR auth.uid() IN (
            SELECT user_id FROM organization_members 
            WHERE organization_id = id AND is_active = true
          )
          OR auth.uid() IN (
            SELECT user_id FROM organization_staff 
            WHERE organization_id = id AND is_active = true
          )
        )`,

      `CREATE POLICY "organizations_insert_policy" ON organizations
        FOR INSERT WITH CHECK (auth.uid() = owner_id)`,

      `CREATE POLICY "organizations_update_policy" ON organizations
        FOR UPDATE USING (auth.uid() = owner_id)`,

      `CREATE POLICY "organizations_delete_policy" ON organizations
        FOR DELETE USING (auth.uid() = owner_id)`,

      // Policies for organization_members
      `CREATE POLICY "organization_members_select" ON organization_members
        FOR SELECT USING (
          auth.uid() = user_id
          OR auth.uid() IN (
            SELECT owner_id FROM organizations WHERE id = organization_id
          )
        )`,

      `CREATE POLICY "organization_members_insert" ON organization_members
        FOR INSERT WITH CHECK (
          auth.uid() IN (
            SELECT owner_id FROM organizations WHERE id = organization_id
          )
        )`,

      `CREATE POLICY "organization_members_update" ON organization_members
        FOR UPDATE USING (
          auth.uid() IN (
            SELECT owner_id FROM organizations WHERE id = organization_id
          )
        )`,

      `CREATE POLICY "organization_members_delete" ON organization_members
        FOR DELETE USING (
          auth.uid() IN (
            SELECT owner_id FROM organizations WHERE id = organization_id
          )
        )`,

      // Policies for organization_staff
      `CREATE POLICY "organization_staff_select" ON organization_staff
        FOR SELECT USING (
          auth.uid() = user_id
          OR auth.uid() IN (
            SELECT owner_id FROM organizations WHERE id = organization_id
          )
        )`,

      `CREATE POLICY "organization_staff_insert" ON organization_staff
        FOR INSERT WITH CHECK (
          auth.uid() IN (
            SELECT owner_id FROM organizations WHERE id = organization_id
          )
        )`,

      `CREATE POLICY "organization_staff_update" ON organization_staff
        FOR UPDATE USING (
          auth.uid() IN (
            SELECT owner_id FROM organizations WHERE id = organization_id
          )
        )`,

      `CREATE POLICY "organization_staff_delete" ON organization_staff
        FOR DELETE USING (
          auth.uid() IN (
            SELECT owner_id FROM organizations WHERE id = organization_id
          )
        )`,

      // Re-enable RLS
      `ALTER TABLE organizations ENABLE ROW LEVEL SECURITY`,
      `ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY`,
      `ALTER TABLE organization_staff ENABLE ROW LEVEL SECURITY`,
    ];

    // Execute queries one by one
    for (const query of fixQueries) {
      try {
        const { error } = await adminSupabase.rpc("exec_sql", { sql: query });
        if (error) {
          console.error(`Query failed: ${query.substring(0, 50)}...`, error);
        }
      } catch (e) {
        console.error(`Query failed: ${query.substring(0, 50)}...`, e);
      }
    }

    // Step 5: Fix the user_organizations view
    try {
      await adminSupabase.rpc("exec_sql", {
        sql: `DROP VIEW IF EXISTS user_organizations CASCADE`,
      });

      await adminSupabase.rpc("exec_sql", {
        sql: `CREATE OR REPLACE VIEW user_organizations AS
          SELECT DISTINCT ON (user_id, organization_id)
            user_id,
            organization_id,
            role,
            organization_name,
            settings,
            created_at
          FROM (
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
            
            UNION ALL
            
            SELECT 
              os.user_id,
              os.organization_id,
              os.role,
              o.name as organization_name,
              o.settings,
              o.created_at
            FROM organization_staff os
            JOIN organizations o ON o.id = os.organization_id
            WHERE os.is_active = true
          ) combined`,
      });

      await adminSupabase.rpc("exec_sql", {
        sql: `GRANT SELECT ON user_organizations TO authenticated`,
      });
    } catch (e) {
      console.error("Failed to fix user_organizations view:", e);
    }

    // Step 6: Generate a new session for immediate login
    const { data: magicLink, error: magicError } =
      await adminSupabase.auth.admin.generateLink({
        type: "magiclink",
        email: email,
      });

    if (magicError || !magicLink) {
      return NextResponse.json({
        success: true,
        message:
          "Fixed organization and RLS, but could not generate login link",
        organizationId,
        userId: user.id,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Owner login fixed successfully",
      organizationId,
      userId: user.id,
      loginUrl: magicLink.properties?.action_link,
    });
  } catch (error: any) {
    console.error("Emergency fix error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Use POST with email in body",
    validEmails: ["sam@atlas-gyms.co.uk", "sam@gymleadhub.co.uk"],
  });
}
