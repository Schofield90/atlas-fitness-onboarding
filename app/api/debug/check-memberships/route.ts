import { createClient } from '@/app/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    // Check all membership plans
    const { data: allPlans, error: allError } = await supabase
      .from('membership_plans')
      .select('*')
      .order('created_at', { ascending: false })
    
    // Get user's organization
    const { data: staffData } = await supabase
      .from('organization_staff')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()
    
    // Check membership plans for user's organization
    let orgPlans = null
    if (staffData?.organization_id) {
      const { data, error } = await supabase
        .from('membership_plans')
        .select('*')
        .eq('organization_id', staffData.organization_id)
        .order('created_at', { ascending: false })
      
      orgPlans = data
    }
    
    return NextResponse.json({
      user_id: user.id,
      organization_id: staffData?.organization_id || null,
      all_plans_count: allPlans?.length || 0,
      org_plans_count: orgPlans?.length || 0,
      all_plans: allPlans || [],
      org_plans: orgPlans || [],
      latest_plan: allPlans?.[0] || null
    }, { status: 200 })
    
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 })
  }
}