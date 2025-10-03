import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const { organizationId } = await request.json();
    const supabaseAdmin = createAdminClient();

    // Get counts of everything
    const [leadsResult, clientsResult, paymentsResult, bookingsResult] =
      await Promise.all([
        supabaseAdmin
          .from("leads")
          .select("id, name, email, client_id", { count: "exact" })
          .eq("organization_id", organizationId),
        supabaseAdmin
          .from("clients")
          .select("id, name, email, lead_id", { count: "exact" })
          .eq("organization_id", organizationId),
        supabaseAdmin
          .from("payments")
          .select("id, client_id, client_name, amount", { count: "exact" })
          .eq("organization_id", organizationId),
        supabaseAdmin
          .from("bookings")
          .select("id, client_id, client_name", { count: "exact" })
          .eq("organization_id", organizationId),
      ]);

    const leads = leadsResult.data || [];
    const clients = clientsResult.data || [];
    const payments = paymentsResult.data || [];
    const bookings = bookingsResult.data || [];

    // Analyze the data
    const leadsWithClientId = leads.filter((l) => l.client_id).length;
    const leadsWithoutClientId = leads.filter((l) => !l.client_id).length;
    const clientsWithLeadId = clients.filter((c) => c.lead_id).length;
    const paymentsWithValidClient = payments.filter((p) => p.client_id).length;
    const paymentsWithoutClient = payments.filter((p) => !p.client_id).length;

    // Find specific examples
    const davidWrightsonLead = leads.find(
      (l) =>
        l.name?.toLowerCase().includes("david") &&
        l.name?.toLowerCase().includes("wrightson"),
    );
    const davidWrightsonClient = clients.find(
      (c) =>
        c.name?.toLowerCase().includes("david") &&
        c.name?.toLowerCase().includes("wrightson"),
    );
    const davidPayments = payments.filter(
      (p) =>
        p.client_name?.toLowerCase().includes("david") ||
        p.client_name?.toLowerCase().includes("wrightson"),
    );

    // Check if David's lead is linked to his client
    let davidStatus = "Not found";
    if (davidWrightsonLead && davidWrightsonClient) {
      if (davidWrightsonLead.client_id === davidWrightsonClient.id) {
        davidStatus = "✅ Lead and client are linked correctly";
      } else {
        davidStatus = "❌ Lead and client exist but are NOT linked";
      }
    } else if (davidWrightsonLead) {
      davidStatus = "⚠️ Lead exists but no matching client found";
    } else if (davidWrightsonClient) {
      davidStatus = "⚠️ Client exists but no matching lead found";
    }

    // Get sample unlinked records
    const unlinkedLeads = leads.filter((l) => !l.client_id).slice(0, 3);
    const unlinkedPayments = payments.filter((p) => !p.client_id).slice(0, 3);

    return NextResponse.json({
      success: true,
      summary: {
        totalLeads: leads.length,
        leadsLinked: leadsWithClientId,
        leadsUnlinked: leadsWithoutClientId,
        totalClients: clients.length,
        clientsLinked: clientsWithLeadId,
        totalPayments: payments.length,
        paymentsWithClient: paymentsWithValidClient,
        paymentsOrphaned: paymentsWithoutClient,
        totalBookings: bookings.length,
      },
      davidWrightson: {
        status: davidStatus,
        lead: davidWrightsonLead
          ? {
              id: davidWrightsonLead.id,
              name: davidWrightsonLead.name,
              client_id: davidWrightsonLead.client_id,
            }
          : null,
        client: davidWrightsonClient
          ? {
              id: davidWrightsonClient.id,
              name: davidWrightsonClient.name,
              lead_id: davidWrightsonClient.lead_id,
            }
          : null,
        payments: davidPayments.map((p) => ({
          id: p.id,
          client_name: p.client_name,
          client_id: p.client_id,
          amount: p.amount,
        })),
      },
      samples: {
        unlinkedLeads: unlinkedLeads.map((l) => ({
          id: l.id,
          name: l.name,
          email: l.email,
        })),
        unlinkedPayments: unlinkedPayments.map((p) => ({
          id: p.id,
          client_name: p.client_name,
          amount: p.amount,
        })),
      },
      recommendations: [],
    });
  } catch (error: any) {
    console.error("Diagnose error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Diagnosis failed",
    });
  }
}
