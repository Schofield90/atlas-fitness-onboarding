import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import Stripe from 'stripe'

const stripeKey = process.env.STRIPE_SECRET_KEY
const stripe = stripeKey ? new Stripe(stripeKey, {
  apiVersion: '2025-07-30.basil',
}) : null

// Check if Stripe is properly configured
const isStripeConfigured = !!stripeKey

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
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
    
    if (!userOrg) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 })
    }
    
    // Get organization details with subscription (left join to handle missing subscriptions)
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select(`
        *,
        saas_subscriptions (
          *,
          saas_plans (*)
        ),
        organization_settings (*),
        organization_payment_settings (*)
      `)
      .eq('id', userOrg.organization_id)
      .single()
    
    if (orgError || !organization) {
      // Return minimal organization data if not found
      const { data: basicOrg } = await supabase
        .from('organizations')
        .select('id, name, created_at')
        .eq('id', userOrg.organization_id)
        .single()
      
      if (!basicOrg) {
        return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
      }
      
      // Create a minimal organization response
      return NextResponse.json({
        organization: {
          ...basicOrg,
          saas_subscriptions: [],
          organization_settings: [],
          organization_payment_settings: []
        },
        usageSummary: {
          sms_sent: 0,
          emails_sent: 0,
          whatsapp_sent: 0,
          bookings_created: 0,
          active_customers: 0,
          active_staff: 1
        },
        availablePlans: [],
        canManageBilling: userOrg.role === 'owner' || userOrg.role === 'admin',
        stripeConfigured: isStripeConfigured
      })
    }
    
    // Get current month's usage metrics
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)
    
    const { data: usageMetrics } = await supabase
      .from('organization_usage_metrics')
      .select('*')
      .eq('organization_id', userOrg.organization_id)
      .gte('metric_date', startOfMonth.toISOString())
      .order('metric_date', { ascending: false })
    
    // Calculate usage summary
    const usageSummary = usageMetrics?.reduce((acc, metric) => {
      return {
        sms_sent: (acc.sms_sent || 0) + metric.sms_sent,
        emails_sent: (acc.emails_sent || 0) + metric.emails_sent,
        whatsapp_sent: (acc.whatsapp_sent || 0) + metric.whatsapp_sent,
        bookings_created: (acc.bookings_created || 0) + metric.bookings_created,
        active_customers: Math.max(acc.active_customers || 0, metric.active_customers),
        active_staff: Math.max(acc.active_staff || 0, metric.active_staff),
      }
    }, {}) || {}
    
    // Get available plans
    const { data: availablePlans } = await supabase
      .from('saas_plans')
      .select('*')
      .eq('is_active', true)
      .order('price_monthly', { ascending: true })
    
    return NextResponse.json({
      organization,
      usageSummary: usageSummary || {
        sms_sent: 0,
        emails_sent: 0,
        whatsapp_sent: 0,
        bookings_created: 0,
        active_customers: 0,
        active_staff: 1
      },
      availablePlans: availablePlans || [],
      canManageBilling: userOrg.role === 'owner' || userOrg.role === 'admin',
      stripeConfigured: isStripeConfigured
    })
  } catch (error) {
    console.error('Error fetching billing data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch billing data' },
      { status: 500 }
    )
  }
}

// Create or update subscription
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { planId, paymentMethodId } = body
    
    // Verify user permissions
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
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
    
    // Get or create Stripe customer
    const { data: organization } = await supabase
      .from('organizations')
      .select('*, saas_subscriptions (*)')
      .eq('id', userOrg.organization_id)
      .single()
    
    let stripeCustomerId = organization.saas_subscriptions?.[0]?.stripe_customer_id
    
    if (!stripeCustomerId) {
      // Check if Stripe is configured
      if (!stripe) {
        return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
      }
      
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          organization_id: userOrg.organization_id,
          user_id: user.id
        }
      })
      stripeCustomerId = customer.id
    }
    
    // Attach payment method if provided
    if (paymentMethodId) {
      if (!stripe) {
        return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
      }
      
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: stripeCustomerId,
      })
      
      // Set as default payment method
      await stripe.customers.update(stripeCustomerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      })
    }
    
    // Create or update subscription
    let stripeSubscription
    const existingSubscriptionId = organization.saas_subscriptions?.[0]?.stripe_subscription_id
    
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
    }
    
    if (existingSubscriptionId) {
      // Update existing subscription
      stripeSubscription = await stripe.subscriptions.update(existingSubscriptionId, {
        items: [{
          id: (await stripe.subscriptions.retrieve(existingSubscriptionId)).items.data[0].id,
          price: plan.stripe_price_id,
        }],
        proration_behavior: 'always_invoice',
      })
    } else {
      // Create new subscription with 14-day trial
      stripeSubscription = await stripe.subscriptions.create({
        customer: stripeCustomerId,
        items: [{ price: plan.stripe_price_id }],
        trial_period_days: 14,
        metadata: {
          organization_id: userOrg.organization_id,
          plan_id: planId
        }
      })
    }
    
    // Update database
    const subscriptionData = {
      organization_id: userOrg.organization_id,
      plan_id: planId,
      status: stripeSubscription.status,
      stripe_subscription_id: stripeSubscription.id,
      stripe_customer_id: stripeCustomerId,
      current_period_start: new Date((stripeSubscription as any).current_period_start * 1000).toISOString(),
      current_period_end: new Date((stripeSubscription as any).current_period_end * 1000).toISOString(),
      cancel_at_period_end: stripeSubscription.cancel_at_period_end,
      trial_end: stripeSubscription.trial_end ? new Date(stripeSubscription.trial_end * 1000).toISOString() : null,
    }
    
    await supabase
      .from('saas_subscriptions')
      .upsert(subscriptionData, {
        onConflict: 'organization_id'
      })
    
    return NextResponse.json({
      subscription: stripeSubscription,
      message: 'Subscription updated successfully'
    })
  } catch (error) {
    console.error('Error creating/updating subscription:', error)
    return NextResponse.json(
      { error: 'Failed to update subscription' },
      { status: 500 }
    )
  }
}

// Cancel subscription
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Verify user permissions
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { data: userOrg } = await supabase
      .from('user_organizations')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()
    
    if (!userOrg || userOrg.role !== 'owner') {
      return NextResponse.json({ error: 'Only owners can cancel subscriptions' }, { status: 403 })
    }
    
    // Get subscription
    const { data: subscription } = await supabase
      .from('saas_subscriptions')
      .select('stripe_subscription_id')
      .eq('organization_id', userOrg.organization_id)
      .single()
    
    if (!subscription?.stripe_subscription_id) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 404 })
    }
    
    // Check if Stripe is configured
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
    }
    
    // Cancel at period end
    const canceledSubscription = await stripe.subscriptions.update(
      subscription.stripe_subscription_id,
      { cancel_at_period_end: true }
    )
    
    // Update database
    await supabase
      .from('saas_subscriptions')
      .update({
        cancel_at_period_end: true,
        canceled_at: new Date().toISOString()
      })
      .eq('organization_id', userOrg.organization_id)
    
    return NextResponse.json({
      message: 'Subscription will be canceled at the end of the billing period',
      cancel_at: canceledSubscription.cancel_at
    })
  } catch (error) {
    console.error('Error canceling subscription:', error)
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    )
  }
}