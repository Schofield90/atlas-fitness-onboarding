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

    // Get user's organization
    const { data: userOrg, error: userOrgError } = await supabase
      .from("user_organizations")
      .select("organization_id")
      .eq("user_id", user.id)
      .single();

    if (userOrgError) {
      // Try fallback
      const { data: orgData } = await supabase
        .from("organizations")
        .select("id")
        .eq("owner_id", user.id)
        .single();

      if (!orgData) {
        return NextResponse.json({
          error: "No organization found",
          userId: user.id,
          userEmail: user.email,
        });
      }
      userOrg.organization_id = orgData.id;
    }

    const organizationId = userOrg.organization_id;

    // Check contacts table
    const { data: contacts, error: contactsError } = await supabase
      .from("contacts")
      .select("*")
      .eq("organization_id", organizationId);

    // Check leads table
    const { data: leads, error: leadsError } = await supabase
      .from("leads")
      .select("*")
      .eq("organization_id", organizationId);

    // Check user_organizations table
    const { data: userOrgs } = await supabase
      .from("user_organizations")
      .select("*")
      .eq("user_id", user.id);

    return NextResponse.json({
      success: true,
      debug: {
        userId: user.id,
        userEmail: user.email,
        organizationId,
        userOrganizations: userOrgs,
        contactsCount: contacts?.length || 0,
        leadsCount: leads?.length || 0,
        contacts: contacts?.slice(0, 3) || [],
        leads: leads?.slice(0, 3) || [],
        contactsError: contactsError?.message,
        leadsError: leadsError?.message,
      },
    });
  } catch (error) {
    console.error("Debug error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
