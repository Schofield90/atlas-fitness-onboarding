import { NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

// @ts-ignore - CommonJS module
const gocardless = require("gocardless-nodejs");
const { Environments } = require("gocardless-nodejs/constants");

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Diagnostic endpoint to analyze why GoCardless payments aren't linking to clients
 */
export async function GET() {
  try {
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const orgId = "ee1206d7-62fb-49cf-9f39-95b9c54423a4";

    // Get GoCardless connection
    const { data: connection } = await supabaseAdmin
      .from("payment_provider_accounts")
      .select("access_token, environment")
      .eq("organization_id", orgId)
      .eq("provider", "gocardless")
      .single();

    if (!connection || !connection.access_token) {
      return NextResponse.json(
        { error: "GoCardless account not connected" },
        { status: 404 },
      );
    }

    // Initialize GoCardless client
    const client = gocardless(
      connection.access_token,
      connection.environment === "live"
        ? Environments.Live
        : Environments.Sandbox,
    );

    // Get unlinked payments from database
    const { data: unlinkedPayments } = await supabaseAdmin
      .from("payments")
      .select("id, provider_payment_id, metadata")
      .eq("organization_id", orgId)
      .eq("payment_provider", "gocardless")
      .is("client_id", null)
      .limit(5);

    // Get all clients for comparison
    const { data: clients } = await supabaseAdmin
      .from("clients")
      .select("id, email, first_name, last_name")
      .eq("org_id", orgId)
      .limit(5);

    const analysisResults = [];

    // Analyze each unlinked payment
    for (const payment of unlinkedPayments || []) {
      const gcCustomerId = payment.metadata?.gocardless_customer_id;

      if (!gcCustomerId) {
        analysisResults.push({
          payment_id: payment.id,
          issue: "No gocardless_customer_id in metadata",
          gocardless_payment_id: payment.provider_payment_id,
        });
        continue;
      }

      try {
        // Fetch customer from GoCardless
        const gcCustomer = await client.customers.find(gcCustomerId);

        // Try to find matching client
        const { data: matchedClient } = await supabaseAdmin
          .from("clients")
          .select("id, email, first_name, last_name")
          .eq("org_id", orgId)
          .ilike("email", gcCustomer.email)
          .maybeSingle();

        analysisResults.push({
          payment_id: payment.id,
          gocardless_customer: {
            id: gcCustomer.id,
            email: gcCustomer.email,
            given_name: gcCustomer.given_name,
            family_name: gcCustomer.family_name,
          },
          matched_client: matchedClient || null,
          issue: matchedClient ? "Client found but not linked" : "No matching client in database",
        });
      } catch (error: any) {
        analysisResults.push({
          payment_id: payment.id,
          gocardless_customer_id: gcCustomerId,
          issue: `Failed to fetch GoCardless customer: ${error.message}`,
        });
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        total_unlinked_payments: unlinkedPayments?.length || 0,
        sample_clients: clients?.length || 0,
      },
      unlinked_payments: analysisResults,
      sample_clients: clients?.map(c => ({
        id: c.id,
        email: c.email,
        name: `${c.first_name} ${c.last_name}`,
      })),
    });
  } catch (error: any) {
    console.error("Error analyzing GoCardless payments:", error);
    return NextResponse.json(
      { error: error.message || "Failed to analyze payments" },
      { status: 500 },
    );
  }
}
