import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

export async function GET() {
  try {
    const supabase = createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          error: "Not authenticated",
          details: userError,
        },
        { status: 401 },
      );
    }

    // Check user_organizations table
    const { data: userOrg, error: userOrgError } = await supabase
      .from("user_organizations")
      .select("*")
      .eq("user_id", user.id)
      .single();

    // Check organization_members table
    const { data: orgMember, error: orgMemberError } = await supabase
      .from("organization_members")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    // Get organization ID from either source
    const organizationId =
      userOrg?.organization_id || orgMember?.organization_id;

    // Count contacts with organization_id
    const { count: contactsWithOrg } = await supabase
      .from("contacts")
      .select("*", { count: "exact" })
      .eq(
        "organization_id",
        organizationId || "63589490-8f55-4157-bd3a-e141594b748e",
      );

    // Count contacts without organization_id (if column exists)
    const { count: contactsWithoutOrg, error: noOrgError } = await supabase
      .from("contacts")
      .select("*", { count: "exact" })
      .is("organization_id", null);

    // Count total contacts
    const { count: totalContacts } = await supabase
      .from("contacts")
      .select("*", { count: "exact" });

    // Get sample contacts
    const { data: sampleContacts, error: sampleError } = await supabase
      .from("contacts")
      .select("id, organization_id, first_name, last_name, email, created_at")
      .limit(5)
      .order("created_at", { ascending: false });

    // Count leads
    const { count: totalLeads } = await supabase
      .from("leads")
      .select("*", { count: "exact" })
      .eq(
        "organization_id",
        organizationId || "63589490-8f55-4157-bd3a-e141594b748e",
      );

    // Check table columns
    const { data: tableInfo, error: tableError } = await supabase
      .rpc("get_table_columns", { table_name: "contacts" })
      .select("*");

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
      },
      organization: {
        userOrg,
        userOrgError: userOrgError?.message,
        orgMember,
        orgMemberError: orgMemberError?.message,
        organizationId,
      },
      contacts: {
        totalContacts,
        contactsWithOrg,
        contactsWithoutOrg,
        noOrgError: noOrgError?.message,
        sampleContacts,
        sampleError: sampleError?.message,
      },
      leads: {
        totalLeads,
      },
      tableStructure: {
        hasOrgIdColumn: !noOrgError || noOrgError.message?.includes("column"),
        tableInfo,
        tableError: tableError?.message,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Server error",
        details: error?.message || error,
      },
      { status: 500 },
    );
  }
}

// Helper function to check table structure
export async function POST() {
  try {
    const supabase = createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          error: "Not authenticated",
          details: userError,
        },
        { status: 401 },
      );
    }

    // Try to run the fix
    const fixQueries = [
      // Add organization_id column if missing
      `ALTER TABLE contacts ADD COLUMN IF NOT EXISTS organization_id UUID`,

      // Update existing contacts
      `UPDATE contacts 
       SET organization_id = '63589490-8f55-4157-bd3a-e141594b748e'
       WHERE organization_id IS NULL`,

      // Ensure user has organization association
      `INSERT INTO user_organizations (user_id, organization_id, role)
       VALUES ('${user.id}', '63589490-8f55-4157-bd3a-e141594b748e', 'owner')
       ON CONFLICT (user_id) DO NOTHING`,
    ];

    const results = [];
    for (const query of fixQueries) {
      try {
        const { error } = await supabase.rpc("exec_sql", { query });
        results.push({
          query: query.substring(0, 50) + "...",
          error: error?.message || "Success",
        });
      } catch (e: any) {
        results.push({
          query: query.substring(0, 50) + "...",
          error: e?.message || "Failed",
        });
      }
    }

    return NextResponse.json({
      message: "Fix attempt completed",
      results,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Server error",
        details: error?.message || error,
      },
      { status: 500 },
    );
  }
}
