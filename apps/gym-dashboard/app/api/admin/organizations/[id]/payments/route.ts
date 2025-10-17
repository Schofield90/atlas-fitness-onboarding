import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/app/lib/supabase/admin'
import { requireAdminAccess } from '@/app/lib/admin/impersonation'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { isAdmin } = await requireAdminAccess()
    
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = createAdminClient()
    
    // Fetch connected accounts
    const { data: connectedAccounts } = await supabase
      .from('connected_accounts')
      .select('*')
      .eq('organization_id', params.id)
      .single()

    // Fetch recent charges
    const { data: recentCharges } = await supabase
      .from('gym_charges')
      .select('*, clients(name, email)')
      .eq('organization_id', params.id)
      .order('created_at', { ascending: false })
      .limit(20)

    // Calculate stats
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    
    const { data: stats30d } = await supabase
      .from('gym_charges')
      .select('amount_cents, platform_fee_cents, status')
      .eq('organization_id', params.id)
      .gte('created_at', thirtyDaysAgo)

    const stats = {
      revenue30d: stats30d?.reduce((sum, c) => 
        c.status === 'succeeded' ? sum + (c.amount_cents / 100) : sum, 0
      ) || 0,
      fees30d: stats30d?.reduce((sum, c) => 
        c.status === 'succeeded' ? sum + (c.platform_fee_cents / 100) : sum, 0
      ) || 0,
      totalTransactions: stats30d?.length || 0,
      successRate: stats30d?.length 
        ? Math.round((stats30d.filter(c => c.status === 'succeeded').length / stats30d.length) * 100)
        : 0
    }

    return NextResponse.json({
      connectedAccounts,
      recentCharges: recentCharges?.map(charge => ({
        ...charge,
        client_name: charge.clients?.name || charge.clients?.email
      })),
      stats
    })
  } catch (error) {
    console.error('Failed to fetch payment data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payment data' },
      { status: 500 }
    )
  }
}