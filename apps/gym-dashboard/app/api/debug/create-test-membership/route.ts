import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/app/lib/supabase/admin'

export async function GET(req: NextRequest) {
  try {
    // Use admin client to bypass RLS
    const supabase = createAdminClient()
    
    // First, check if any membership plans exist
    const { data: existingPlans, error: checkError } = await supabase
      .from('membership_plans')
      .select('*')
      .eq('organization_id', '63589490-8f55-4157-bd3a-e141594b748e')
    
    // Create a test membership plan
    const { data: newPlan, error: insertError } = await supabase
      .from('membership_plans')
      .insert({
        organization_id: '63589490-8f55-4157-bd3a-e141594b748e',
        name: 'Test Basic Membership',
        description: 'A test membership plan to verify the system works',
        price: 4999, // £49.99 in pence
        billing_period: 'monthly',
        features: ['Access to gym', 'Basic classes', 'Locker access'],
        is_active: true,
        trial_days: 7,
        max_members: null
      })
      .select()
      .single()
    
    // Get all plans after insert
    const { data: allPlans, error: allError } = await supabase
      .from('membership_plans')
      .select('*')
      .order('created_at', { ascending: false })
    
    return NextResponse.json({
      success: !insertError,
      existingPlansBeforeInsert: {
        count: existingPlans?.length || 0,
        data: existingPlans,
        error: checkError?.message
      },
      newPlanCreated: {
        data: newPlan,
        error: insertError?.message
      },
      allPlansAfterInsert: {
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