import { NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { createAdminClient } from '@/app/lib/supabase/admin'

export async function GET() {
  try {
    // Check authentication
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check email-based authorization
    const authorizedEmails = ['sam@atlas-gyms.co.uk', 'sam@gymleadhub.co.uk']
    const isAuthorized = authorizedEmails.includes(user.email?.toLowerCase() || '')

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Use admin client to fetch financial overview (bypasses RLS)
    const supabaseAdmin = createAdminClient()

    const { data: metrics, error: metricsError } = await supabaseAdmin
      .from('admin_financial_overview')
      .select('*')
      .maybeSingle()

    if (metricsError) {
      console.error('[SaaS Admin API] Error fetching financial overview:', metricsError)
      return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 })
    }

    // Get recent activity logs
    const { data: recentActivity, error: activityError } = await supabaseAdmin
      .from('admin_activity_logs')
      .select('*, admin_user:super_admin_users(user_id)')
      .order('created_at', { ascending: false })
      .limit(10)

    if (activityError) {
      console.error('[SaaS Admin API] Error fetching activity:', activityError)
    }

    return NextResponse.json({
      success: true,
      metrics: metrics || {
        active_subscriptions: 0,
        trialing_subscriptions: 0,
        at_risk_subscriptions: 0,
        total_mrr: 0,
        total_arr: 0,
        stripe_connected_accounts: 0,
        gocardless_connected_accounts: 0,
        gym_revenue_30d: 0,
        platform_fees_30d: 0,
      },
      recentActivity: recentActivity || [],
    })
  } catch (error) {
    console.error('[SaaS Admin API] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
