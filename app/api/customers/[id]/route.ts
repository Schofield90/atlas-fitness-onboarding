import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { headers } from 'next/headers'
import { requireAuth, createOrgScopedClient } from '@/lib/auth-middleware'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Authentication check
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  
  // Create organization-scoped Supabase client
  const supabase = createOrgScopedClient(auth.organizationId)
  
  try {
    const { id: customerId } = await params
    
    // Get customer basic info
    const { data: customer, error } = await supabaseAdmin
      .from('leads')
      .select('*')
      .eq('id', customerId)
      .single()

    if (error) throw error

    return NextResponse.json({ customer })
  } catch (error) {
    console.error('Error fetching customer:', error)
    return NextResponse.json(
      { error: 'Failed to fetch customer' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Authentication check
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  
  // Create organization-scoped Supabase client
  const supabase = createOrgScopedClient(auth.organizationId)
  
  try {
    const { id: customerId } = await params
    const updates = await request.json()

    const { data, error } = await supabaseAdmin
      .from('leads')
      .update(updates)
      .eq('id', customerId)
      .select()
      .single()

    if (error) throw error

    // Log activity
    await supabaseAdmin.rpc('log_customer_activity', {
      p_customer_id: customerId,
      p_activity_type: 'profile_updated',
      p_activity_data: { updated_fields: Object.keys(updates) }
    })

    return NextResponse.json({ customer: data })
  } catch (error) {
    console.error('Error updating customer:', error)
    return NextResponse.json(
      { error: 'Failed to update customer' },
      { status: 500 }
    )
  }
}