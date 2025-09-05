import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/app/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia',
});

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing session ID' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'customer'],
    });

    if (!session.subscription) {
      return NextResponse.json(
        { error: 'No subscription found' },
        { status: 404 }
      );
    }

    const subscription = session.subscription as Stripe.Subscription;
    
    // Get plan details from database
    const planId = session.metadata?.planId;
    const { data: plan } = await supabase
      .from('billing_plans')
      .select('name')
      .eq('id', planId)
      .single();

    // Format trial end date
    const trialEnd = subscription.trial_end 
      ? new Date(subscription.trial_end * 1000).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        })
      : null;

    return NextResponse.json({
      success: true,
      planName: plan?.name || 'Unknown Plan',
      billingPeriod: session.metadata?.billingPeriod === 'yearly' ? 'Annual' : 'Monthly',
      trialEnd: trialEnd,
      subscriptionId: subscription.id,
      customerId: session.customer,
    });
  } catch (error) {
    console.error('Error verifying session:', error);
    return NextResponse.json(
      { error: 'Failed to verify session' },
      { status: 500 }
    );
  }
}