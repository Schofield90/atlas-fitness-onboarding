import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { AutoMatcher } from "@/app/lib/migration/auto-matcher";

export async function POST(request: NextRequest) {
  try {
    const { organizationId } = await request.json();
    const supabaseAdmin = createAdminClient();

    console.log(
      "Starting comprehensive data fix for organization:",
      organizationId,
    );

    // Step 1: Run the auto-matcher to link leads and clients
    const matcher = new AutoMatcher(supabaseAdmin);
    const matchStats = await matcher.linkAllUnmatched(organizationId);

    // Step 2: Fix payments that might have incorrect client_id
    const { data: payments } = await supabaseAdmin
      .from("payments")
      .select("*")
      .eq("organization_id", organizationId);

    let paymentsFixed = 0;

    for (const payment of payments || []) {
      // Check if the current client_id is valid
      if (payment.client_id) {
        const { data: client } = await supabaseAdmin
          .from("clients")
          .select("id")
          .eq("id", payment.client_id)
          .eq("organization_id", organizationId)
          .single();

        if (client) continue; // Client ID is valid, skip
      }

      // Try to find the correct client
      const correctClientId = await matcher.findClientForPayment(
        payment,
        organizationId,
      );

      if (correctClientId && correctClientId !== payment.client_id) {
        await supabaseAdmin
          .from("payments")
          .update({ client_id: correctClientId })
          .eq("id", payment.id);

        paymentsFixed++;
        console.log(
          `Fixed payment ${payment.id} - linked to client ${correctClientId}`,
        );
      }
    }

    // Step 3: Fix attendance records (bookings) that might not have correct client_id
    const { data: bookings } = await supabaseAdmin
      .from("bookings")
      .select("*")
      .eq("organization_id", organizationId);

    let bookingsFixed = 0;

    for (const booking of bookings || []) {
      // Check if the current client_id is valid
      if (booking.client_id) {
        const { data: client } = await supabaseAdmin
          .from("clients")
          .select("id")
          .eq("id", booking.client_id)
          .eq("organization_id", organizationId)
          .single();

        if (client) continue; // Client ID is valid, skip
      }

      // Try to find client by email or name
      let correctClientId = null;

      if (booking.client_email) {
        const { data: client } = await supabaseAdmin
          .from("clients")
          .select("id")
          .eq("organization_id", organizationId)
          .ilike("email", booking.client_email)
          .single();

        if (client) correctClientId = client.id;
      }

      if (!correctClientId && booking.client_name) {
        const nameMatch = await matcher.findClientForPayment(
          { client_name: booking.client_name },
          organizationId,
        );
        correctClientId = nameMatch;
      }

      if (correctClientId && correctClientId !== booking.client_id) {
        await supabaseAdmin
          .from("bookings")
          .update({ client_id: correctClientId })
          .eq("id", booking.id);

        bookingsFixed++;
        console.log(
          `Fixed booking ${booking.id} - linked to client ${correctClientId}`,
        );
      }
    }

    // Step 4: Ensure all clients with payments are linked to leads
    const { data: clientsWithPayments } = await supabaseAdmin
      .from("payments")
      .select("client_id")
      .eq("organization_id", organizationId)
      .not("client_id", "is", null);

    const uniqueClientIds = [
      ...new Set((clientsWithPayments || []).map((p) => p.client_id)),
    ];

    for (const clientId of uniqueClientIds) {
      const { data: client } = await supabaseAdmin
        .from("clients")
        .select("*")
        .eq("id", clientId)
        .single();

      if (client && !client.lead_id) {
        // Try to find a matching lead
        const leadMatch = await matcher.matchClientToLead(
          client,
          organizationId,
        );

        if (leadMatch.matched && leadMatch.leadId) {
          await supabaseAdmin
            .from("clients")
            .update({ lead_id: leadMatch.leadId })
            .eq("id", clientId);

          await supabaseAdmin
            .from("leads")
            .update({ client_id: clientId })
            .eq("id", leadMatch.leadId);

          console.log(
            `Linked client ${client.name} to lead ${leadMatch.leadId}`,
          );
        }
      }
    }

    const summary = {
      leadsLinked: matchStats.leadsLinked,
      clientsLinked: matchStats.clientsLinked,
      paymentsLinked: matchStats.paymentsLinked,
      paymentsFixed,
      bookingsFixed,
      totalFixed:
        matchStats.leadsLinked +
        matchStats.clientsLinked +
        matchStats.paymentsLinked +
        paymentsFixed +
        bookingsFixed,
    };

    console.log("Data fix complete:", summary);

    return NextResponse.json({
      success: true,
      summary,
      message: `Fixed ${summary.totalFixed} total records. Payments should now be visible in client profiles.`,
      details: {
        leads: `${summary.leadsLinked} leads linked to clients`,
        clients: `${summary.clientsLinked} clients linked to leads`,
        payments: `${summary.paymentsFixed} payments re-linked to correct clients`,
        bookings: `${summary.bookingsFixed} attendance records fixed`,
        orphanedPayments: `${summary.paymentsLinked} orphaned payments linked`,
      },
    });
  } catch (error: any) {
    console.error("Fix existing data error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Data fix failed",
    });
  }
}
