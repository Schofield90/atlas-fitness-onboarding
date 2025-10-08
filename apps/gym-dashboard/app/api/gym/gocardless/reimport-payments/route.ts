import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

// @ts-ignore - CommonJS module
const gocardless = require("gocardless-nodejs");
const { Environments } = require("gocardless-nodejs/constants");

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Delete broken GoCardless payments and re-import them properly
 * This fixes payments that were imported without customer links
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

    // Step 1: Get all unlinked payments to delete
    const { data: unlinkedPayments } = await supabaseAdmin
      .from("payments")
      .select("id, provider_payment_id")
      .eq("organization_id", organizationId)
      .eq("payment_provider", "gocardless")
      .is("client_id", null);

    if (!unlinkedPayments || unlinkedPayments.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No unlinked payments to re-import",
        stats: { deleted: 0, imported: 0 },
      });
    }

    console.log(
      `Found ${unlinkedPayments.length} unlinked payments to re-import`,
    );

    // Step 2: Delete the broken payments
    const paymentIds = unlinkedPayments.map((p) => p.id);
    const { error: deleteError } = await supabaseAdmin
      .from("payments")
      .delete()
      .in("id", paymentIds);

    if (deleteError) {
      console.error("Error deleting broken payments:", deleteError);
      return NextResponse.json(
        { error: `Failed to delete broken payments: ${deleteError.message}` },
        { status: 500 },
      );
    }

    console.log(`Deleted ${paymentIds.length} broken payments`);

    // Step 3: Re-import payments from GoCardless with proper customer links
    const providerPaymentIds = unlinkedPayments.map(
      (p) => p.provider_payment_id,
    );

    let imported = 0;
    let skipped = 0;
    let clientsCreated = 0;
    const errors: Array<{ payment_id: string; error: string }> = [];

    for (const gcPaymentId of providerPaymentIds) {
      try {
        // Fetch payment from GoCardless
        const gcPayment = await client.payments.find(gcPaymentId);

        // Check if payment has customer link
        if (!gcPayment.links?.customer) {
          console.log(`Payment ${gcPaymentId} has no customer link - skipping`);
          skipped++;
          errors.push({
            payment_id: gcPaymentId,
            error: "No customer link in GoCardless - cannot import",
          });
          continue;
        }

        // Fetch customer details
        const gcCustomer = await client.customers.find(
          gcPayment.links.customer,
        );

        if (!gcCustomer.email) {
          console.log(
            `Customer ${gcPayment.links.customer} has no email - skipping`,
          );
          skipped++;
          errors.push({
            payment_id: gcPaymentId,
            error: "Customer has no email",
          });
          continue;
        }

        // Try to find client by email
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
        } else {
          // Auto-create archived client
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
              source: "gocardless_reimport",
              metadata: {
                gocardless_customer_id: gcCustomer.id,
              },
              created_at: new Date(gcCustomer.created_at).toISOString(),
            })
            .select("id")
            .single();

          if (clientError || !newClient) {
            console.error(
              `Failed to create client for ${gcCustomer.email}:`,
              clientError,
            );
            skipped++;
            errors.push({
              payment_id: gcPaymentId,
              error: clientError?.message || "Failed to create client",
            });
            continue;
          }

          clientId = newClient.id;
          clientsCreated++;
        }

        // Create payment record with proper links
        const amount = parseInt(gcPayment.amount) / 100;
        const { error: insertError } = await supabaseAdmin
          .from("payments")
          .insert({
            organization_id: organizationId,
            client_id: clientId,
            amount,
            currency: gcPayment.currency.toUpperCase(),
            status: "completed",
            payment_status: gcPayment.status,
            payment_method: "direct_debit",
            payment_provider: "gocardless",
            provider_payment_id: gcPayment.id,
            payment_date:
              gcPayment.charge_date || new Date().toISOString().split("T")[0],
            description: gcPayment.description || `GoCardless payment`,
            metadata: {
              gocardless_payment_id: gcPayment.id,
              gocardless_customer_id: gcPayment.links.customer,
              gocardless_subscription_id: gcPayment.links?.subscription,
              customer_email: gcCustomer.email,
              customer_name:
                `${gcCustomer.given_name || ""} ${gcCustomer.family_name || ""}`.trim(),
              charge_date: gcPayment.charge_date,
              reference: gcPayment.reference,
              currency: gcPayment.currency.toUpperCase(),
              amount_minor: gcPayment.amount,
            },
            created_at: new Date(gcPayment.created_at).toISOString(),
          });

        if (insertError) {
          console.error(
            `Error re-importing payment ${gcPaymentId}:`,
            insertError,
          );
          skipped++;
          errors.push({
            payment_id: gcPaymentId,
            error: insertError.message,
          });
        } else {
          imported++;
          console.log(
            `✓ Re-imported payment ${gcPaymentId} -> client ${clientId}`,
          );
        }
      } catch (error: any) {
        console.error(`Error processing payment ${gcPaymentId}:`, error);
        skipped++;
        errors.push({
          payment_id: gcPaymentId,
          error: error.message || "Unknown error",
        });
      }
    }

    return NextResponse.json({
      success: true,
      stats: {
        deleted: paymentIds.length,
        imported,
        skipped,
        clientsCreated,
      },
      message: `Deleted ${paymentIds.length} broken payments, successfully re-imported ${imported} with customer links. Created ${clientsCreated} new clients.`,
      errors: errors.slice(0, 10),
    });
  } catch (error: any) {
    console.error("Error in payment re-import:", error);
    return NextResponse.json(
      { error: `Re-import failed: ${error.message}` },
      { status: 500 },
    );
  }
}
