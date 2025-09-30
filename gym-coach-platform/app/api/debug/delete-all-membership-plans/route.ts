import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization and role
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Only owners and admins can delete all plans
    if (!['owner', 'admin'].includes(userData.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // First, remove all membership_plan_id references from clients
    const { error: updateClientsError } = await supabase
      .from('clients')
      .update({ membership_plan_id: null })
      .eq('organization_id', userData.organization_id)
      .not('membership_plan_id', 'is', null)

    if (updateClientsError) {
      return NextResponse.json({
        error: 'Failed to unlink clients from membership plans',
        details: updateClientsError
      }, { status: 500 })
    }

    // Get all plans for this organization
    const { data: plans, error: fetchError } = await supabase
      .from('membership_plans')
      .select('id, name')
      .eq('organization_id', userData.organization_id)

    if (fetchError) {
      return NextResponse.json({
        error: 'Failed to fetch membership plans',
        details: fetchError
      }, { status: 500 })
    }

    // Delete all membership plans for this organization
    const { error: deleteError } = await supabase
      .from('membership_plans')
      .delete()
      .eq('organization_id', userData.organization_id)

    if (deleteError) {
      return NextResponse.json({
        error: 'Failed to delete membership plans',
        details: deleteError
      }, { status: 500 })
    }

    return NextResponse.json({
      message: 'All membership plans deleted successfully',
      deleted_plans: plans || [],
      count: plans?.length || 0
    })
  } catch (error) {
    console.error('Delete all membership plans error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: String(error)
    }, { status: 500 })
  }
}