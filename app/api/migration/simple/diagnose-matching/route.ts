import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const { organizationId } = await request.json();
    const supabaseAdmin = createAdminClient();

    // Get all leads and clients
    const [leadsResult, clientsResult] = await Promise.all([
      supabaseAdmin
        .from("leads")
        .select("id, name, email, client_id")
        .eq("organization_id", organizationId)
        .limit(20),
      supabaseAdmin
        .from("clients")
        .select("id, name, email, lead_id")
        .eq("organization_id", organizationId)
        .limit(20),
    ]);

    const leads = leadsResult.data || [];
    const clients = clientsResult.data || [];

    // Analyze matching potential
    const leadsWithEmail = leads.filter((l) => l.email);
    const clientsWithEmail = clients.filter((c) => c.email);
    const leadsLinked = leads.filter((l) => l.client_id);
    const leadsUnlinked = leads.filter((l) => !l.client_id);

    // Find potential matches by name
    const potentialNameMatches = [];
    for (const lead of leadsUnlinked) {
      if (!lead.name) continue;

      // Try to find client with similar name
      const leadNameLower = lead.name.toLowerCase().trim();
      const matchingClient = clients.find((c) => {
        if (!c.name) return false;
        const clientNameLower = c.name.toLowerCase().trim();

        // Exact match
        if (clientNameLower === leadNameLower) return true;

        // Check if names contain each other
        if (
          clientNameLower.includes(leadNameLower) ||
          leadNameLower.includes(clientNameLower)
        )
          return true;

        // Check if first/last name matches
        const leadParts = leadNameLower.split(/\s+/);
        const clientParts = clientNameLower.split(/\s+/);

        for (const leadPart of leadParts) {
          for (const clientPart of clientParts) {
            if (leadPart === clientPart && leadPart.length > 2) return true;
          }
        }

        return false;
      });

      if (matchingClient) {
        potentialNameMatches.push({
          lead: { id: lead.id, name: lead.name, email: lead.email },
          client: {
            id: matchingClient.id,
            name: matchingClient.name,
            email: matchingClient.email,
          },
        });
      }
    }

    // Check payments to understand the data
    const { data: paymentsData } = await supabaseAdmin
      .from("payments")
      .select("client_id, amount")
      .eq("organization_id", organizationId)
      .limit(10);

    const uniqueClientIdsInPayments = [
      ...new Set((paymentsData || []).map((p) => p.client_id)),
    ];

    // Check if those client IDs exist
    let clientsWithPayments = [];
    if (uniqueClientIdsInPayments.length > 0) {
      const { data } = await supabaseAdmin
        .from("clients")
        .select("id, name, email")
        .in("id", uniqueClientIdsInPayments);
      clientsWithPayments = data || [];
    }

    return NextResponse.json({
      success: true,
      summary: {
        totalLeads: leads.length,
        totalClients: clients.length,
        leadsWithEmail: leadsWithEmail.length,
        clientsWithEmail: clientsWithEmail.length,
        leadsAlreadyLinked: leadsLinked.length,
        leadsNeedingLink: leadsUnlinked.length,
        potentialNameMatches: potentialNameMatches.length,
        paymentsCount: paymentsData?.length || 0,
        uniqueClientIdsInPayments: uniqueClientIdsInPayments.length,
        clientsWithPayments: clientsWithPayments.length,
      },
      samples: {
        unlinkedLeads: leadsUnlinked.slice(0, 5),
        clients: clients.slice(0, 5),
        potentialNameMatches: potentialNameMatches.slice(0, 5),
        clientsWithPayments,
      },
      recommendations: [
        potentialNameMatches.length > 0
          ? `Found ${potentialNameMatches.length} potential matches by name. Consider linking by name instead of email.`
          : "No obvious name matches found.",
        leadsWithEmail.length < leads.length
          ? `${leads.length - leadsWithEmail.length} leads don't have email addresses.`
          : "All leads have email addresses.",
        clientsWithEmail.length < clients.length
          ? `${clients.length - clientsWithEmail.length} clients don't have email addresses.`
          : "All clients have email addresses.",
        clientsWithPayments.length > 0
          ? `Found ${clientsWithPayments.length} clients that have payments. These should be linked to leads.`
          : "No clients found with payments.",
      ],
    });
  } catch (error: any) {
    console.error("Diagnose matching error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Diagnosis failed",
    });
  }
}
