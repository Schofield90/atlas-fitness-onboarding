import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

// @ts-ignore - CommonJS module
const gocardless = require("gocardless-nodejs");
const { Environments } = require("gocardless-nodejs/constants");

export const dynamic = "force-dynamic";

/**
 * Debug a single GoCardless payment to see why backfill is failing
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { organizationId, paymentId } = body;

    if (!organizationId || !paymentId) {
      return NextResponse.json(
        { error: "Organization ID and payment ID are required" },
        { status: 400 },
      );
    }

    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

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

    // Get payment from database
    const { data: dbPayment } = await supabaseAdmin
      .from("payments")
      .select("*")
      .eq("id", paymentId)
      .single();

    if (!dbPayment) {
      return NextResponse.json(
        { error: "Payment not found in database" },
        { status: 404 },
      );
    }

    const debug: any = {
      dbPayment: {
        id: dbPayment.id,
        provider_payment_id: dbPayment.provider_payment_id,
        client_id: dbPayment.client_id,
        amount: dbPayment.amount,
        payment_date: dbPayment.payment_date,
      },
      goCardlessConnection: {
        environment: connection.environment,
        tokenLength: connection.access_token.length,
      },
    };

    // Try to fetch payment from GoCardless
    try {
      console.log(
        `Fetching payment from GoCardless: ${dbPayment.provider_payment_id}`,
      );
      const gcPayment = await client.payments.find(
        dbPayment.provider_payment_id,
      );

      debug.goCardlessPayment = {
        id: gcPayment.id,
        status: gcPayment.status,
        amount: gcPayment.amount,
        created_at: gcPayment.created_at,
        customer_link: gcPayment.links?.customer,
        subscription_link: gcPayment.links?.subscription,
      };

      // Try to fetch customer if link exists
      if (gcPayment.links?.customer) {
        try {
          const gcCustomer = await client.customers.find(
            gcPayment.links.customer,
          );
          debug.goCardlessCustomer = {
            id: gcCustomer.id,
            email: gcCustomer.email,
            given_name: gcCustomer.given_name,
            family_name: gcCustomer.family_name,
            created_at: gcCustomer.created_at,
          };

          // Try to find matching client
          if (gcCustomer.email) {
            const { data: matchedClient } = await supabaseAdmin
              .from("clients")
              .select("id, email, first_name, last_name")
              .eq("org_id", organizationId)
              .ilike("email", gcCustomer.email)
              .maybeSingle();

            debug.matchedClient = matchedClient || "No match found";
          } else {
            debug.matchedClient = "Customer has no email";
          }
        } catch (customerError: any) {
          debug.goCardlessCustomerError = {
            message: customerError.message,
            code: customerError.code,
            type: customerError.type,
            raw: JSON.stringify(customerError, null, 2),
          };
        }
      } else {
        debug.goCardlessCustomer = "No customer link in payment";
      }
    } catch (paymentError: any) {
      debug.goCardlessPaymentError = {
        message: paymentError.message,
        code: paymentError.code,
        type: paymentError.type,
        raw: JSON.stringify(paymentError, null, 2),
      };
    }

    return NextResponse.json({
      success: true,
      debug,
    });
  } catch (error: any) {
    console.error("Debug endpoint error:", error);
    return NextResponse.json(
      {
        error: error.message,
        stack: error.stack,
      },
      { status: 500 },
    );
  }
}
