import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { createAdminClient } from '@/app/lib/supabase/admin'

const stripeKey = process.env.STRIPE_SECRET_KEY
const stripe = stripeKey ? new Stripe(stripeKey, {
  apiVersion: '2025-06-30.basil',
}) : null

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const headersList = await headers()
    const signature = headersList.get('stripe-signature')
    
    if (!signature) {
      return NextResponse.json({ error: 'No signature' }, { status: 401 })
    }
    
    // Check if Stripe is configured
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
    }
    
    // Verify webhook signature
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }
    
    const adminSupabase = createAdminClient()
    
    // Log the event
    const eventObject = event.data.object as any
    await adminSupabase.from('saas_billing_events').insert({
      organization_id: eventObject.metadata?.organization_id || null,
      event_type: event.type,
      event_data: eventObject,
      stripe_event_id: event.id,
      processed: false
    })
    
    // Handle the event
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const organizationId = subscription.metadata.organization_id
        const planId = subscription.metadata.plan_id
        
        if (!organizationId || !planId) {
          console.error('Missing organization_id or plan_id in subscription metadata')
          break
        }
        
        // Update subscription in database
        await adminSupabase
          .from('saas_subscriptions')
          .upsert({
            organization_id: organizationId,
            plan_id: planId,
            status: subscription.status,
            stripe_subscription_id: subscription.id,
            stripe_customer_id: subscription.customer as string,
            current_period_start: new Date((subscription as any).current_period_start * 1000).toISOString(),
            current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
            trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
          }, {
            onConflict: 'organization_id'
          })
        
        break
      }
      
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const organizationId = subscription.metadata.organization_id
        
        if (!organizationId) {
          console.error('Missing organization_id in subscription metadata')
          break
        }
        
        // Update subscription status
        await adminSupabase
          .from('saas_subscriptions')
          .update({ status: 'canceled' })
          .eq('stripe_subscription_id', subscription.id)
        
        break
      }
      
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        const subscriptionId = (invoice as any).subscription as string
        
        // Get organization from subscription
        const { data: subscription } = await adminSupabase
          .from('saas_subscriptions')
          .select('organization_id')
          .eq('stripe_subscription_id', subscriptionId)
          .single()
        
        if (!subscription) {
          console.error('Subscription not found for invoice:', subscriptionId)
          break
        }
        
        // Save invoice
        await adminSupabase
          .from('organization_invoices')
          .insert({
            organization_id: subscription.organization_id,
            stripe_invoice_id: invoice.id,
            invoice_number: invoice.number || `INV-${invoice.id}`,
            status: invoice.status || 'paid',
            amount_due: invoice.amount_due,
            amount_paid: invoice.amount_paid,
            currency: invoice.currency,
            paid_at: (invoice as any).status_transitions?.paid_at ? new Date((invoice as any).status_transitions.paid_at * 1000).toISOString() : null,
            invoice_pdf_url: invoice.invoice_pdf
          })
        
        // Reset monthly usage metrics
        const currentDate = new Date()
        if (currentDate.getDate() === 1) {
          // It's the first of the month, metrics will auto-reset with new row
          console.log('Monthly billing cycle - usage metrics will reset')
        }
        
        break
      }
      
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const subscriptionId = (invoice as any).subscription as string
        
        // Update subscription status
        await adminSupabase
          .from('saas_subscriptions')
          .update({ status: 'past_due' })
          .eq('stripe_subscription_id', subscriptionId)
        
        // TODO: Send payment failed notification email
        
        break
      }
      
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        
        if (session.mode === 'subscription') {
          // Subscription checkout completed
          console.log('Subscription checkout completed:', session.id)
          // The subscription.created event will handle the actual subscription setup
        }
        
        break
      }
      
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        
        // Track revenue if this is a gym payment (not subscription)
        if (paymentIntent.metadata.type === 'gym_payment') {
          const organizationId = paymentIntent.metadata.organization_id
          const amount = paymentIntent.amount
          
          // Track revenue in usage metrics
          await adminSupabase.rpc('track_organization_usage', {
            p_organization_id: organizationId,
            p_metric_type: 'revenue_processed',
            p_increment: amount
          })
          
          // Track transaction count
          await adminSupabase.rpc('track_organization_usage', {
            p_organization_id: organizationId,
            p_metric_type: 'transactions_processed',
            p_increment: 1
          })
          
          // Calculate and save platform commission
          const { data: paymentSettings } = await adminSupabase
            .from('organization_payment_settings')
            .select('platform_commission_rate')
            .eq('organization_id', organizationId)
            .single()
          
          const commissionRate = paymentSettings?.platform_commission_rate || 0.03
          const commissionAmount = Math.floor(amount * commissionRate)
          
          await adminSupabase
            .from('platform_commissions')
            .insert({
              organization_id: organizationId,
              transaction_id: paymentIntent.id,
              transaction_amount: amount,
              commission_rate: commissionRate,
              commission_amount: commissionAmount,
              status: 'pending'
            })
        }
        
        break
      }
      
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }
    
    // Mark event as processed
    await adminSupabase
      .from('saas_billing_events')
      .update({ processed: true })
      .eq('stripe_event_id', event.id)
    
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}