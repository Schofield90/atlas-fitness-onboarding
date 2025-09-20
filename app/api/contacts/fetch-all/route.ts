import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Not authenticated", userError },
        { status: 401 },
      );
    }

    // Get user's organization
    const { data: userOrg } = await supabase
      .from("user_organizations")
      .select("organization_id")
      .eq("user_id", user.id)
      .single();

    const organizationId =
      userOrg?.organization_id || "63589490-8f55-4157-bd3a-e141594b748e";

    // Fetch contacts
    const {
      data: contacts,
      error: contactsError,
      count: contactsCount,
    } = await supabase
      .from("contacts")
      .select("*", { count: "exact" })
      .eq("organization_id", organizationId)
      .limit(10);

    // Fetch leads
    const {
      data: leads,
      error: leadsError,
      count: leadsCount,
    } = await supabase
      .from("leads")
      .select("*", { count: "exact" })
      .eq("organization_id", organizationId)
      .limit(10);

    // Create combined list
    const allContacts = [];

    // Add contacts
    if (contacts) {
      contacts.forEach((contact) => {
        allContacts.push({
          ...contact,
          _source: "contacts_table",
        });
      });
    }

    // Add leads that don't have a contact record
    if (leads) {
      const contactLeadIds = new Set(
        contacts?.map((c) => c.lead_id).filter(Boolean) || [],
      );

      leads.forEach((lead) => {
        if (!contactLeadIds.has(lead.id)) {
          allContacts.push({
            id: `lead-${lead.id}`,
            first_name: lead.name?.split(" ")[0] || "",
            last_name: lead.name?.split(" ").slice(1).join(" ") || "",
            email: lead.email || "",
            phone: lead.phone || "",
            lead_id: lead.id,
            organization_id: lead.organization_id,
            created_at: lead.created_at,
            updated_at: lead.updated_at,
            tags: [lead.source, ...(lead.metadata?.tags || [])].filter(Boolean),
            _source: "leads_table",
            _original_lead: lead,
          });
        }
      });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
      },
      organizationId,
      stats: {
        contactsCount: contactsCount || 0,
        leadsCount: leadsCount || 0,
        combinedCount: allContacts.length,
      },
      data: {
        contacts: contacts || [],
        leads: leads || [],
        combined: allContacts,
      },
      errors: {
        contactsError: contactsError?.message,
        leadsError: leadsError?.message,
      },
    });
  } catch (error) {
    console.error("Fetch error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
