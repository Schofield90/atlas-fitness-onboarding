import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripeBillingService } from '@/app/lib/services/stripe-billing.service';

const stripeKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
let stripe: Stripe | null = null;

if (stripeKey) {
  stripe = new Stripe(stripeKey, {
    apiVersion: '2024-12-18.acacia',
  });
}

export async function POST(request: NextRequest) {
  if (!stripe) {
    console.error('Stripe is not configured. Please set STRIPE_SECRET_KEY.');
    return NextResponse.json(
      { error: 'Payment webhook not configured' },
      { status: 503 }
    );
  }

  try {
    const body = await request.text();
    const signature = headers().get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe signature' },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    // Handle the event
    await stripeBillingService.handleWebhook(event);

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}