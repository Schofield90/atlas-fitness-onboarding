import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const body = await request.json()
    const { customerId } = body || {}

    if (!customerId) {
      return NextResponse.json({ error: 'Missing customerId' }, { status: 400 })
    }

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch organization to scope update (RLS also enforces this)
    const { data: userOrg, error: orgError } = await supabase
      .from('user_organizations')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    if (orgError || !userOrg) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Mark all inbound messages for this contact as read
    const { count, error: updateError } = await supabase
      .from('messages')
      .update({ read_at: new Date().toISOString(), status: 'read' })
      .eq('organization_id', userOrg.organization_id)
      .eq('lead_id', customerId)
      .eq('direction', 'inbound')
      .is('read_at', null)
      .select('*', { count: 'exact', head: true })

    if (updateError) {
      console.error('Failed to mark messages as read:', updateError)
      return NextResponse.json({ error: 'Failed to update messages' }, { status: 500 })
    }

    return NextResponse.json({ updated: count || 0 })
  } catch (error) {
    console.error('Mark read API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

