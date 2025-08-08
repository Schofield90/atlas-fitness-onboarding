import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@12.18.0?target=deno'
import { corsHeaders } from '../_shared/cors.ts'

interface CheckoutRequest {
  type: 'membership' | 'class_pack' | 'drop_in'
  product_id: string
  success_url: string
  cancel_url: string
}

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    })

    // Get auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    // Get user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const orgId = req.headers.get('X-Organization-Id')
    if (!orgId) {
      return new Response(
        JSON.stringify({ error: 'Organization ID required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const checkoutData: CheckoutRequest = await req.json()

    // Get client
    const { data: client } = await supabaseClient
      .from('clients')
      .select('*')
      .eq('user_id', user.id)
      .eq('organization_id', orgId)
      .single()

    if (!client) {
      return new Response(
        JSON.stringify({ error: 'Client profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get organization's Stripe account
    const { data: org } = await supabaseClient
      .from('organizations')
      .select('stripe_account_id')
      .eq('id', orgId)
      .single()

    if (!org?.stripe_account_id) {
      return new Response(
        JSON.stringify({ error: 'Organization not connected to Stripe' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = []

    // Build line items based on type
    switch (checkoutData.type) {
      case 'membership': {
        const { data: plan } = await supabaseClient
          .from('membership_plans')
          .select('*')
          .eq('id', checkoutData.product_id)
          .eq('organization_id', orgId)
          .single()

        if (!plan) {
          return new Response(
            JSON.stringify({ error: 'Membership plan not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        lineItems = [{
          price_data: {
            currency: 'gbp',
            product_data: {
              name: plan.name,
              description: plan.description,
            },
            unit_amount: plan.price_pennies,
            recurring: plan.billing_period === 'monthly' ? {
              interval: 'month'
            } : undefined
          },
          quantity: 1
        }]
        break
      }

      case 'class_pack': {
        const { data: pack } = await supabaseClient
          .from('class_packages')
          .select('*')
          .eq('id', checkoutData.product_id)
          .eq('organization_id', orgId)
          .single()

        if (!pack) {
          return new Response(
            JSON.stringify({ error: 'Class package not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        lineItems = [{
          price_data: {
            currency: 'gbp',
            product_data: {
              name: pack.name,
              description: `${pack.credit_count} class credits, valid for ${pack.validity_days} days`,
            },
            unit_amount: pack.price_pennies
          },
          quantity: 1
        }]
        break
      }

      case 'drop_in': {
        const { data: classData } = await supabaseClient
          .from('classes')
          .select('*')
          .eq('id', checkoutData.product_id)
          .eq('organization_id', orgId)
          .single()

        if (!classData) {
          return new Response(
            JSON.stringify({ error: 'Class not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        lineItems = [{
          price_data: {
            currency: 'gbp',
            product_data: {
              name: `Drop-in: ${classData.name}`,
              description: classData.description,
            },
            unit_amount: classData.drop_in_price_pennies || 1500 // Default £15
          },
          quantity: 1
        }]
        break
      }
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'bacs_debit'],
      line_items: lineItems,
      mode: checkoutData.type === 'membership' ? 'subscription' : 'payment',
      success_url: checkoutData.success_url,
      cancel_url: checkoutData.cancel_url,
      customer_email: client.email,
      client_reference_id: client.id,
      metadata: {
        organization_id: orgId,
        client_id: client.id,
        product_type: checkoutData.type,
        product_id: checkoutData.product_id
      },
      // Use connected account
      stripe_account: org.stripe_account_id,
      // Platform fee (3%)
      application_fee_percent: 3
    })

    // Return session info for mobile SDK
    return new Response(
      JSON.stringify({
        session_id: session.id,
        publishable_key: Deno.env.get('STRIPE_PUBLISHABLE_KEY'),
        stripe_account: org.stripe_account_id,
        // For mobile SDK
        payment_intent: session.payment_intent,
        ephemeral_key: session.ephemeral_key,
        customer: session.customer
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Stripe checkout error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})