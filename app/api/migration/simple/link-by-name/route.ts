import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const { organizationId } = await request.json();
    const supabaseAdmin = createAdminClient();

    // Get all unlinked leads
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

    // Get all clients
    const { data: clients } = await supabaseAdmin
      .from("clients")
      .select("*")
      .eq("organization_id", organizationId);

    if (!clients || clients.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No clients found to link with",
        linked: 0,
      });
    }

    // Create normalized name lookup for clients
    const clientsByName = new Map();
    clients.forEach((client) => {
      if (client.name) {
        // Store by normalized name
        const normalized = client.name
          .toLowerCase()
          .trim()
          .replace(/\s+/g, " ");
        clientsByName.set(normalized, client);

        // Also store by parts of the name
        const parts = normalized.split(" ");
        if (parts.length === 2) {
          // Store by "firstname lastname" and "lastname firstname"
          clientsByName.set(`${parts[0]} ${parts[1]}`, client);
          clientsByName.set(`${parts[1]} ${parts[0]}`, client);
        }
      }
    });

    // Link leads to clients by name matching
    let linked = 0;
    const linkedPairs = [];

    for (const lead of leads) {
      if (!lead.name) continue;

      const leadNameNorm = lead.name.toLowerCase().trim().replace(/\s+/g, " ");

      // Try exact match first
      let matchedClient = clientsByName.get(leadNameNorm);

      // If no exact match, try partial matches
      if (!matchedClient) {
        // Try to find a client whose name contains the lead name or vice versa
        for (const [clientName, client] of clientsByName) {
          if (
            clientName.includes(leadNameNorm) ||
            leadNameNorm.includes(clientName)
          ) {
            matchedClient = client;
            break;
          }
        }
      }

      // If still no match, try matching by last name or first name
      if (!matchedClient) {
        const leadParts = leadNameNorm.split(" ");
        for (const part of leadParts) {
          if (part.length < 3) continue; // Skip short words

          for (const [clientName, client] of clientsByName) {
            const clientParts = clientName.split(" ");
            if (clientParts.includes(part)) {
              matchedClient = client;
              break;
            }
          }
          if (matchedClient) break;
        }
      }

      if (matchedClient) {
        // Update lead with client_id
        await supabaseAdmin
          .from("leads")
          .update({ client_id: matchedClient.id })
          .eq("id", lead.id);

        // Update client with lead_id if it doesn't have one
        if (!matchedClient.lead_id) {
          await supabaseAdmin
            .from("clients")
            .update({ lead_id: lead.id })
            .eq("id", matchedClient.id);
        }

        linkedPairs.push({
          lead: { id: lead.id, name: lead.name },
          client: { id: matchedClient.id, name: matchedClient.name },
        });
        linked++;
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        totalLeads: leads.length,
        totalClients: clients.length,
        leadsLinked: linked,
      },
      linkedPairs: linkedPairs.slice(0, 10), // Show first 10 for verification
      message: `Successfully linked ${linked} leads to clients by name matching`,
    });
  } catch (error: any) {
    console.error("Link by name error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Linking failed",
    });
  }
}
