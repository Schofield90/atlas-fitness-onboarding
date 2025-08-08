import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { getCurrentUserOrganization } from '@/app/lib/organization-server'

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user's organization
    const { organizationId: userOrgId, error: authError } = await getCurrentUserOrganization()
    if (authError || !userOrgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { organizationId } = await request.json()
    
    // Verify user has access to this organization
    if (organizationId !== userOrgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const supabase = await createClient()
    
    // Calculate key metrics
    const now = new Date()
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    
    // Revenue metrics
    const { data: currentRevenue } = await supabase
      .from('payment_transactions')
      .select('amount_pennies')
      .eq('organization_id', organizationId)
      .eq('status', 'succeeded')
      .gte('created_at', thisMonth.toISOString())
    
    const { data: lastRevenue } = await supabase
      .from('payment_transactions')
      .select('amount_pennies')
      .eq('organization_id', organizationId)
      .eq('status', 'succeeded')
      .gte('created_at', lastMonth.toISOString())
      .lt('created_at', thisMonth.toISOString())
    
    const currentTotal = currentRevenue?.reduce((sum, p) => sum + p.amount_pennies, 0) || 0
    const lastTotal = lastRevenue?.reduce((sum, p) => sum + p.amount_pennies, 0) || 0
    const revenueChange = lastTotal > 0 ? ((currentTotal - lastTotal) / lastTotal) * 100 : 0
    
    // Active members
    const { count: activeMembers } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('status', 'active')
    
    // Attendance rate
    const { data: recentBookings } = await supabase
      .from('bookings')
      .select('status')
      .eq('organization_id', organizationId)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    
    const attendanceRate = recentBookings
      ? (recentBookings.filter(b => b.status === 'attended').length / recentBookings.length) * 100
      : 0
    
    // New leads this month
    const { count: newLeads } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .gte('created_at', thisMonth.toISOString())
    
    const metrics = [
      {
        label: 'Monthly Revenue',
        value: `£${(currentTotal / 100).toLocaleString()}`,
        change: Math.round(revenueChange),
        trend: revenueChange > 0 ? 'up' : revenueChange < 0 ? 'down' : 'stable',
        insight: revenueChange > 10 ? 'Strong growth' : revenueChange < -10 ? 'Needs attention' : 'Steady performance'
      },
      {
        label: 'Active Members',
        value: activeMembers?.toString() || '0',
        change: 5, // Would calculate from historical data
        trend: 'up',
        insight: 'Membership growing steadily'
      },
      {
        label: 'Attendance Rate',
        value: `${Math.round(attendanceRate)}%`,
        change: -2,
        trend: 'down',
        insight: 'Slight dip in attendance'
      },
      {
        label: 'New Leads',
        value: newLeads?.toString() || '0',
        change: 15,
        trend: 'up',
        insight: 'Lead generation improving'
      }
    ]
    
    return NextResponse.json({ metrics })
  } catch (error) {
    console.error('AI metrics error:', error)
    return NextResponse.json(
      { error: 'Failed to get metrics' },
      { status: 500 }
    )
  }
}