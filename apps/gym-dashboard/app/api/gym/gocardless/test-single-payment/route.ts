import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

// @ts-ignore - CommonJS module
const gocardless = require("gocardless-nodejs");
const { Environments } = require("gocardless-nodejs/constants");

export const dynamic = "force-dynamic";

/**
 * Test endpoint to see what data GoCardless API returns for a single payment
 */
export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const organizationId = "ee1206d7-62fb-49cf-9f39-95b9c54423a4";

    // Get GoCardless connection
    const { data: connection } = await supabaseAdmin
      .from("payment_provider_accounts")
      .select("access_token, environment")
      .eq("organization_id", organizationId)
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

    // Fetch first 5 payments and log their structure
    const paymentsResponse = await client.payments.list({ limit: 5 });
    const payments = paymentsResponse.payments || [];

    const paymentDetails = payments.map((payment: any) => ({
      id: payment.id,
      amount: payment.amount,
      status: payment.status,
      hasLinks: !!payment.links,
      linksKeys: payment.links ? Object.keys(payment.links) : [],
      customerLink: payment.links?.customer || null,
      subscriptionLink: payment.links?.subscription || null,
      mandateLink: payment.links?.mandate || null,
      fullLinks: payment.links,
    }));

    return NextResponse.json({
      success: true,
      totalFound: payments.length,
      samplePayments: paymentDetails,
      note: "Check if 'links.customer' or 'links.mandate' exist",
    });
  } catch (error: any) {
    console.error("Error testing GoCardless payment:", error);
    return NextResponse.json(
      { error: `Test failed: ${error.message}` },
      { status: 500 },
    );
  }
}
