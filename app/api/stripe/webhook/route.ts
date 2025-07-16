import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/supabase';

// Initialize Stripe only if key is available
let stripe: Stripe | null = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-11-20.acacia',
  });
}

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

export async function POST(request: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
  }

  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig!, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  const { user_id, organization_id } = subscription.metadata;

  if (!user_id || !organization_id) {
    console.error('Missing metadata in subscription:', subscription.id);
    return;
  }

  // Create subscription record
  const { error } = await supabaseAdmin
    .from('subscriptions')
    .insert([{
      organization_id,
      stripe_customer_id: subscription.customer as string,
      stripe_subscription_id: subscription.id,
      status: subscription.status,
      price_id: subscription.items.data[0]?.price.id,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null,
      trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
      cancel_at_period_end: subscription.cancel_at_period_end,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }]);

  if (error) {
    console.error('Error creating subscription record:', error);
  }

  // Update organization with subscription status
  await supabaseAdmin
    .from('organizations')
    .update({
      subscription_status: subscription.status,
      subscription_id: subscription.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', organization_id);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const { error } = await supabaseAdmin
    .from('subscriptions')
    .update({
      status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null,
      trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
      cancel_at_period_end: subscription.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);

  if (error) {
    console.error('Error updating subscription:', error);
  }

  // Update organization subscription status
  const { organization_id } = subscription.metadata;
  if (organization_id) {
    await supabaseAdmin
      .from('organizations')
      .update({
        subscription_status: subscription.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', organization_id);
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const { error } = await supabaseAdmin
    .from('subscriptions')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);

  if (error) {
    console.error('Error cancelling subscription:', error);
  }

  // Update organization subscription status
  const { organization_id } = subscription.metadata;
  if (organization_id) {
    await supabaseAdmin
      .from('organizations')
      .update({
        subscription_status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', organization_id);
  }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  // Log successful payment
  console.log('Payment succeeded for invoice:', invoice.id);
  
  // You could send success emails, update analytics, etc.
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  // Log failed payment
  console.error('Payment failed for invoice:', invoice.id);
  
  // You could send dunning emails, update subscription status, etc.
}