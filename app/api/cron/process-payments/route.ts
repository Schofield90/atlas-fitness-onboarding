import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

// Force Node.js runtime for payment processing
export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    console.log("[Payment Processor] Starting scheduled payment processing...");

    // Fetch all payments that are scheduled and due today or earlier
    const today = new Date().toISOString().split("T")[0];

    const { data: duePayments, error: fetchError } = await supabase
      .from("payments")
      .select(`
        *,
        clients!inner(
          id,
          email,
          first_name,
          last_name,
          organization_id,
          organizations!inner(
            id,
            name
          )
        )
      `)
      .eq("payment_status", "scheduled")
      .lte("payment_date", today)
      .limit(50); // Process max 50 payments per run

    if (fetchError) {
      console.error("[Payment Processor] Error fetching due payments:", fetchError);
      return NextResponse.json({ error: "Failed to fetch due payments" }, { status: 500 });
    }

    if (!duePayments || duePayments.length === 0) {
      console.log("[Payment Processor] No payments due for processing");
      return NextResponse.json({
        success: true,
        message: "No payments due",
        processed: 0
      });
    }

    console.log(`[Payment Processor] Found ${duePayments.length} payments due for processing`);

    const results = {
      succeeded: 0,
      failed: 0,
      errors: [] as any[],
    };

    // Process each payment
    for (const payment of duePayments) {
      try {
        // Get Stripe connection for organization
        const { data: stripeAccount } = await supabase
          .from("payment_provider_accounts")
          .select("access_token")
          .eq("organization_id", payment.clients.organization_id)
          .eq("provider", "stripe")
          .maybeSingle();

        if (!stripeAccount?.access_token) {
          throw new Error("No Stripe account connected for organization");
        }

        // Get or create Stripe customer
        let stripeCustomerId = payment.metadata?.stripe_customer_id;

        if (!stripeCustomerId) {
          // Create Stripe customer
          const customer = await stripe.customers.create(
            {
              email: payment.clients.email,
              name: `${payment.clients.first_name} ${payment.clients.last_name}`,
              metadata: {
                client_id: payment.client_id,
                organization_id: payment.clients.organization_id,
              },
            },
            {
              stripeAccount: stripeAccount.access_token,
            }
          );

          stripeCustomerId = customer.id;

          // Update payment with Stripe customer ID
          await supabase
            .from("payments")
            .update({
              metadata: {
                ...payment.metadata,
                stripe_customer_id: customer.id,
              },
            })
            .eq("id", payment.id);
        }

        // Get default payment method
        const paymentMethods = await stripe.paymentMethods.list(
          {
            customer: stripeCustomerId,
            type: "card",
          },
          {
            stripeAccount: stripeAccount.access_token,
          }
        );

        if (paymentMethods.data.length === 0) {
          throw new Error("No payment method on file for customer");
        }

        // Process based on payment provider
        if (payment.payment_provider === "stripe") {
          // Create Stripe payment intent
          const paymentIntent = await stripe.paymentIntents.create(
            {
              amount: Math.round(payment.amount * 100), // Convert to pennies
              currency: "gbp",
              customer: stripeCustomerId,
              payment_method: paymentMethods.data[0].id,
              off_session: true,
              confirm: true,
              description: payment.description || "Recurring membership payment",
              metadata: {
                payment_id: payment.id,
                client_id: payment.client_id,
                organization_id: payment.clients.organization_id,
              },
            },
            {
              stripeAccount: stripeAccount.access_token,
            }
          );

          // Update payment record
          await supabase
            .from("payments")
            .update({
              payment_status: paymentIntent.status === "succeeded" ? "paid_out" : "failed",
              provider_payment_id: paymentIntent.id,
              metadata: {
                ...payment.metadata,
                stripe_payment_intent_id: paymentIntent.id,
                stripe_customer_id: stripeCustomerId,
                processed_at: new Date().toISOString(),
              },
            })
            .eq("id", payment.id);

          results.succeeded++;
          console.log(`[Payment Processor] ✅ Processed Stripe payment ${payment.id}`);
        } else if (payment.payment_provider === "gocardless") {
          // Get GoCardless connection
          const { data: gcAccount } = await supabase
            .from("payment_provider_accounts")
            .select("access_token")
            .eq("organization_id", payment.clients.organization_id)
            .eq("provider", "gocardless")
            .maybeSingle();

          if (!gcAccount?.access_token) {
            throw new Error("No GoCardless account connected for organization");
          }

          // Import GoCardless client
          const GoCardlessClient = (await import("gocardless-nodejs")).GoCardlessClient;
          const constants = (await import("gocardless-nodejs/constants"));

          const gocardless = new GoCardlessClient(
            gcAccount.access_token,
            constants.Environments.Live
          );

          // Get or create GoCardless customer
          let gcCustomerId = payment.metadata?.gocardless_customer_id;

          if (!gcCustomerId) {
            const gcCustomer = await gocardless.customers.create({
              email: payment.clients.email,
              given_name: payment.clients.first_name,
              family_name: payment.clients.last_name,
              metadata: {
                client_id: payment.client_id,
                organization_id: payment.clients.organization_id,
              },
            });

            gcCustomerId = gcCustomer.id;

            // Update payment with GoCardless customer ID
            await supabase
              .from("payments")
              .update({
                metadata: {
                  ...payment.metadata,
                  gocardless_customer_id: gcCustomer.id,
                },
              })
              .eq("id", payment.id);
          }

          // Get customer bank accounts
          const mandates = await gocardless.mandates.list({
            customer: gcCustomerId,
            status: "active",
          });

          if (!mandates.mandates || mandates.mandates.length === 0) {
            throw new Error("No active Direct Debit mandate for customer");
          }

          // Create payment
          const gcPayment = await gocardless.payments.create({
            amount: Math.round(payment.amount * 100), // Convert to pennies
            currency: "GBP",
            links: {
              mandate: mandates.mandates[0].id,
            },
            description: payment.description || "Recurring membership payment",
            metadata: {
              payment_id: payment.id,
              client_id: payment.client_id,
              organization_id: payment.clients.organization_id,
            },
          });

          // Update payment record
          await supabase
            .from("payments")
            .update({
              payment_status: gcPayment.status === "confirmed" || gcPayment.status === "paid_out" ? "paid_out" : "pending_submission",
              provider_payment_id: gcPayment.id,
              metadata: {
                ...payment.metadata,
                gocardless_payment_id: gcPayment.id,
                gocardless_customer_id: gcCustomerId,
                processed_at: new Date().toISOString(),
              },
            })
            .eq("id", payment.id);

          results.succeeded++;
          console.log(`[Payment Processor] ✅ Processed GoCardless payment ${payment.id}`);
        } else {
          throw new Error(`Unsupported payment provider: ${payment.payment_provider}`);
        }
      } catch (error: any) {
        console.error(`[Payment Processor] ❌ Failed to process payment ${payment.id}:`, error);

        // Get current retry count
        const retryCount = (payment.metadata?.retry_count || 0) + 1;
        const maxRetries = 3;

        // Determine if we should retry
        const shouldRetry = retryCount < maxRetries &&
          !error.message.includes("No payment method") &&
          !error.message.includes("No active Direct Debit mandate");

        // Update payment with error information
        await supabase
          .from("payments")
          .update({
            payment_status: shouldRetry ? "scheduled" : "failed",
            metadata: {
              ...payment.metadata,
              retry_count: retryCount,
              last_error: error.message,
              last_retry_at: new Date().toISOString(),
              failed_at: shouldRetry ? null : new Date().toISOString(),
            },
          })
          .eq("id", payment.id);

        results.failed++;
        results.errors.push({
          payment_id: payment.id,
          client_id: payment.client_id,
          error: error.message,
          retry_count: retryCount,
          will_retry: shouldRetry,
        });

        console.log(
          `[Payment Processor] Payment ${payment.id} ${shouldRetry ? `will retry (${retryCount}/${maxRetries})` : "marked as failed"}`
        );
      }
    }

    console.log(`[Payment Processor] Complete: ${results.succeeded} succeeded, ${results.failed} failed`);

    return NextResponse.json({
      success: true,
      processed: duePayments.length,
      succeeded: results.succeeded,
      failed: results.failed,
      errors: results.errors,
    });
  } catch (error: any) {
    console.error("[Payment Processor] Fatal error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
