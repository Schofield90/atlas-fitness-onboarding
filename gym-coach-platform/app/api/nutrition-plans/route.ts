import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { z } from 'zod'

const nutritionPlanSchema = z.object({
  client_id: z.string().uuid(),
  macro_targets: z.object({
    protein: z.number(),
    carbs: z.number(),
    fats: z.number(),
    calories: z.number()
  }),
  profile_data: z.object({
    age: z.number(),
    gender: z.enum(['male', 'female']),
    weight: z.number(),
    height: z.number(),
    activityLevel: z.enum(['sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extremely_active']),
    goal: z.enum(['lose_weight', 'maintain_weight', 'gain_weight', 'gain_muscle']),
    dietaryRestrictions: z.array(z.string()).optional(),
    allergies: z.array(z.string()).optional()
  }),
  meal_plan: z.any().optional(),
  notes: z.string().optional()
})

export async function GET(request: NextRequest) {
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

    const client_id = request.nextUrl.searchParams.get('client_id')
    
    if (!client_id) {
      return NextResponse.json({ error: 'client_id is required' }, { status: 400 })
    }

    // Verify client belongs to user's organization
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('id')
      .eq('id', client_id)
      .eq('organization_id', userData.organization_id)
      .single()

    if (clientError || !clientData) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Get nutrition plan
    const { data: planData, error: planError } = await supabase
      .from('client_nutrition_plans')
      .select('*')
      .eq('client_id', client_id)
      .single()

    if (planError && planError.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Database error:', planError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    return NextResponse.json({ plan: planData })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const planData = nutritionPlanSchema.parse(body)

    // Verify client belongs to user's organization
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('id')
      .eq('id', planData.client_id)
      .eq('organization_id', userData.organization_id)
      .single()

    if (clientError || !clientData) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Create nutrition plan
    const { data: newPlan, error: createError } = await supabase
      .from('client_nutrition_plans')
      .insert({
        client_id: planData.client_id,
        organization_id: userData.organization_id,
        macro_targets: planData.macro_targets,
        profile_data: planData.profile_data,
        meal_plan: planData.meal_plan,
        notes: planData.notes
      })
      .select()
      .single()

    if (createError) {
      console.error('Create error:', createError)
      return NextResponse.json({ error: 'Failed to create nutrition plan' }, { status: 500 })
    }

    return NextResponse.json({ plan: newPlan })
  } catch (error) {
    console.error('API error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
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

    const body = await request.json()
    const planData = nutritionPlanSchema.parse(body)

    // Verify client belongs to user's organization
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('id')
      .eq('id', planData.client_id)
      .eq('organization_id', userData.organization_id)
      .single()

    if (clientError || !clientData) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Update nutrition plan
    const { data: updatedPlan, error: updateError } = await supabase
      .from('client_nutrition_plans')
      .update({
        macro_targets: planData.macro_targets,
        profile_data: planData.profile_data,
        meal_plan: planData.meal_plan,
        notes: planData.notes
      })
      .eq('client_id', planData.client_id)
      .eq('organization_id', userData.organization_id)
      .select()
      .single()

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json({ error: 'Failed to update nutrition plan' }, { status: 500 })
    }

    return NextResponse.json({ plan: updatedPlan })
  } catch (error) {
    console.error('API error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}