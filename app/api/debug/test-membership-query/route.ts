import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated', userError }, { status: 401 })
    }
    
    // Get user's organization from user_organizations table
    const { data: userOrg, error: orgError } = await supabase
      .from('user_organizations')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()
    
    // Fetch membership plans - try without the memberships count first
    const { data: plansSimple, error: simpleError } = await supabase
      .from('membership_plans')
      .select('*')
      .eq('organization_id', userOrg?.organization_id || '')
      .order('created_at', { ascending: false })
    
    // Also try with the full query
    const { data: plansWithCount, error: countError } = await supabase
      .from('membership_plans')
      .select(`
        *,
        memberships:memberships(count)
      `)
      .eq('organization_id', userOrg?.organization_id || '')
      .order('created_at', { ascending: false })
    
    // Get all membership plans (no filter) to check if any exist
    const { data: allPlans, error: allError } = await supabase
      .from('membership_plans')
      .select('*')
      .order('created_at', { ascending: false })
    
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email
      },
      userOrg,
      orgError: orgError?.message,
      organizationId: userOrg?.organization_id,
      plansSimple: {
        count: plansSimple?.length || 0,
        data: plansSimple,
        error: simpleError?.message
      },
      plansWithCount: {
        count: plansWithCount?.length || 0,
        data: plansWithCount,
        error: countError?.message
      },
      allPlans: {
        count: allPlans?.length || 0,
        data: allPlans,
        error: allError?.message
      }
    })
  } catch (error: any) {
    return NextResponse.json({ 
      error: 'Internal server error', 
      message: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}