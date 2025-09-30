import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found', userError }, { status: 404 })
    }

    // Get ALL membership plans (will be filtered by RLS)
    const { data: allPlans, error: allPlansError } = await supabase
      .from('membership_plans')
      .select('*')
      .order('created_at', { ascending: false })

    // Get membership plans for this organization only
    const { data: orgPlans, error: orgPlansError } = await supabase
      .from('membership_plans')
      .select('*')
      .eq('organization_id', userData.organization_id)
      .order('created_at', { ascending: false })

    // Test delete with detailed logging
    const testPlanId = orgPlans && orgPlans.length > 0 ? orgPlans[0].id : null
    let deleteTest = null
    if (testPlanId) {
      // Check if clients are using this plan
      const { data: clientsUsingPlan, error: clientsError } = await supabase
        .from('clients')
        .select('id')
        .eq('membership_plan_id', testPlanId)
        .limit(1)

      deleteTest = {
        testPlanId,
        clientsUsingPlan: clientsUsingPlan || [],
        clientsError: clientsError?.message
      }
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        organization_id: userData.organization_id,
        role: userData.role
      },
      allPlans: allPlans || [],
      allPlansError: allPlansError?.message,
      orgPlans: orgPlans || [],
      orgPlansError: orgPlansError?.message,
      totalAll: allPlans?.length || 0,
      totalOrg: orgPlans?.length || 0,
      deleteTest
    })
  } catch (error) {
    console.error('Debug membership plans error:', error)
    return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 })
  }
}