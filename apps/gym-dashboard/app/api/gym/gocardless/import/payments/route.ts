import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

// @ts-ignore - CommonJS module
const gocardless = require("gocardless-nodejs");
const { Environments } = require("gocardless-nodejs/constants");

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Import historical payment data from GoCardless
 * Similar to Stripe charges import, but for GoCardless payments
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      organizationId,
      startDate, // Optional: filter payments after this date (YYYY-MM-DD)
      endDate, // Optional: filter payments before this date (YYYY-MM-DD)
      limit = 100,
    } = body;

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 },
      );
    }

    // Use admin client for all operations
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

    // Build query parameters for GoCardless API
    const queryParams: any = {
      limit,
      created_at: {},
    };

    // GoCardless uses ISO 8601 date format
    if (startDate) {
      queryParams.created_at.gt = new Date(startDate).toISOString();
    }
    if (endDate) {
      queryParams.created_at.lt = new Date(endDate).toISOString();
    }

    // Fetch payments from GoCardless
    console.log("Fetching payments from GoCardless with params:", queryParams);
    const paymentsResponse = await client.payments.list(queryParams);
    const payments = paymentsResponse.payments || [];

    // Log payment statuses for debugging
    const paymentStatusCounts = payments.reduce(
      (acc, payment) => {
        acc[payment.status] = (acc[payment.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
    console.log("GoCardless payment statuses:", paymentStatusCounts);

    let imported = 0;
    let skipped = 0;
    let totalAmount = 0;
    let clientsCreated = 0;
    const clientMatchFailures: Array<{
      customer_id: string;
      email: string | null;
      reason: string;
    }> = [];

    // Import each payment
    for (const payment of payments) {
      // Only import successful payments
      if (payment.status !== "confirmed" && payment.status !== "paid_out") {
        console.log(
          `Skipping payment ${payment.id} with status: ${payment.status}`,
        );
        skipped++;
        continue;
      }

      // Find client by email from GoCardless customer
      let clientId: string | null = null;
      if (payment.links?.customer) {
        // Fetch customer details
        try {
          const customer = await client.customers.find(payment.links.customer);

          // Try to find client by email (case-insensitive)
          let { data: matchedClient } = await supabaseAdmin
            .from("clients")
            .select("id, email")
            .eq("org_id", organizationId)
            .ilike("email", customer.email)
            .maybeSingle();

          // Fallback: Try exact lowercase match
          if (!matchedClient && customer.email) {
            const { data: exactMatch } = await supabaseAdmin
              .from("clients")
              .select("id, email")
              .eq("org_id", organizationId)
              .eq("email", customer.email.toLowerCase())
              .maybeSingle();

            if (exactMatch) {
              matchedClient = exactMatch;
            }
          }

          if (matchedClient) {
            clientId = matchedClient.id;
          } else {
            // Auto-create archived client for historical data
            const nameParts =
              customer.given_name && customer.family_name
                ? [customer.given_name, customer.family_name]
                : (customer.company_name || "Unknown Customer").split(" ");

            const firstName = nameParts[0] || "Unknown";
            const lastName = nameParts.slice(1).join(" ") || "";

            const { data: newClient, error: clientError } = await supabaseAdmin
              .from("clients")
              .insert({
                org_id: organizationId,
                first_name: firstName,
                last_name: lastName,
                email: customer.email || null,
                phone: customer.phone_number || null,
                status: "archived",
                source: "gocardless_import",
                metadata: {
                  gocardless_customer_id: customer.id,
                },
                created_at: new Date(customer.created_at).toISOString(),
              })
              .select("id")
              .single();

            if (!clientError && newClient) {
              clientId = newClient.id;
              clientsCreated++;
              console.log(
                `Auto-created archived client for GoCardless customer ${customer.id}`,
              );
            } else {
              console.error(
                `Failed to create client for ${customer.email}:`,
                clientError,
              );
              clientMatchFailures.push({
                customer_id: customer.id,
                email: customer.email,
                reason: clientError?.message || "Unknown error creating client",
              });
            }
          }
        } catch (customerError: any) {
          console.error(
            `Failed to fetch GoCardless customer ${payment.links.customer}:`,
            customerError,
          );
          clientMatchFailures.push({
            customer_id: payment.links.customer,
            email: null,
            reason: `Failed to fetch customer: ${customerError?.message || "Unknown error"}`,
          });
        }
      }

      // Check if payment already exists
      const { data: existingPayment } = await supabaseAdmin
        .from("payments")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("provider_payment_id", payment.id)
        .eq("payment_provider", "gocardless")
        .maybeSingle();

      if (existingPayment) {
        console.log(`Payment ${payment.id} already imported, skipping`);
        skipped++;
        continue;
      }

      // Create payment record
      const amount = parseInt(payment.amount) / 100; // Convert pence to pounds
      const { error: insertError } = await supabaseAdmin
        .from("payments")
        .insert({
          organization_id: organizationId,
          client_id: clientId,
          user_id: clientId, // Also populate user_id for backwards compatibility
          amount,
          currency: payment.currency.toUpperCase(),
          status: "succeeded", // Match Stripe's status field
          payment_status: "completed",
          payment_method: "direct_debit",
          payment_provider: "gocardless",
          provider_payment_id: payment.id,
          payment_date:
            payment.charge_date || new Date().toISOString().split("T")[0],
          description: payment.description || `GoCardless payment`,
          metadata: {
            gocardless_payment_id: payment.id,
            gocardless_customer_id: payment.links?.customer,
            gocardless_subscription_id: payment.links?.subscription,
            charge_date: payment.charge_date,
            reference: payment.reference,
            currency: payment.currency.toUpperCase(),
            amount_minor: payment.amount,
          },
          created_at: new Date(payment.created_at).toISOString(),
        });

      if (!insertError) {
        imported++;
        totalAmount += amount;
      } else {
        console.error(`Error importing payment ${payment.id}:`, insertError);
        skipped++;
      }
    }

    return NextResponse.json({
      success: true,
      stats: {
        total: payments.length,
        imported,
        skipped,
        clientsCreated,
        totalAmount: Math.round(totalAmount * 100) / 100,
        paymentsWithoutClient: imported - clientsCreated,
      },
      message: `Imported ${imported} payments totaling ${Math.round(totalAmount * 100) / 100} GBP. Auto-created ${clientsCreated} archived clients.`,
      debug: {
        clientMatchFailures: clientMatchFailures.slice(0, 10), // First 10 failures
        totalClientMatchFailures: clientMatchFailures.length,
      },
    });
  } catch (error: any) {
    console.error("Error importing GoCardless payments:", error);
    return NextResponse.json(
      { error: `Failed to import payments: ${error.message}` },
      { status: 500 },
    );
  }
}
