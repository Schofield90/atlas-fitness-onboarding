import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { createAdminClient } from '@/app/lib/supabase/admin'

export async function GET(request: NextRequest) {
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

    // Use admin client to fetch organizations (bypasses RLS)
    const supabaseAdmin = createAdminClient()

    // Fetch all organizations
    const { data: organizations, error: orgsError } = await supabaseAdmin
      .from('organizations')
      .select('id, name, slug, created_at')
      .order('created_at', { ascending: false })

    if (orgsError) {
      console.error('[Admin Organizations API] Error fetching organizations:', orgsError)
      return NextResponse.json({ error: 'Failed to fetch organizations' }, { status: 500 })
    }

    // For each organization, calculate metrics
    const organizationsWithMetrics = await Promise.all(
      (organizations || []).map(async (org) => {
        // Count active users in this organization
        const { count: activeUsers } = await supabaseAdmin
          .from('user_organizations')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', org.id)

        // Get subscription info (if exists)
        // For now, we'll just return placeholder data since there's no subscription table yet

        return {
          id: org.id,
          name: org.name,
          slug: org.slug || '',
          subscription_status: 'active', // TODO: Get from actual subscription data
          subscription_plan: 'Pro', // TODO: Get from actual subscription data
          created_at: org.created_at,
          active_users: activeUsers || 0,
          mrr: 0, // TODO: Calculate from subscription data
          last_activity: org.created_at, // TODO: Get from activity logs
        }
      })
    )

    return NextResponse.json({
      success: true,
      organizations: organizationsWithMetrics,
    })
  } catch (error) {
    console.error('[Admin Organizations API] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
