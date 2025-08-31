import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { getCurrentUserOrganization } from '@/app/lib/organization-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get user's organization
    const { organizationId, error: orgError } = await getCurrentUserOrganization()

    if (orgError || !organizationId) {
      return NextResponse.json({ 
        error: 'No organization found',
        details: orgError
      }, { status: 404 })
    }

    // Check membership_plans table structure
    const { data: plans, error: plansError } = await supabase
      .from('membership_plans')
      .select('*')
      .eq('organization_id', organizationId)
      .limit(5)

    // Also check if there are ANY membership plans in the database
    const { data: allPlans, error: allPlansError } = await supabase
      .from('membership_plans')
      .select('id, organization_id, name, price_amount')
      .limit(10)

    return NextResponse.json({
      success: true,
      organizationId,
      plans: plans || [],
      plansError: plansError?.message,
      plansCount: plans?.length || 0,
      allPlansCount: allPlans?.length || 0,
      allPlansError: allPlansError?.message,
      sampleAllPlans: allPlans || [],
      tableExists: !plansError,
      debugInfo: {
        userId: user.id,
        userEmail: user.email
      }
    })

  } catch (error) {
    console.error('Test error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Create a test membership plan
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get user's organization
    const { organizationId, error: orgError } = await getCurrentUserOrganization()

    if (orgError || !organizationId) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 })
    }

    // Create a test plan
    const { data: newPlan, error: createError } = await supabase
      .from('membership_plans')
      .insert({
        organization_id: organizationId,
        name: 'Test Premium Membership',
        description: 'Premium gym access with personal training',
        price_amount: 79.99,
        billing_period: 'monthly',
        features: ['24/7 Gym Access', 'Group Classes', '2 Personal Training Sessions', 'Nutrition Consultation'],
        class_credits: 20,
        is_active: true
      })
      .select()
      .single()

    if (createError) {
      return NextResponse.json({ 
        error: 'Failed to create plan',
        details: createError.message 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      plan: newPlan,
      message: 'Test membership plan created successfully'
    })

  } catch (error) {
    console.error('Create error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}