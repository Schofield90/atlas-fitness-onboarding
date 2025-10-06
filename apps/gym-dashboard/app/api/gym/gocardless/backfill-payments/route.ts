import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

// @ts-ignore - CommonJS module
const gocardless = require("gocardless-nodejs");
const { Environments } = require("gocardless-nodejs/constants");

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Backfill client_id for existing GoCardless payments
 * This fetches customer info from GoCardless API and links payments to clients
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { organizationId } = body;

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

    // Get all unlinked GoCardless payments
    const { data: unlinkedPayments } = await supabaseAdmin
      .from("payments")
      .select("id, provider_payment_id, metadata")
      .eq("organization_id", organizationId)
      .eq("payment_provider", "gocardless")
      .is("client_id", null);

    if (!unlinkedPayments || unlinkedPayments.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No unlinked payments found",
        stats: {
          total: 0,
          updated: 0,
          failed: 0,
          clientsCreated: 0,
        },
      });
    }

    console.log(`Found ${unlinkedPayments.length} unlinked payments to backfill`);

    let updated = 0;
    let failed = 0;
    let clientsCreated = 0;
    const errors: Array<{ payment_id: string; error: string }> = [];

    // Process each payment
    for (const payment of unlinkedPayments) {
      try {
        // Fetch full payment details from GoCardless
        const gcPayment = await client.payments.find(payment.provider_payment_id);

        if (!gcPayment.links?.customer) {
          console.log(`Payment ${payment.provider_payment_id} has no customer link`);
          failed++;
          errors.push({
            payment_id: payment.provider_payment_id,
            error: "No customer link in GoCardless payment",
          });
          continue;
        }

        // Fetch customer details
        const gcCustomer = await client.customers.find(gcPayment.links.customer);

        if (!gcCustomer.email) {
          console.log(`Customer ${gcPayment.links.customer} has no email`);
          failed++;
          errors.push({
            payment_id: payment.provider_payment_id,
            error: "GoCardless customer has no email",
          });
          continue;
        }

        // Try to find client by email (case-insensitive)
        let { data: matchedClient } = await supabaseAdmin
          .from("clients")
          .select("id, email")
          .eq("org_id", organizationId)
          .ilike("email", gcCustomer.email)
          .maybeSingle();

        // Fallback: Try exact lowercase match
        if (!matchedClient) {
          const { data: exactMatch } = await supabaseAdmin
            .from("clients")
            .select("id, email")
            .eq("org_id", organizationId)
            .eq("email", gcCustomer.email.toLowerCase())
            .maybeSingle();

          if (exactMatch) {
            matchedClient = exactMatch;
          }
        }

        let clientId: string;

        if (matchedClient) {
          clientId = matchedClient.id;
          console.log(
            `Matched payment ${payment.provider_payment_id} to existing client ${gcCustomer.email}`,
          );
        } else {
          // Auto-create archived client for historical data
          const nameParts =
            gcCustomer.given_name && gcCustomer.family_name
              ? [gcCustomer.given_name, gcCustomer.family_name]
              : (gcCustomer.company_name || "Unknown Customer").split(" ");

          const firstName = nameParts[0] || "Unknown";
          const lastName = nameParts.slice(1).join(" ") || "";

          const { data: newClient, error: clientError } = await supabaseAdmin
            .from("clients")
            .insert({
              org_id: organizationId,
              first_name: firstName,
              last_name: lastName,
              email: gcCustomer.email,
              phone: gcCustomer.phone_number || null,
              status: "archived",
              source: "gocardless_backfill",
              metadata: {
                gocardless_customer_id: gcCustomer.id,
              },
              created_at: new Date(gcCustomer.created_at).toISOString(),
            })
            .select("id")
            .single();

          if (clientError || !newClient) {
            console.error(`Failed to create client for ${gcCustomer.email}:`, clientError);
            failed++;
            errors.push({
              payment_id: payment.provider_payment_id,
              error: clientError?.message || "Failed to create client",
            });
            continue;
          }

          clientId = newClient.id;
          clientsCreated++;
          console.log(
            `Created archived client for ${gcCustomer.email} (GoCardless customer ${gcCustomer.id})`,
          );
        }

        // Update payment with client_id and enhanced metadata
        const { error: updateError } = await supabaseAdmin
          .from("payments")
          .update({
            client_id: clientId,
            metadata: {
              ...payment.metadata,
              gocardless_customer_id: gcPayment.links.customer,
              gocardless_subscription_id: gcPayment.links?.subscription,
              customer_email: gcCustomer.email,
              customer_name: `${gcCustomer.given_name || ""} ${gcCustomer.family_name || ""}`.trim(),
            },
          })
          .eq("id", payment.id);

        if (updateError) {
          console.error(`Failed to update payment ${payment.id}:`, updateError);
          failed++;
          errors.push({
            payment_id: payment.provider_payment_id,
            error: updateError.message,
          });
        } else {
          updated++;
        }
      } catch (error: any) {
        console.error(`Error processing payment ${payment.provider_payment_id}:`, error);
        failed++;
        errors.push({
          payment_id: payment.provider_payment_id,
          error: error.message || "Unknown error",
        });
      }
    }

    return NextResponse.json({
      success: true,
      stats: {
        total: unlinkedPayments.length,
        updated,
        failed,
        clientsCreated,
      },
      message: `Successfully linked ${updated} payments to clients. Created ${clientsCreated} new archived clients.`,
      errors: errors.slice(0, 10), // First 10 errors for debugging
    });
  } catch (error: any) {
    console.error("Error in GoCardless payments backfill:", error);
    return NextResponse.json(
      { error: `Backfill failed: ${error.message}` },
      { status: 500 },
    );
  }
}
