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
      .select('organization_id, role, email')
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

    return NextResponse.json({
      user: {
        id: user.id,
        email: userData.email,
        organization_id: userData.organization_id,
        role: userData.role
      },
      plans: (allPlans || []).map(plan => ({
        id: plan.id,
        name: plan.name,
        organization_id: plan.organization_id,
        belongs_to_your_org: plan.organization_id === userData.organization_id,
        price_pennies: plan.price_pennies,
        price_display: `£${(plan.price_pennies / 100).toFixed(2)}`,
        needs_price_fix: plan.price_pennies < 1000 && plan.price_pennies > 0, // Likely stored as pounds not pennies
        billing_cycle: plan.billing_cycle,
        is_active: plan.is_active,
        created_at: plan.created_at
      })),
      summary: {
        total_plans: allPlans?.length || 0,
        your_org_plans: allPlans?.filter(p => p.organization_id === userData.organization_id).length || 0,
        other_org_plans: allPlans?.filter(p => p.organization_id !== userData.organization_id).length || 0,
        plans_needing_price_fix: allPlans?.filter(p => p.price_pennies < 1000 && p.price_pennies > 0).length || 0
      },
      instructions: {
        to_fix_prices: 'POST to /api/debug/fix-membership-plans with { action: "fix_prices" }',
        to_reassign_plans: 'POST to /api/debug/fix-membership-plans with { action: "reassign_to_my_org", plan_ids: [...] }'
      }
    })
  } catch (error) {
    console.error('Debug membership plans error:', error)
    return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 })
  }
}

export async function POST(request: Request) {
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

    // Only owners and admins can fix data
    if (!['owner', 'admin'].includes(userData.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { action, plan_ids } = body

    if (action === 'fix_prices') {
      // Find all plans with prices < 1000 (likely stored as pounds instead of pennies)
      const { data: plansToFix, error: fetchError } = await supabase
        .from('membership_plans')
        .select('*')
        .eq('organization_id', userData.organization_id)
        .lt('price_pennies', 1000)
        .gt('price_pennies', 0)

      if (fetchError) {
        return NextResponse.json({ error: 'Failed to fetch plans', details: fetchError }, { status: 500 })
      }

      const updates = []
      for (const plan of plansToFix || []) {
        const correctedPrice = plan.price_pennies * 100 // Convert pounds to pennies
        const { error: updateError } = await supabase
          .from('membership_plans')
          .update({ price_pennies: correctedPrice })
          .eq('id', plan.id)
          .eq('organization_id', userData.organization_id)

        if (updateError) {
          updates.push({ plan_id: plan.id, name: plan.name, error: updateError.message })
        } else {
          updates.push({
            plan_id: plan.id,
            name: plan.name,
            old_price: plan.price_pennies,
            new_price: correctedPrice,
            success: true
          })
        }
      }

      return NextResponse.json({
        message: 'Price fix completed',
        updates
      })
    }

    if (action === 'reassign_to_my_org' && plan_ids) {
      // Reassign specified plans to current user's organization
      const updates = []
      for (const planId of plan_ids) {
        const { error: updateError } = await supabase
          .from('membership_plans')
          .update({ organization_id: userData.organization_id })
          .eq('id', planId)

        if (updateError) {
          updates.push({ plan_id: planId, error: updateError.message })
        } else {
          updates.push({ plan_id: planId, success: true })
        }
      }

      return NextResponse.json({
        message: 'Plans reassigned',
        updates
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Fix membership plans error:', error)
    return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 })
  }
}