import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import Stripe from "stripe";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Backfill client_id for existing Stripe payments
 * This fetches customer info from Stripe API and links payments to clients
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

    // Get Stripe connection
    const { data: connection } = await supabaseAdmin
      .from("stripe_connect_accounts")
      .select("access_token, stripe_account_id")
      .eq("organization_id", organizationId)
      .single();

    if (!connection || !connection.access_token) {
      return NextResponse.json(
        { error: "Stripe account not connected" },
        { status: 404 },
      );
    }

    // Initialize Stripe client
    const stripe = new Stripe(connection.access_token, {
      apiVersion: "2024-11-20.acacia",
    });

    // Get all unlinked Stripe payments with stripe_customer_id in metadata
    const { data: unlinkedPayments } = await supabaseAdmin
      .from("payments")
      .select("id, provider_payment_id, metadata, amount, payment_date")
      .eq("organization_id", organizationId)
      .eq("payment_provider", "stripe")
      .is("client_id", null);

    if (!unlinkedPayments || unlinkedPayments.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No unlinked payments found",
        stats: {
          total: 0,
          updated: 0,
          failed: 0,
          skipped: 0,
          clientsCreated: 0,
        },
      });
    }

    console.log(`Found ${unlinkedPayments.length} unlinked Stripe payments to backfill`);

    let updated = 0;
    let failed = 0;
    let skipped = 0;
    let clientsCreated = 0;
    const errors: Array<{ payment_id: string; error: string }> = [];

    // Process each payment
    for (const payment of unlinkedPayments) {
      try {
        // Check if payment has stripe_customer_id in metadata
        const stripeCustomerId = payment.metadata?.stripe_customer_id;

        if (!stripeCustomerId) {
          console.log(`Payment ${payment.provider_payment_id} has no Stripe customer ID`);
          skipped++;
          continue;
        }

        // Fetch customer details from Stripe
        let stripeCustomer;
        try {
          stripeCustomer = await stripe.customers.retrieve(stripeCustomerId);
        } catch (stripeError: any) {
          console.error(`Failed to fetch Stripe customer ${stripeCustomerId}:`, stripeError);
          failed++;
          errors.push({
            payment_id: payment.provider_payment_id,
            error: `Stripe API error: ${stripeError.message}`,
          });
          continue;
        }

        // @ts-ignore - Stripe types can be complex
        if (stripeCustomer.deleted) {
          console.log(`Customer ${stripeCustomerId} has been deleted`);
          skipped++;
          continue;
        }

        // @ts-ignore
        const customerEmail = stripeCustomer.email;
        if (!customerEmail) {
          console.log(`Customer ${stripeCustomerId} has no email`);
          skipped++;
          continue;
        }

        // Try to find client by email (case-insensitive)
        let { data: matchedClient } = await supabaseAdmin
          .from("clients")
          .select("id, email")
          .eq("org_id", organizationId)
          .ilike("email", customerEmail)
          .maybeSingle();

        // Fallback: Try exact lowercase match
        if (!matchedClient) {
          const { data: exactMatch } = await supabaseAdmin
            .from("clients")
            .select("id, email")
            .eq("org_id", organizationId)
            .eq("email", customerEmail.toLowerCase())
            .maybeSingle();

          if (exactMatch) {
            matchedClient = exactMatch;
          }
        }

        let clientId: string;

        if (matchedClient) {
          clientId = matchedClient.id;
          console.log(
            `Matched payment ${payment.provider_payment_id} to existing client ${customerEmail}`,
          );
        } else {
          // Auto-create archived client for historical data
          // @ts-ignore
          const firstName = stripeCustomer.name?.split(" ")[0] || "Unknown";
          // @ts-ignore
          const lastName = stripeCustomer.name?.split(" ").slice(1).join(" ") || "";

          const { data: newClient, error: clientError } = await supabaseAdmin
            .from("clients")
            .insert({
              org_id: organizationId,
              first_name: firstName,
              last_name: lastName,
              email: customerEmail,
              // @ts-ignore
              phone: stripeCustomer.phone || null,
              status: "archived",
              source: "stripe_backfill",
              metadata: {
                stripe_customer_id: stripeCustomerId,
              },
              // @ts-ignore
              created_at: new Date(stripeCustomer.created * 1000).toISOString(),
            })
            .select("id")
            .single();

          if (clientError || !newClient) {
            console.error(`Failed to create client for ${customerEmail}:`, clientError);
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
            `Created archived client for ${customerEmail} (Stripe customer ${stripeCustomerId})`,
          );
        }

        // Update payment with client_id and enhanced metadata
        const { error: updateError } = await supabaseAdmin
          .from("payments")
          .update({
            client_id: clientId,
            metadata: {
              ...payment.metadata,
              stripe_customer_id: stripeCustomerId,
              customer_email: customerEmail,
              // @ts-ignore
              customer_name: stripeCustomer.name || "",
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
        skipped,
        clientsCreated,
      },
      message: `Successfully linked ${updated} payments to clients. Created ${clientsCreated} new archived clients. Skipped ${skipped} payments without Stripe customer ID.`,
      errors: errors.slice(0, 10), // First 10 errors for debugging
    });
  } catch (error: any) {
    console.error("Error in Stripe payments backfill:", error);
    return NextResponse.json(
      { error: `Backfill failed: ${error.message}` },
      { status: 500 },
    );
  }
}
