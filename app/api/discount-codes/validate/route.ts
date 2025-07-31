import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { code, amount } = await request.json()

    if (!code || !amount) {
      return NextResponse.json({ 
        error: 'Code and amount are required' 
      }, { status: 400 })
    }

    const supabase = createClient()
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get user's organization
    const { data: staffData } = await supabase
      .from('organization_staff')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    if (!staffData?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 })
    }

    // Call the validate function
    const { data, error } = await supabase
      .rpc('validate_discount_code', {
        p_organization_id: staffData.organization_id,
        p_code: code,
        p_amount: amount
      })

    if (error) {
      console.error('Error validating discount code:', error)
      return NextResponse.json({ 
        error: 'Failed to validate discount code' 
      }, { status: 500 })
    }

    // The function returns an array, get the first result
    const result = data[0]

    return NextResponse.json({
      valid: result.is_valid,
      discountAmount: result.discount_amount,
      finalAmount: result.final_amount,
      discountId: result.discount_id,
      message: result.message
    })

  } catch (error: any) {
    console.error('Error:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to validate discount code' 
    }, { status: 500 })
  }
}