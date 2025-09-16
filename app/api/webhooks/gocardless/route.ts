/**
 * GoCardless Webhook Handler
 * Handles direct debit events
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { goCardlessService } from "@/app/lib/gocardless-server";
import crypto from "crypto";

interface GoCardlessEvent {
  id: string;
  created_at: string;
  resource_type: string;
  action: string;
  links: Record<string, string>;
  details: {
    origin: string;
    cause: string;
    description?: string;
    scheme?: string;
    reason_code?: string;
  };
  metadata: Record<string, string>;
}

interface WebhookPayload {
  events: GoCardlessEvent[];
}

// Event handlers
const eventHandlers: Record<string, (event: GoCardlessEvent) => Promise<void>> =
  {
    // Mandate events
    "mandates.created": handleMandateCreated,
    "mandates.submitted": handleMandateSubmitted,
    "mandates.active": handleMandateActive,
    "mandates.cancelled": handleMandateCancelled,
    "mandates.failed": handleMandateFailed,
    "mandates.expired": handleMandateExpired,

    // Payment events
    "payments.created": handlePaymentCreated,
    "payments.submitted": handlePaymentSubmitted,
    "payments.confirmed": handlePaymentConfirmed,
    "payments.paid_out": handlePaymentPaidOut,
    "payments.failed": handlePaymentFailed,
    "payments.charged_back": handlePaymentChargedBack,
    "payments.cancelled": handlePaymentCancelled,

    // Subscription events
    "subscriptions.created": handleSubscriptionCreated,
    "subscriptions.payment_created": handleSubscriptionPaymentCreated,
    "subscriptions.cancelled": handleSubscriptionCancelled,

    // Refund events
    "refunds.created": handleRefundCreated,
    "refunds.paid": handleRefundPaid,

    // Payout events
    "payouts.paid": handlePayoutPaid,
  };

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("webhook-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing webhook-signature header" },
      { status: 400 },
    );
  }

  // Verify signature
  const webhookSecret = process.env.GOCARDLESS_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("GOCARDLESS_WEBHOOK_SECRET not configured");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 },
    );
  }

  const computedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(body)
    .digest("hex");

  if (
    !crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(computedSignature),
    )
  ) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload: WebhookPayload = JSON.parse(body);
  const supabase = createClient();

  // Process each event
  for (const event of payload.events) {
    try {
      // Check for duplicate events (idempotency)
      const { data: existingEvent } = await supabase
        .from("webhook_events")
        .select("id")
        .eq("provider", "gocardless")
        .eq("event_id", event.id)
        .single();

      if (existingEvent) {
        console.log(`Duplicate GoCardless event ${event.id}, skipping`);
        continue;
      }

      // Store event
      await supabase.from("webhook_events").insert({
        provider: "gocardless",
        event_id: event.id,
        event_type: `${event.resource_type}.${event.action}`,
        payload: event as any,
        status: "processing",
      });

      // Handle the event
      const eventType = `${event.resource_type}.${event.action}`;
      const handler = eventHandlers[eventType];

      if (handler) {
        await handler(event);

        // Mark as processed
        await supabase
          .from("webhook_events")
          .update({
            status: "processed",
            processed_at: new Date().toISOString(),
          })
          .eq("event_id", event.id);
      } else {
        console.log(`Unhandled GoCardless event type: ${eventType}`);
      }
    } catch (error) {
      console.error("Error processing GoCardless webhook:", error);

      // Store error in DLQ
      await supabase.from("webhook_dlq").insert({
        provider: "gocardless",
        event_type: `${event.resource_type}.${event.action}`,
        error_message: error.message,
        error_details: { event_id: event.id, error },
      });

      // Mark event as failed
      await supabase
        .from("webhook_events")
        .update({
          status: "failed",
          failed_at: new Date().toISOString(),
          last_error: error.message,
        })
        .eq("event_id", event.id);
    }
  }

  // GoCardless expects 204 No Content response
  return new NextResponse(null, { status: 204 });
}

// =========================================
// Mandate Event Handlers
// =========================================

async function handleMandateCreated(event: GoCardlessEvent) {
  console.log("Mandate created:", event.links.mandate);
  // Initial mandate creation - wait for activation
}

async function handleMandateSubmitted(event: GoCardlessEvent) {
  console.log("Mandate submitted for processing:", event.links.mandate);
  // Mandate submitted to bank
}

async function handleMandateActive(event: GoCardlessEvent) {
  const mandateId = event.links.mandate;
  const supabase = createClient();

  // Update payment method status
  await supabase
    .from("client_payment_methods")
    .update({
      status: "active",
      updated_at: new Date().toISOString(),
    })
    .eq("gc_mandate_id", mandateId);

  console.log("Mandate now active and ready for payments:", mandateId);
}

async function handleMandateCancelled(event: GoCardlessEvent) {
  const mandateId = event.links.mandate;
  const supabase = createClient();

  // Update payment method status
  await supabase
    .from("client_payment_methods")
    .update({
      status: "canceled",
      updated_at: new Date().toISOString(),
    })
    .eq("gc_mandate_id", mandateId);

  // Cancel any active subscriptions using this mandate
  await supabase
    .from("gym_subscriptions")
    .update({
      status: "canceled",
      canceled_at: new Date().toISOString(),
      cancellation_reason: "Mandate cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("payment_method_id", mandateId)
    .eq("status", "active");
}

async function handleMandateFailed(event: GoCardlessEvent) {
  const mandateId = event.links.mandate;
  const supabase = createClient();

  await supabase
    .from("client_payment_methods")
    .update({
      status: "failed",
      updated_at: new Date().toISOString(),
    })
    .eq("gc_mandate_id", mandateId);

  console.error("Mandate failed:", mandateId, event.details);
}

async function handleMandateExpired(event: GoCardlessEvent) {
  const mandateId = event.links.mandate;
  const supabase = createClient();

  await supabase
    .from("client_payment_methods")
    .update({
      status: "expired",
      updated_at: new Date().toISOString(),
    })
    .eq("gc_mandate_id", mandateId);
}

// =========================================
// Payment Event Handlers
// =========================================

async function handlePaymentCreated(event: GoCardlessEvent) {
  const paymentId = event.links.payment;
  console.log("Payment created:", paymentId);
  // Payment created but not yet submitted to bank
}

async function handlePaymentSubmitted(event: GoCardlessEvent) {
  const paymentId = event.links.payment;
  const supabase = createClient();

  await supabase
    .from("gym_charges")
    .update({
      status: "processing",
      updated_at: new Date().toISOString(),
    })
    .eq("processor_payment_id", paymentId);
}

async function handlePaymentConfirmed(event: GoCardlessEvent) {
  const paymentId = event.links.payment;
  const supabase = createClient();

  await supabase
    .from("gym_charges")
    .update({
      status: "succeeded",
      confirmed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("processor_payment_id", paymentId);

  // Track platform fee if applicable
  const { data: charge } = await supabase
    .from("gym_charges")
    .select("organization_id, platform_fee_cents, currency")
    .eq("processor_payment_id", paymentId)
    .single();

  if (charge && charge.platform_fee_cents > 0) {
    await supabase.from("platform_revenue").insert({
      organization_id: charge.organization_id,
      type: "platform_fee",
      amount_cents: charge.platform_fee_cents,
      currency: charge.currency,
      source: "gocardless",
      source_id: paymentId,
      status: "collected",
      collected_at: new Date().toISOString(),
    });
  }
}

async function handlePaymentPaidOut(event: GoCardlessEvent) {
  const paymentId = event.links.payment;
  console.log("Payment paid out to merchant:", paymentId);
  // Payment has been paid out to the merchant's bank account
}

async function handlePaymentFailed(event: GoCardlessEvent) {
  const paymentId = event.links.payment;
  const supabase = createClient();

  await supabase
    .from("gym_charges")
    .update({
      status: "failed",
      failure_reason: event.details.description || event.details.reason_code,
      failed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("processor_payment_id", paymentId);

  // Update subscription if this was a recurring payment
  if (event.links.subscription) {
    const { data: sub } = await supabase
      .from("gym_subscriptions")
      .select("failed_payment_count")
      .eq("gc_subscription_id", event.links.subscription)
      .single();

    if (sub) {
      await supabase
        .from("gym_subscriptions")
        .update({
          failed_payment_count: (sub.failed_payment_count || 0) + 1,
          status: "past_due",
          updated_at: new Date().toISOString(),
        })
        .eq("gc_subscription_id", event.links.subscription);
    }
  }
}

async function handlePaymentChargedBack(event: GoCardlessEvent) {
  const paymentId = event.links.payment;
  const supabase = createClient();

  await supabase
    .from("gym_charges")
    .update({
      status: "refunded",
      refund_amount_cents: 0, // Will be updated with actual amount
      refunded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("processor_payment_id", paymentId);

  console.log("Payment charged back:", paymentId);
  // TODO: Alert merchant of chargeback
}

async function handlePaymentCancelled(event: GoCardlessEvent) {
  const paymentId = event.links.payment;
  const supabase = createClient();

  await supabase
    .from("gym_charges")
    .update({
      status: "canceled",
      updated_at: new Date().toISOString(),
    })
    .eq("processor_payment_id", paymentId);
}

// =========================================
// Subscription Event Handlers
// =========================================

async function handleSubscriptionCreated(event: GoCardlessEvent) {
  const subscriptionId = event.links.subscription;
  console.log("Subscription created:", subscriptionId);
  // Subscription created - payments will follow
}

async function handleSubscriptionPaymentCreated(event: GoCardlessEvent) {
  const subscriptionId = event.links.subscription;
  const paymentId = event.links.payment;
  const supabase = createClient();

  // Update last payment info
  await supabase
    .from("gym_subscriptions")
    .update({
      last_payment_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("gc_subscription_id", subscriptionId);

  console.log("Subscription payment created:", paymentId);
}

async function handleSubscriptionCancelled(event: GoCardlessEvent) {
  const subscriptionId = event.links.subscription;
  const supabase = createClient();

  await supabase
    .from("gym_subscriptions")
    .update({
      status: "canceled",
      canceled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("gc_subscription_id", subscriptionId);
}

// =========================================
// Refund Event Handlers
// =========================================

async function handleRefundCreated(event: GoCardlessEvent) {
  const refundId = event.links.refund;
  const paymentId = event.links.payment;
  console.log("Refund created:", refundId, "for payment:", paymentId);
}

async function handleRefundPaid(event: GoCardlessEvent) {
  const refundId = event.links.refund;
  const paymentId = event.links.payment;
  const supabase = createClient();

  // Get refund details from GoCardless API if needed
  // For now, mark as refunded
  await supabase
    .from("gym_charges")
    .update({
      status: "refunded",
      refunded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("processor_payment_id", paymentId);

  console.log("Refund paid:", refundId);
}

// =========================================
// Payout Event Handlers
// =========================================

async function handlePayoutPaid(event: GoCardlessEvent) {
  const payoutId = event.links.payout;
  console.log("Payout completed:", payoutId);
  // Track payout if needed for reconciliation
}
