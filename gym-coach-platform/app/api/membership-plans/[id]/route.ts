import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const membershipPlanUpdateSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  description: z.string().optional(),
  price_pennies: z.number().min(0, 'Price must be non-negative').optional(),
  currency: z.string().optional(),
  billing_cycle: z.enum(['monthly', 'quarterly', 'yearly', 'one-time']).optional(),
  trial_days: z.number().min(0).optional(),
  is_active: z.boolean().optional(),
  features: z.array(z.string()).optional(),
  max_members: z.number().nullable().optional(),
  includes_personal_training: z.boolean().optional(),
  includes_classes: z.boolean().optional(),
  includes_nutrition: z.boolean().optional(),
  sort_order: z.number().optional()
})

export async function GET(request: Request, { params }: { params: { id: string } }) {
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

    // Get the specific membership plan
    const { data: plan, error: planError } = await supabase
      .from('membership_plans')
      .select('*')
      .eq('id', params.id)
      .eq('organization_id', userData.organization_id)
      .single()

    if (planError || !plan) {
      return NextResponse.json({ error: 'Membership plan not found' }, { status: 404 })
    }

    return NextResponse.json({ plan })
  } catch (error) {
    console.error('Membership plan GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
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

    // Check if user has permission to update membership plans
    if (!['owner', 'admin'].includes(userData.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Verify the plan exists and belongs to the user's organization
    const { data: existingPlan, error: planError } = await supabase
      .from('membership_plans')
      .select('id')
      .eq('id', params.id)
      .eq('organization_id', userData.organization_id)
      .single()

    if (planError || !existingPlan) {
      return NextResponse.json({ error: 'Membership plan not found' }, { status: 404 })
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedData = membershipPlanUpdateSchema.parse(body)

    // Update the membership plan
    const { data: plan, error: updateError } = await supabase
      .from('membership_plans')
      .update(validatedData)
      .eq('id', params.id)
      .eq('organization_id', userData.organization_id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating membership plan:', updateError)
      return NextResponse.json({ error: 'Failed to update membership plan' }, { status: 500 })
    }

    return NextResponse.json({ plan })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.errors 
      }, { status: 400 })
    }
    
    console.error('Membership plan PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
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

    // Check if user has permission to delete membership plans
    if (!['owner', 'admin'].includes(userData.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Check if any clients are using this membership plan
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('id')
      .eq('membership_plan_id', params.id)
      .limit(1)

    if (clientsError) {
      console.error('Error checking clients:', clientsError)
      return NextResponse.json({ error: 'Failed to check plan usage' }, { status: 500 })
    }

    if (clients && clients.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete membership plan that is currently in use by clients' 
      }, { status: 400 })
    }

    // Delete the membership plan
    const { error: deleteError } = await supabase
      .from('membership_plans')
      .delete()
      .eq('id', params.id)
      .eq('organization_id', userData.organization_id)

    if (deleteError) {
      console.error('Error deleting membership plan:', deleteError)
      return NextResponse.json({ error: 'Failed to delete membership plan' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Membership plan deleted successfully' })
  } catch (error) {
    console.error('Membership plan DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}