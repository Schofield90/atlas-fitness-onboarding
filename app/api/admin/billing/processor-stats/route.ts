import { NextResponse } from 'next/server'
import { createAdminClient } from '@/app/lib/supabase/admin'
import { requireAdminAccess } from '@/app/lib/admin/impersonation'

export async function GET() {
  try {
    const { isAdmin } = await requireAdminAccess()
    
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = createAdminClient()
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    // Get Stripe stats
    const { data: stripeAccounts } = await supabase
      .from('connected_accounts')
      .select('*')
      .eq('is_active', true)
      .not('stripe_account_id', 'is', null)

    const { data: stripeCharges } = await supabase
      .from('gym_charges')
      .select('amount_cents, platform_fee_cents, status')
      .eq('processor', 'stripe')
      .gte('created_at', thirtyDaysAgo)

    const stripeStats = {
      connected: stripeAccounts?.length || 0,
      volume30d: stripeCharges?.reduce((sum, c) => 
        c.status === 'succeeded' ? sum + (c.amount_cents / 100) : sum, 0
      ) || 0,
      fees30d: stripeCharges?.reduce((sum, c) => 
        c.status === 'succeeded' ? sum + (c.platform_fee_cents / 100) : sum, 0
      ) || 0,
      successRate: stripeCharges?.length 
        ? Math.round((stripeCharges.filter(c => c.status === 'succeeded').length / stripeCharges.length) * 100)
        : 0
    }

    // Get GoCardless stats
    const { data: gcAccounts } = await supabase
      .from('connected_accounts')
      .select('*')
      .eq('is_active', true)
      .not('gc_organization_id', 'is', null)

    const { data: gcCharges } = await supabase
      .from('gym_charges')
      .select('amount_cents, platform_fee_cents, status')
      .eq('processor', 'gocardless')
      .gte('created_at', thirtyDaysAgo)

    const gocardlessStats = {
      connected: gcAccounts?.length || 0,
      volume30d: gcCharges?.reduce((sum, c) => 
        c.status === 'succeeded' ? sum + (c.amount_cents / 100) : sum, 0
      ) || 0,
      fees30d: gcCharges?.reduce((sum, c) => 
        c.status === 'succeeded' ? sum + (c.platform_fee_cents / 100) : sum, 0
      ) || 0,
      successRate: gcCharges?.length 
        ? Math.round((gcCharges.filter(c => c.status === 'succeeded').length / gcCharges.length) * 100)
        : 0
    }

    return NextResponse.json({
      stripe: stripeStats,
      gocardless: gocardlessStats
    })
  } catch (error) {
    console.error('Failed to fetch processor stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch processor stats' },
      { status: 500 }
    )
  }
}