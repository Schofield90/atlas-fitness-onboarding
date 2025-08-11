import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { requireAuth, createErrorResponse } from '@/app/lib/api/auth-check'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // SECURITY: Get authenticated user's organization
    const user = await requireAuth()
    const supabase = await createClient()
    
    const { id: customerId } = await params
    
    // SECURITY: Get customer info filtered by organization
    const { data: customer, error } = await supabase
      .from('leads')
      .select('*')
      .eq('id', customerId)
      .eq('organization_id', user.organizationId) // SECURITY: Ensure organization ownership
      .single()

    if (error || !customer) {
      return NextResponse.json({ error: 'Customer not found or unauthorized' }, { status: 404 })
    }

    return NextResponse.json({ customer })
  } catch (error) {
    console.error('Error fetching customer:', error)
    return createErrorResponse(error)
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // SECURITY: Get authenticated user's organization
    const user = await requireAuth()
    const supabase = await createClient()
    
    const { id: customerId } = await params
    const updates = await request.json()

    // Remove fields that shouldn't be updated
    const { organization_id, created_by, id, ...cleanUpdates } = updates

    // SECURITY: Update only if customer belongs to user's organization
    const { data, error } = await supabase
      .from('leads')
      .update({
        ...cleanUpdates,
        updated_at: new Date().toISOString()
      })
      .eq('id', customerId)
      .eq('organization_id', user.organizationId) // SECURITY: Ensure organization ownership
      .select()
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Customer not found or unauthorized' }, { status: 404 })
    }

    return NextResponse.json({ customer: data })
  } catch (error) {
    console.error('Error updating customer:', error)
    return createErrorResponse(error)
  }
}