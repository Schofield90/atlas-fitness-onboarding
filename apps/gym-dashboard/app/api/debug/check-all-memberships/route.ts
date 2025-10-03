import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/app/lib/supabase/admin'

export async function GET(req: NextRequest) {
  try {
    // Use admin client to bypass RLS
    const supabase = createAdminClient()
    
    // Get ALL membership plans (bypassing RLS)
    const { data: allPlans, error: plansError, count } = await supabase
      .from('membership_plans')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
    
    // Get plans specifically for Atlas Fitness
    const { data: atlasPlans, error: atlasError } = await supabase
      .from('membership_plans')
      .select('*')
      .eq('organization_id', '63589490-8f55-4157-bd3a-e141594b748e')
      .order('created_at', { ascending: false })
    
    // Get all organizations to verify IDs
    const { data: orgs, error: orgsError } = await supabase
      .from('organizations')
      .select('id, name')
    
    // Get user_organizations entries
    const { data: userOrgs, error: userOrgsError } = await supabase
      .from('user_organizations')
      .select('*')
      .eq('organization_id', '63589490-8f55-4157-bd3a-e141594b748e')
    
    return NextResponse.json({
      success: true,
      allMembershipPlans: {
        totalCount: count,
        count: allPlans?.length || 0,
        data: allPlans,
        error: plansError?.message
      },
      atlasFitnessPlans: {
        count: atlasPlans?.length || 0,
        data: atlasPlans,
        error: atlasError?.message
      },
      organizations: {
        count: orgs?.length || 0,
        data: orgs,
        error: orgsError?.message
      },
      userOrganizations: {
        count: userOrgs?.length || 0,
        data: userOrgs,
        error: userOrgsError?.message
      },
      atlasOrganizationId: '63589490-8f55-4157-bd3a-e141594b748e'
    })
  } catch (error: any) {
    return NextResponse.json({ 
      error: 'Internal server error', 
      message: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}