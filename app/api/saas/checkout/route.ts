import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { planId } = body
    
    // Get current user and organization
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get user's organization
    const { data: userOrg } = await supabase
      .from('user_organizations')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()
    
    if (!userOrg || !['owner', 'admin'].includes(userOrg.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }
    
    // Get plan details
    const { data: plan } = await supabase
      .from('saas_plans')
      .select('*')
      .eq('id', planId)
      .single()
    
    if (!plan) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }
    
    // Get organization details
    const { data: organization } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', userOrg.organization_id)
      .single()
    
    // Create Stripe price if it doesn't exist
    let stripePriceId = plan.stripe_price_id
    
    if (!stripePriceId) {
      // Create product first
      const product = await stripe.products.create({
        name: `${plan.name} Plan`,
        description: `Atlas Fitness ${plan.name} subscription plan`,
        metadata: {
          plan_id: plan.id
        }
      })
      
      // Create price
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: plan.price_monthly,
        currency: 'gbp',
        recurring: {
          interval: 'month'
        },
        metadata: {
          plan_id: plan.id
        }
      })
      
      stripePriceId = price.id
      
      // Save price ID to database
      await supabase
        .from('saas_plans')
        .update({ stripe_price_id: stripePriceId })
        .eq('id', plan.id)
    }
    
    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],
      customer_email: user.email,
      client_reference_id: userOrg.organization_id,
      metadata: {
        organization_id: userOrg.organization_id,
        plan_id: plan.id,
        user_id: user.id
      },
      subscription_data: {
        trial_period_days: 14,
        metadata: {
          organization_id: userOrg.organization_id,
          plan_id: plan.id
        }
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?canceled=true`,
      allow_promotion_codes: true,
    })
    
    return NextResponse.json({ sessionId: session.id })
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}