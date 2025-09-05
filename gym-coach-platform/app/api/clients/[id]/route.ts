import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { z } from 'zod'

const clientUpdateSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  email: z.string().email('Invalid email').optional(),
  phone: z.string().optional(),
  membership_type: z.string().optional(),
  membership_status: z.enum(['active', 'paused', 'cancelled']).optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  total_revenue: z.number().optional(),
  engagement_score: z.number().min(0).max(100).optional(),
  preferences: z.any().optional(),
  notes: z.string().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: clientId } = await params

    const { data: client, error } = await supabase
      .from('clients')
      .select(`
        *,
        lead:leads(id, source, campaign_id, name as lead_name),
        interactions(
          id,
          type,
          direction,
          subject,
          content,
          created_at,
          created_by,
          created_user:users!interactions_created_by_fkey(id, name, email)
        )
      `)
      .eq('id', clientId)
      .eq('organization_id', userData.organization_id)
      .single()

    if (error) {
      console.error('Error fetching client:', error)
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    return NextResponse.json(client)
  } catch (error) {
    console.error('Client GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { id: clientId } = await params
    const body = await request.json()
    const validatedData = clientUpdateSchema.parse(body)

    // Verify client belongs to user's organization
    const { data: existingClient, error: fetchError } = await supabase
      .from('clients')
      .select('id, membership_status, total_revenue')
      .eq('id', clientId)
      .eq('organization_id', userData.organization_id)
      .single()

    if (fetchError || !existingClient) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const { data: updatedClient, error } = await supabase
      .from('clients')
      .update(validatedData)
      .eq('id', clientId)
      .select(`
        *,
        lead:leads(id, source, campaign_id)
      `)
      .single()

    if (error) {
      console.error('Error updating client:', error)
      return NextResponse.json({ error: 'Failed to update client' }, { status: 500 })
    }

    // Log analytics events for significant changes
    const events = []

    if (validatedData.membership_status && validatedData.membership_status !== existingClient.membership_status) {
      events.push({
        organization_id: userData.organization_id,
        event_type: 'client',
        event_name: 'membership_status_changed',
        properties: {
          client_id: clientId,
          old_status: existingClient.membership_status,
          new_status: validatedData.membership_status,
          updated_by: user.id
        },
        user_id: user.id,
        client_id: clientId
      })
    }

    if (validatedData.total_revenue && validatedData.total_revenue !== existingClient.total_revenue) {
      events.push({
        organization_id: userData.organization_id,
        event_type: 'client',
        event_name: 'revenue_updated',
        properties: {
          client_id: clientId,
          old_revenue: existingClient.total_revenue,
          new_revenue: validatedData.total_revenue,
          revenue_change: validatedData.total_revenue - (existingClient.total_revenue || 0),
          updated_by: user.id
        },
        user_id: user.id,
        client_id: clientId
      })
    }

    if (events.length > 0) {
      await supabase.from('analytics_events').insert(events)
    }

    return NextResponse.json(updatedClient)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.errors 
      }, { status: 400 })
    }
    
    console.error('Client PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // Only owners and admins can delete clients
    if (!['owner', 'admin'].includes(userData.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { id: clientId } = await params

    // Verify client belongs to user's organization
    const { data: client, error: fetchError } = await supabase
      .from('clients')
      .select('id, total_revenue')
      .eq('id', clientId)
      .eq('organization_id', userData.organization_id)
      .single()

    if (fetchError || !client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', clientId)

    if (error) {
      console.error('Error deleting client:', error)
      return NextResponse.json({ error: 'Failed to delete client' }, { status: 500 })
    }

    // Log analytics event
    await supabase.from('analytics_events').insert({
      organization_id: userData.organization_id,
      event_type: 'client',
      event_name: 'client_deleted',
      properties: {
        client_id: clientId,
        total_revenue: client.total_revenue,
        deleted_by: user.id
      },
      user_id: user.id
    })

    return NextResponse.json({ message: 'Client deleted successfully' })
  } catch (error) {
    console.error('Client DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}