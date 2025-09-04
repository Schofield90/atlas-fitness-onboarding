import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import Stripe from 'stripe'

const stripeKey = process.env.STRIPE_SECRET_KEY
const stripe = stripeKey ? new Stripe(stripeKey, {
  apiVersion: '2025-07-30.basil',
}) : null

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
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()
    
    if (!userOrg) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 })
    }
    
    // Get payment settings
    const { data: settings } = await supabase
      .from('organization_payment_settings')
      .select('*')
      .eq('organization_id', userOrg.organization_id)
      .single()
    
    let accountData = null
    
    if (settings?.stripe_account_id) {
      try {
        // Check if Stripe is configured
        if (!stripe) {
          throw new Error('Stripe not configured')
        }
        
        // Fetch account details from Stripe
        const account = await stripe.accounts.retrieve(settings.stripe_account_id)
        
        accountData = {
          stripe_account_id: account.id,
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          requirements: account.requirements,
          created: account.created,
          business_type: account.business_type,
          country: account.country,
          default_currency: account.default_currency,
        }
        
        // Update local database with latest status
        await supabase
          .from('organization_payment_settings')
          .update({
            stripe_charges_enabled: account.charges_enabled,
            stripe_payouts_enabled: account.payouts_enabled,
          })
          .eq('organization_id', userOrg.organization_id)
      } catch (error) {
        console.error('Error fetching Stripe account:', error)
        // Account might be deleted or invalid
        accountData = {
          stripe_account_id: settings.stripe_account_id,
          charges_enabled: false,
          payouts_enabled: false,
          error: 'Account not found'
        }
      }
    }
    
    return NextResponse.json({
      account: accountData,
      settings: {
        platform_commission_rate: settings?.platform_commission_rate || 0.03,
        payment_methods_enabled: settings?.payment_methods_enabled || { card: true, direct_debit: false },
        gocardless_merchant_id: settings?.gocardless_merchant_id,
      },
      stripeConfigured: isStripeConfigured
    })
  } catch (error) {
    console.error('Error fetching account status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch account status' },
      { status: 500 }
    )
  }
}