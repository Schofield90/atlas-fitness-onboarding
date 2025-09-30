import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const membershipPlanSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  price_pennies: z.number().min(0, 'Price must be non-negative'),
  currency: z.string().default('GBP'),
  billing_cycle: z.enum(['monthly', 'quarterly', 'yearly', 'one-time']).default('monthly'),
  trial_days: z.number().min(0).default(0),
  is_active: z.boolean().default(true),
  features: z.array(z.string()).default([]),
  max_members: z.number().nullable().optional(),
  includes_personal_training: z.boolean().default(false),
  includes_classes: z.boolean().default(true),
  includes_nutrition: z.boolean().default(false),
  sort_order: z.number().default(0)
})

export async function GET(request: Request) {
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
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get membership plans for the organization
    const { data: plans, error: plansError } = await supabase
      .from('membership_plans')
      .select('*')
      .eq('organization_id', userData.organization_id)
      .order('sort_order', { ascending: true })

    if (plansError) {
      console.error('Error fetching membership plans:', plansError)
      return NextResponse.json({ error: 'Failed to fetch membership plans' }, { status: 500 })
    }

    // Debug logging
    console.log('[Membership Plans GET] User:', user.id, 'Org:', userData.organization_id, 'Plans found:', plans?.length)

    return NextResponse.json({
      plans: plans || [],
      debug: {
        userId: user.id,
        organizationId: userData.organization_id,
        plansCount: plans?.length || 0
      }
    })
  } catch (error) {
    console.error('Membership plans GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
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

    // Check if user has permission to create membership plans
    if (!['owner', 'admin'].includes(userData.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedData = membershipPlanSchema.parse(body)

    // Create the membership plan
    const { data: plan, error: insertError } = await supabase
      .from('membership_plans')
      .insert({
        ...validatedData,
        organization_id: userData.organization_id
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating membership plan:', insertError)
      return NextResponse.json({ error: 'Failed to create membership plan' }, { status: 500 })
    }

    return NextResponse.json({ plan }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.errors 
      }, { status: 400 })
    }
    
    console.error('Membership plans POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}