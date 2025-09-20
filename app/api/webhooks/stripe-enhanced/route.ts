/**
 * Enhanced Stripe Webhook Handler
 * Handles both SaaS billing and Connect events
 */

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/app/lib/supabase/server";
import { headers } from "next/headers";

// Initialize Stripe only when the handler is called
let stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripe && process.env.STRIPE_SECRET_KEY) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-11-20.acacia",
    });
  }
  if (!stripe) {
    throw new Error(
      "Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.",
    );
  }
  return stripe;
}

// Event handlers map
const eventHandlers: Record<string, (event: Stripe.Event) => Promise<void>> = {
  // SaaS Billing Events
  "checkout.session.completed": handleCheckoutCompleted,
  "customer.subscription.created": handleSubscriptionCreated,
  "customer.subscription.updated": handleSubscriptionUpdated,
  "customer.subscription.deleted": handleSubscriptionDeleted,
  "invoice.payment_succeeded": handleInvoicePaymentSucceeded,
  "invoice.payment_failed": handleInvoicePaymentFailed,

  // Connect Events
  "account.updated": handleAccountUpdated,
  "payment_intent.succeeded": handlePaymentIntentSucceeded,
  "payment_intent.payment_failed": handlePaymentIntentFailed,
  "charge.succeeded": handleChargeSucceeded,
  "charge.refunded": handleChargeRefunded,
  "transfer.created": handleTransferCreated,
  "payout.created": handlePayoutCreated,
  "payout.failed": handlePayoutFailed,
};

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = headers().get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 },
    );
  }

  let event: Stripe.Event;

  try {
    // Verify webhook signature
    const webhookSecret =
      request.headers.get("stripe-connect") === "true"
        ? process.env.STRIPE_CONNECT_WEBHOOK_SECRET!
        : process.env.STRIPE_WEBHOOK_SECRET!;

    event = getStripe().webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const supabase = await createClient();

  try {
    // Check for duplicate events (idempotency)
    const { data: existingEvent } = await supabase
      .from("webhook_events")
      .select("id")
      .eq("provider", "stripe")
      .eq("event_id", event.id)
      .single();

    if (existingEvent) {
      console.log(`Duplicate event ${event.id}, skipping`);
      return NextResponse.json({ received: true });
    }

    // Store event for audit trail
    await supabase.from("webhook_events").insert({
      provider: "stripe",
      event_id: event.id,
      event_type: event.type,
      api_version: event.api_version,
      payload: event as any,
      status: "processing",
    });

    // Handle the event
    const handler = eventHandlers[event.type];
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
      console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Error processing webhook:", error);

    // Store error in DLQ
    await supabase.from("webhook_dlq").insert({
      provider: "stripe",
      event_type: event.type,
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

    // Return 200 to prevent Stripe retries (we handle retries ourselves)
    return NextResponse.json({
      received: true,
      error: "Processing failed, queued for retry",
    });
  }
}

// ==============================================
// SaaS Billing Event Handlers
// ==============================================

async function handleCheckoutCompleted(event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session;
  const supabase = await createClient();

  if (session.mode === "subscription") {
    const organizationId = session.metadata?.organization_id;
    if (!organizationId) throw new Error("Missing organization_id in metadata");

    // Create or update billing customer
    await supabase.from("billing_customers").upsert(
      {
        organization_id: organizationId,
        stripe_customer_id: session.customer as string,
        email: session.customer_email!,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "organization_id",
      },
    );

    // Subscription will be created by customer.subscription.created event
    console.log(`Checkout completed for org ${organizationId}`);
  }
}

async function handleSubscriptionCreated(event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription;
  const supabase = await createClient();

  // Get organization from customer
  const { data: customer } = await supabase
    .from("billing_customers")
    .select("organization_id")
    .eq("stripe_customer_id", subscription.customer)
    .single();

  if (!customer) {
    throw new Error(`No customer found for ${subscription.customer}`);
  }

  // Get plan details
  const priceId = subscription.items.data[0].price.id;
  const { data: plan } = await supabase
    .from("billing_plans")
    .select("plan_key")
    .eq("stripe_price_id", priceId)
    .single();

  // Create subscription record
  await supabase.from("billing_subscriptions").insert({
    organization_id: customer.organization_id,
    billing_customer_id: customer.organization_id,
    stripe_subscription_id: subscription.id,
    stripe_price_id: priceId,
    plan_key: plan?.plan_key || "unknown",
    status: subscription.status,
    current_period_start: new Date(
      subscription.current_period_start * 1000,
    ).toISOString(),
    current_period_end: new Date(
      subscription.current_period_end * 1000,
    ).toISOString(),
    trial_start: subscription.trial_start
      ? new Date(subscription.trial_start * 1000).toISOString()
      : null,
    trial_end: subscription.trial_end
      ? new Date(subscription.trial_end * 1000).toISOString()
      : null,
    cancel_at_period_end: subscription.cancel_at_period_end,
    metadata: subscription.metadata,
  });

  // Update organization features based on plan
  await updateOrganizationFeatures(
    customer.organization_id,
    plan?.plan_key || "starter",
  );

  // Track revenue
  await trackPlatformRevenue({
    organizationId: customer.organization_id,
    type: "subscription",
    amountCents: subscription.items.data[0].price.unit_amount!,
    currency: subscription.currency,
    sourceId: subscription.id,
    periodStart: new Date(
      subscription.current_period_start * 1000,
    ).toISOString(),
    periodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
  });
}

async function handleSubscriptionUpdated(event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription;
  const supabase = await createClient();

  const priceId = subscription.items.data[0].price.id;
  const { data: plan } = await supabase
    .from("billing_plans")
    .select("plan_key")
    .eq("stripe_price_id", priceId)
    .single();

  await supabase
    .from("billing_subscriptions")
    .update({
      status: subscription.status,
      stripe_price_id: priceId,
      plan_key: plan?.plan_key || "unknown",
      current_period_start: new Date(
        subscription.current_period_start * 1000,
      ).toISOString(),
      current_period_end: new Date(
        subscription.current_period_end * 1000,
      ).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id);

  // Get organization
  const { data: sub } = await supabase
    .from("billing_subscriptions")
    .select("organization_id")
    .eq("stripe_subscription_id", subscription.id)
    .single();

  if (sub) {
    await updateOrganizationFeatures(
      sub.organization_id,
      plan?.plan_key || "starter",
    );
  }
}

async function handleSubscriptionDeleted(event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription;
  const supabase = await createClient();

  await supabase
    .from("billing_subscriptions")
    .update({
      status: "canceled",
      ended_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id);

  // Downgrade to free tier
  const { data: sub } = await supabase
    .from("billing_subscriptions")
    .select("organization_id")
    .eq("stripe_subscription_id", subscription.id)
    .single();

  if (sub) {
    await updateOrganizationFeatures(sub.organization_id, "free");
  }
}

async function handleInvoicePaymentSucceeded(event: Stripe.Event) {
  const invoice = event.data.object as Stripe.Invoice;
  const supabase = await createClient();

  // Track successful payment
  const { data: customer } = await supabase
    .from("billing_customers")
    .select("organization_id")
    .eq("stripe_customer_id", invoice.customer)
    .single();

  if (customer) {
    await supabase.from("platform_revenue").insert({
      organization_id: customer.organization_id,
      type: "subscription",
      amount_cents: invoice.amount_paid,
      currency: invoice.currency,
      source: "stripe",
      source_id: invoice.id,
      status: "collected",
      collected_at: new Date().toISOString(),
    });
  }
}

async function handleInvoicePaymentFailed(event: Stripe.Event) {
  const invoice = event.data.object as Stripe.Invoice;
  const supabase = await createClient();

  // Update subscription status
  if (invoice.subscription) {
    await supabase
      .from("billing_subscriptions")
      .update({
        status: "past_due",
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_subscription_id", invoice.subscription);
  }

  // TODO: Send payment failure notification
}

// ==============================================
// Connect Event Handlers
// ==============================================

async function handleAccountUpdated(event: Stripe.Event) {
  const account = event.data.object as Stripe.Account;
  const supabase = await createClient();

  await supabase
    .from("connected_accounts")
    .update({
      stripe_account_status: account.charges_enabled ? "enabled" : "restricted",
      stripe_charges_enabled: account.charges_enabled,
      stripe_payouts_enabled: account.payouts_enabled,
      stripe_details_submitted: account.details_submitted,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_account_id", account.id);
}

async function handlePaymentIntentSucceeded(event: Stripe.Event) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  const supabase = await createClient();

  // Update gym charge
  await supabase
    .from("gym_charges")
    .update({
      status: "succeeded",
      confirmed_at: new Date().toISOString(),
      processor_charge_id: paymentIntent.latest_charge as string,
      updated_at: new Date().toISOString(),
    })
    .eq("processor_payment_id", paymentIntent.id);

  // Track platform fee if present
  if (paymentIntent.application_fee_amount) {
    const { data: charge } = await supabase
      .from("gym_charges")
      .select("organization_id")
      .eq("processor_payment_id", paymentIntent.id)
      .single();

    if (charge) {
      await trackPlatformRevenue({
        organizationId: charge.organization_id,
        type: "platform_fee",
        amountCents: paymentIntent.application_fee_amount,
        currency: paymentIntent.currency,
        sourceId: paymentIntent.id,
      });
    }
  }
}

async function handlePaymentIntentFailed(event: Stripe.Event) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  const supabase = await createClient();

  await supabase
    .from("gym_charges")
    .update({
      status: "failed",
      failure_reason: paymentIntent.last_payment_error?.message,
      failed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("processor_payment_id", paymentIntent.id);
}

async function handleChargeSucceeded(event: Stripe.Event) {
  const charge = event.data.object as Stripe.Charge;
  const supabase = await createClient();

  // Update charge with receipt URL
  await supabase
    .from("gym_charges")
    .update({
      receipt_url: charge.receipt_url,
      receipt_email: charge.receipt_email,
      updated_at: new Date().toISOString(),
    })
    .eq("processor_charge_id", charge.id);
}

async function handleChargeRefunded(event: Stripe.Event) {
  const charge = event.data.object as Stripe.Charge;
  const supabase = await createClient();

  await supabase
    .from("gym_charges")
    .update({
      status: charge.refunded ? "refunded" : "partially_refunded",
      refund_amount_cents: charge.amount_refunded,
      refunded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("processor_charge_id", charge.id);
}

async function handleTransferCreated(event: Stripe.Event) {
  const transfer = event.data.object as Stripe.Transfer;
  const supabase = await createClient();

  // Update charge with transfer ID
  if (transfer.source_transaction) {
    await supabase
      .from("gym_charges")
      .update({
        processor_transfer_id: transfer.id,
        updated_at: new Date().toISOString(),
      })
      .eq("processor_charge_id", transfer.source_transaction);
  }
}

async function handlePayoutCreated(event: Stripe.Event) {
  const payout = event.data.object as Stripe.Payout;
  console.log(
    `Payout created: ${payout.id} for ${payout.amount} ${payout.currency}`,
  );
  // TODO: Track payouts if needed
}

async function handlePayoutFailed(event: Stripe.Event) {
  const payout = event.data.object as Stripe.Payout;
  console.error(`Payout failed: ${payout.id} - ${payout.failure_message}`);
  // TODO: Alert merchant of payout failure
}

// ==============================================
// Helper Functions
// ==============================================

async function updateOrganizationFeatures(
  organizationId: string,
  planKey: string,
) {
  const supabase = await createClient();

  const features = {
    free: { max_clients: 10, max_staff: 1, features: ["basic_crm"] },
    starter: {
      max_clients: 100,
      max_staff: 3,
      features: ["crm", "booking", "basic_automation"],
    },
    starter_monthly: {
      max_clients: 100,
      max_staff: 3,
      features: ["crm", "booking", "basic_automation"],
    },
    starter_annual: {
      max_clients: 100,
      max_staff: 3,
      features: ["crm", "booking", "basic_automation"],
    },
    pro: {
      max_clients: 500,
      max_staff: 10,
      features: ["crm", "booking", "automation", "ai_features"],
    },
    pro_monthly: {
      max_clients: 500,
      max_staff: 10,
      features: ["crm", "booking", "automation", "ai_features"],
    },
    pro_annual: {
      max_clients: 500,
      max_staff: 10,
      features: ["crm", "booking", "automation", "ai_features"],
    },
    enterprise: {
      max_clients: 999999,
      max_staff: 999999,
      features: [
        "crm",
        "booking",
        "automation",
        "ai_features",
        "white_label",
        "priority_support",
      ],
    },
    enterprise_monthly: {
      max_clients: 999999,
      max_staff: 999999,
      features: [
        "crm",
        "booking",
        "automation",
        "ai_features",
        "white_label",
        "priority_support",
      ],
    },
    enterprise_annual: {
      max_clients: 999999,
      max_staff: 999999,
      features: [
        "crm",
        "booking",
        "automation",
        "ai_features",
        "white_label",
        "priority_support",
      ],
    },
  };

  const planFeatures = features[planKey] || features.free;

  await supabase.from("organization_features").upsert(
    {
      organization_id: organizationId,
      ...planFeatures,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "organization_id",
    },
  );
}

async function trackPlatformRevenue(params: {
  organizationId: string;
  type: string;
  amountCents: number;
  currency: string;
  sourceId: string;
  periodStart?: string;
  periodEnd?: string;
}) {
  const supabase = await createClient();

  await supabase.from("platform_revenue").insert({
    organization_id: params.organizationId,
    type: params.type,
    amount_cents: params.amountCents,
    currency: params.currency,
    source: "stripe",
    source_id: params.sourceId,
    period_start: params.periodStart,
    period_end: params.periodEnd,
    status: "collected",
    collected_at: new Date().toISOString(),
  });
}
