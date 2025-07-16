import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabase';

// Initialize Stripe only if key is available
let stripe: Stripe | null = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-11-20.acacia',
  });
}

export async function POST(request: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
    }

    const { user_id, organization_id, price_id } = await request.json();

    if (!user_id || !organization_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get user profile
    const { data: userProfile, error: userError } = await supabase
      .from('user_profiles')
      .select('email, full_name')
      .eq('id', user_id)
      .single();

    if (userError || !userProfile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Create or get Stripe customer
    let customer;
    try {
      const customers = await stripe.customers.list({
        email: userProfile.email,
        limit: 1,
      });

      if (customers.data.length > 0) {
        customer = customers.data[0];
      } else {
        customer = await stripe.customers.create({
          email: userProfile.email,
          name: userProfile.full_name,
          metadata: {
            user_id,
            organization_id,
          },
        });
      }
    } catch (error) {
      console.error('Stripe customer error:', error);
      return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [
        {
          price: price_id || 'price_1234567890', // Default price ID - replace with actual Stripe price ID
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/billing?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/billing`,
      metadata: {
        user_id,
        organization_id,
      },
      subscription_data: {
        trial_period_days: 14,
        metadata: {
          user_id,
          organization_id,
        },
      },
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Checkout session error:', error);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}