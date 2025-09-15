import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const { organizationId } = await request.json();
    const supabaseAdmin = createAdminClient();

    // Get all leads without client_id for this organization
    const { data: leads } = await supabaseAdmin
      .from("leads")
      .select("*")
      .eq("organization_id", organizationId)
      .is("client_id", null);

    if (!leads || leads.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No unlinked leads found",
        linked: 0,
      });
    }

    // Get all clients for this organization
    const { data: clients } = await supabaseAdmin
      .from("clients")
      .select("id, email, name")
      .eq("organization_id", organizationId);

    if (!clients || clients.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No clients found to link with",
        linked: 0,
      });
    }

    // Create email lookup map for clients
    const clientByEmail = new Map();
    clients.forEach((client) => {
      if (client.email) {
        clientByEmail.set(client.email.toLowerCase(), client);
      }
    });

    // Link leads to clients
    let linked = 0;
    const updates = [];

    for (const lead of leads) {
      if (lead.email) {
        const client = clientByEmail.get(lead.email.toLowerCase());
        if (client) {
          updates.push({
            id: lead.id,
            client_id: client.id,
          });
          linked++;
        }
      }
    }

    // Batch update leads with client_id
    if (updates.length > 0) {
      for (const update of updates) {
        await supabaseAdmin
          .from("leads")
          .update({ client_id: update.client_id })
          .eq("id", update.id);
      }
    }

    // Also update clients with lead_id if they don't have one
    let clientsUpdated = 0;
    for (const lead of leads) {
      if (lead.email) {
        const client = clientByEmail.get(lead.email.toLowerCase());
        if (client && !client.lead_id) {
          await supabaseAdmin
            .from("clients")
            .update({ lead_id: lead.id })
            .eq("id", client.id);
          clientsUpdated++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        totalLeads: leads.length,
        totalClients: clients.length,
        leadsLinked: linked,
        clientsUpdated: clientsUpdated,
      },
      message: `Successfully linked ${linked} leads to clients and updated ${clientsUpdated} clients with lead references`,
    });
  } catch (error: any) {
    console.error("Link leads-clients error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Linking failed",
    });
  }
}
