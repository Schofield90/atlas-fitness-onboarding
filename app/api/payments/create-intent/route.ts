import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { createAdminClient } from '@/app/lib/supabase/admin'
import Stripe from 'stripe'

const stripeKey = process.env.STRIPE_SECRET_KEY
const stripe = stripeKey ? new Stripe(stripeKey, {
  apiVersion: '2025-06-30.basil',
}) : null

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const adminSupabase = createAdminClient()
    const body = await request.json()
    
    const {
      amount, // in pence
      customerId,
      description,
      membershipId,
      type = 'membership_payment'
    } = body
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get customer's organization
    const { data: customer } = await supabase
      .from('contacts')
      .select('organization_id, email, stripe_customer_id')
      .eq('id', customerId)
      .single()
    
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }
    
    // Get organization's payment settings
    const { data: paymentSettings } = await adminSupabase
      .from('organization_payment_settings')
      .select('*')
      .eq('organization_id', customer.organization_id)
      .single()
    
    if (!paymentSettings?.stripe_account_id) {
      return NextResponse.json(
        { error: 'Organization has not connected Stripe account' },
        { status: 400 }
      )
    }
    
    if (!paymentSettings.stripe_charges_enabled) {
      return NextResponse.json(
        { error: 'Organization cannot accept payments yet. Please complete Stripe setup.' },
        { status: 400 }
      )
    }
    
    // Calculate platform fee
    const platformFeeAmount = Math.round(amount * paymentSettings.platform_commission_rate)
    
    // Create or retrieve Stripe customer on connected account
    let stripeCustomerId = customer.stripe_customer_id
    
    if (!stripeCustomerId) {
      // Create customer on connected account
      const stripeCustomer = await stripe.customers.create({
        email: customer.email,
        metadata: {
          contact_id: customerId,
          organization_id: customer.organization_id
        }
      }, {
        stripeAccount: paymentSettings.stripe_account_id
      })
      
      stripeCustomerId = stripeCustomer.id
      
      // Save customer ID
      await adminSupabase
        .from('contacts')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', customerId)
    }
    
    // Create payment intent on connected account
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'gbp',
      customer: stripeCustomerId,
      description,
      application_fee_amount: platformFeeAmount,
      metadata: {
        type,
        contact_id: customerId,
        organization_id: customer.organization_id,
        membership_id: membershipId || '',
        user_id: user.id
      },
      automatic_payment_methods: {
        enabled: true,
      },
    }, {
      stripeAccount: paymentSettings.stripe_account_id
    })
    
    // Log the payment attempt
    await adminSupabase
      .from('payment_transactions')
      .insert({
        organization_id: customer.organization_id,
        contact_id: customerId,
        membership_id: membershipId,
        stripe_payment_intent_id: paymentIntent.id,
        amount,
        currency: 'GBP',
        status: 'pending',
        type,
        platform_fee: platformFeeAmount,
        metadata: {
          description,
          created_by: user.id
        }
      })
    
    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount,
      platformFee: platformFeeAmount
    })
  } catch (error) {
    console.error('Error creating payment intent:', error)
    return NextResponse.json(
      { error: 'Failed to create payment' },
      { status: 500 }
    )
  }
}