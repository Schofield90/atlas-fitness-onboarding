import { NextRequest } from 'next/server'
import { handleApiRoute, supabaseAdmin } from '@/lib/api/middleware'

export async function GET(request: NextRequest) {
  return handleApiRoute(request, async (req) => {
    const { user } = req
    
    // Get organization details
    const { data: organization, error } = await supabaseAdmin
      .from('organizations')
      .select(`
        *,
        users!inner (
          id,
          name,
          email,
          role,
          created_at
        )
      `)
      .eq('id', user.organization_id)
      .single()

    if (error) {
      throw new Error('Failed to fetch organization details')
    }

    // Get organization statistics
    const [leadsResult, clientsResult, campaignsResult] = await Promise.all([
      supabaseAdmin
        .from('leads')
        .select('id, status, created_at')
        .eq('organization_id', user.organization_id),
      
      supabaseAdmin
        .from('clients')
        .select('id, membership_status, total_revenue, created_at')
        .eq('organization_id', user.organization_id),
      
      supabaseAdmin
        .from('campaigns')
        .select('id, status, spend, conversions')
        .eq('organization_id', user.organization_id)
    ])

    const leads = leadsResult.data || []
    const clients = clientsResult.data || []
    const campaigns = campaignsResult.data || []

    // Calculate metrics
    const metrics = {
      total_users: organization.users?.length || 0,
      total_leads: leads.length,
      active_clients: clients.filter(c => c.membership_status === 'active').length,
      total_revenue: clients.reduce((sum, c) => sum + (c.total_revenue || 0), 0),
      conversion_rate: leads.length > 0 
        ? Math.round((leads.filter(l => l.status === 'converted').length / leads.length) * 100)
        : 0,
      total_campaigns: campaigns.length,
      active_campaigns: campaigns.filter(c => c.status === 'active').length,
      total_ad_spend: campaigns.reduce((sum, c) => sum + (c.spend || 0), 0),
      total_conversions: campaigns.reduce((sum, c) => sum + (c.conversions || 0), 0)
    }

    return {
      ...organization,
      metrics
    }
  })
}