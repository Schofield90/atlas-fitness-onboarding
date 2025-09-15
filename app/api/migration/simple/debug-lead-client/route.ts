import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const { leadId, clientName } = await request.json();
    const supabaseAdmin = createAdminClient();

    // Get the lead details
    const { data: lead } = await supabaseAdmin
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .single();

    // Find the client by name or ID
    let client = null;
    if (clientName) {
      const { data } = await supabaseAdmin
        .from("clients")
        .select("*")
        .or(
          `name.ilike.%${clientName}%,first_name.ilike.%${clientName}%,last_name.ilike.%${clientName}%`,
        )
        .single();
      client = data;
    } else if (lead?.client_id) {
      const { data } = await supabaseAdmin
        .from("clients")
        .select("*")
        .eq("id", lead.client_id)
        .single();
      client = data;
    }

    // Check if there's a client with the same email as the lead
    let clientByEmail = null;
    if (lead?.email) {
      const { data } = await supabaseAdmin
        .from("clients")
        .select("*")
        .eq("email", lead.email)
        .single();
      clientByEmail = data;
    }

    // Check payments for the client
    let payments = { fromPayments: [], fromTransactions: [] };
    if (client) {
      const [paymentsResult, transactionsResult] = await Promise.all([
        supabaseAdmin
          .from("payments")
          .select("*")
          .eq("client_id", client.id)
          .limit(5),
        supabaseAdmin
          .from("transactions")
          .select("*")
          .eq("client_id", client.id)
          .eq("type", "payment")
          .limit(5),
      ]);

      payments.fromPayments = paymentsResult.data || [];
      payments.fromTransactions = transactionsResult.data || [];
    }

    // Check if we should link the lead to the client
    const shouldLink = clientByEmail && !lead?.client_id;

    return NextResponse.json({
      success: true,
      lead: {
        id: lead?.id,
        name: lead?.name,
        email: lead?.email,
        client_id: lead?.client_id,
        has_client_id: !!lead?.client_id,
      },
      client: client
        ? {
            id: client.id,
            name: client.name,
            email: client.email,
            lead_id: client.lead_id,
          }
        : null,
      clientByEmail: clientByEmail
        ? {
            id: clientByEmail.id,
            name: clientByEmail.name,
            email: clientByEmail.email,
          }
        : null,
      payments: {
        count: payments.fromPayments.length + payments.fromTransactions.length,
        samples: [
          ...payments.fromPayments.slice(0, 2),
          ...payments.fromTransactions.slice(0, 2),
        ],
      },
      recommendation: shouldLink
        ? `Lead should be linked to client ${clientByEmail.id} (${clientByEmail.name})`
        : lead?.client_id
          ? "Lead is already linked to a client"
          : "No matching client found for this lead",
      linkCommand: shouldLink
        ? `UPDATE leads SET client_id = '${clientByEmail.id}' WHERE id = '${leadId}'`
        : null,
    });
  } catch (error: any) {
    console.error("Debug lead-client error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Debug failed",
    });
  }
}
