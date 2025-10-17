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
    
    // Fetch subscription
    const { data: subscription } = await supabase
      .from('billing_subscriptions')
      .select('*')
      .eq('organization_id', params.id)
      .eq('is_primary', true)
      .single()

    // Fetch customer
    const { data: customer } = await supabase
      .from('billing_customers')
      .select('*')
      .eq('organization_id', params.id)
      .single()

    // TODO: Fetch invoices from Stripe API
    const invoices: any[] = []

    return NextResponse.json({
      subscription,
      customer,
      invoices
    })
  } catch (error) {
    console.error('Failed to fetch billing data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch billing data' },
      { status: 500 }
    )
  }
}