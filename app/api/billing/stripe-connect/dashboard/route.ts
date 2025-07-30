import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
})

export async function POST(request: NextRequest) {
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
      .select('stripe_account_id')
      .eq('organization_id', userOrg.organization_id)
      .single()
    
    if (!settings?.stripe_account_id) {
      return NextResponse.json({ error: 'No Stripe account connected' }, { status: 404 })
    }
    
    // Create login link for Express dashboard
    const loginLink = await stripe.accounts.createLoginLink(settings.stripe_account_id)
    
    return NextResponse.json({ url: loginLink.url })
  } catch (error) {
    console.error('Error creating dashboard link:', error)
    return NextResponse.json(
      { error: 'Failed to create dashboard link' },
      { status: 500 }
    )
  }
}