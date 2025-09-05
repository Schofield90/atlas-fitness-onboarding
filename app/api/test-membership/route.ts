import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { customerId, planId, organizationId } = await request.json()

    // First, check if there's already an active membership
    const { data: existingMemberships, error: checkError } = await supabase
      .from('customer_memberships')
      .select('*')
      .eq('customer_id', customerId)
      .eq('membership_plan_id', planId)
      .eq('status', 'active')

    if (checkError) {
      return NextResponse.json({
        error: 'Failed to check existing memberships',
        details: checkError
      }, { status: 500 })
    }

    if (existingMemberships && existingMemberships.length > 0) {
      return NextResponse.json({
        error: 'Customer already has an active membership with this plan',
        existingMembership: existingMemberships[0]
      }, { status: 400 })
    }

    // Try to insert the membership
    const { data, error } = await supabase
      .from('customer_memberships')
      .insert({
        organization_id: organizationId,
        customer_id: customerId,
        membership_plan_id: planId,
        status: 'active',
        start_date: new Date().toISOString().split('T')[0],
        created_by: (await supabase.auth.getUser()).data.user?.id
      })
      .select()

    if (error) {
      return NextResponse.json({
        error: 'Failed to create membership',
        details: error,
        message: error.message,
        code: error.code
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      membership: data[0]
    })

  } catch (error: any) {
    return NextResponse.json({
      error: 'Server error',
      message: error.message
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customerId')

    if (!customerId) {
      return NextResponse.json({
        error: 'Customer ID is required'
      }, { status: 400 })
    }

    // Get all memberships for this customer
    const { data, error } = await supabase
      .from('customer_memberships')
      .select(`
        *,
        membership_plan:membership_plans(*)
      `)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({
        error: 'Failed to fetch memberships',
        details: error
      }, { status: 500 })
    }

    return NextResponse.json({
      memberships: data || [],
      count: data?.length || 0
    })

  } catch (error: any) {
    return NextResponse.json({
      error: 'Server error',
      message: error.message
    }, { status: 500 })
  }
}