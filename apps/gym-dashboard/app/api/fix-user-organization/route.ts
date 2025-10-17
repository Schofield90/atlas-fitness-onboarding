import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Check if user already has organization
    const { data: existingOrg } = await supabase
      .from("user_organizations")
      .select("organization_id")
      .eq("user_id", user.id)
      .single();

    if (existingOrg) {
      return NextResponse.json({
        message: "User already has organization",
        organizationId: existingOrg.organization_id,
        userId: user.id,
      });
    }

    // Add user to Atlas Fitness organization
    const ATLAS_FITNESS_ORG_ID = "63589490-8f55-4157-bd3a-e141594b748e";

    const { data: newAssociation, error: insertError } = await supabase
      .from("user_organizations")
      .insert({
        user_id: user.id,
        organization_id: ATLAS_FITNESS_ORG_ID,
        role: "owner",
      })
      .select()
      .single();

    if (insertError) {
      // Try upsert in case of conflict
      const { data: upsertData, error: upsertError } = await supabase
        .from("user_organizations")
        .upsert(
          {
            user_id: user.id,
            organization_id: ATLAS_FITNESS_ORG_ID,
            role: "owner",
          },
          {
            onConflict: "user_id",
          },
        )
        .select()
        .single();

      if (upsertError) {
        return NextResponse.json(
          {
            error: "Failed to add organization",
            details: upsertError.message,
          },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        message: "Organization added successfully (upsert)",
        organizationId: ATLAS_FITNESS_ORG_ID,
        userId: user.id,
        data: upsertData,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Organization added successfully",
      organizationId: ATLAS_FITNESS_ORG_ID,
      userId: user.id,
      data: newAssociation,
    });
  } catch (error) {
    console.error("Fix error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  // Also fix organization_members table for compatibility
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const ATLAS_FITNESS_ORG_ID = "63589490-8f55-4157-bd3a-e141594b748e";

    // Fix user_organizations table
    const { error: userOrgError } = await supabase
      .from("user_organizations")
      .upsert(
        {
          user_id: user.id,
          organization_id: ATLAS_FITNESS_ORG_ID,
          role: "owner",
        },
        {
          onConflict: "user_id",
        },
      );

    // Fix organization_members table (older table)
    const { error: orgMemberError } = await supabase
      .from("organization_members")
      .upsert(
        {
          user_id: user.id,
          organization_id: ATLAS_FITNESS_ORG_ID,
          role: "owner",
          is_active: true,
        },
        {
          onConflict: "user_id,organization_id",
        },
      );

    // Now test the contacts debug endpoint
    const { data: orgData } = await supabase
      .from("user_organizations")
      .select("organization_id")
      .eq("user_id", user.id)
      .single();

    // Check leads
    const { data: leads, error: leadsError } = await supabase
      .from("leads")
      .select("id, name, email, source")
      .eq("organization_id", ATLAS_FITNESS_ORG_ID)
      .limit(5);

    // Check contacts
    const { data: contacts, error: contactsError } = await supabase
      .from("contacts")
      .select("id, first_name, last_name, email")
      .eq("organization_id", ATLAS_FITNESS_ORG_ID)
      .limit(5);

    return NextResponse.json({
      success: true,
      message: "Fixed organization associations",
      userId: user.id,
      userEmail: user.email,
      organizationId: ATLAS_FITNESS_ORG_ID,
      userOrgError: userOrgError?.message,
      orgMemberError: orgMemberError?.message,
      currentOrg: orgData?.organization_id,
      sampleLeads: leads || [],
      leadsCount: leads?.length || 0,
      leadsError: leadsError?.message,
      sampleContacts: contacts || [],
      contactsCount: contacts?.length || 0,
      contactsError: contactsError?.message,
    });
  } catch (error) {
    console.error("Fix error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
