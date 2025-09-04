import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { z } from 'zod'

const clientQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  search: z.string().optional(),
  membership_status: z.enum(['active', 'paused', 'cancelled']).optional(),
  membership_type: z.string().optional(),
  sort: z.string().default('created_at'),
  order: z.enum(['asc', 'desc']).default('desc')
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

    // Parse query parameters
    const searchParams = Object.fromEntries(request.nextUrl.searchParams.entries())
    const params = clientQuerySchema.parse(searchParams)
    
    const { 
      page, 
      limit, 
      search, 
      membership_status, 
      membership_type, 
      sort, 
      order 
    } = params

    let query = supabase
      .from('clients')
      .select(`
        *,
        lead:leads(id, source, campaign_id),
        interactions_count:interactions(count)
      `, { count: 'exact' })
      .eq('organization_id', userData.organization_id)

    // Apply filters
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`)
    }

    if (membership_status) {
      query = query.eq('membership_status', membership_status)
    }

    if (membership_type) {
      query = query.eq('membership_type', membership_type)
    }

    // Apply sorting and pagination
    query = query
      .order(sort, { ascending: order === 'asc' })
      .range((page - 1) * limit, page * limit - 1)

    const { data: clients, error, count } = await query

    if (error) {
      console.error('Error fetching clients:', error)
      return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 })
    }

    return NextResponse.json({
      clients: clients || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid query parameters', 
        details: error.errors 
      }, { status: 400 })
    }
    
    console.error('Clients GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

const clientCreateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  phone: z.string().optional(),
  membership_type: z.string().default('Standard'),
  membership_status: z.enum(['active', 'paused', 'cancelled']).default('active'),
  start_date: z.string(),
  end_date: z.string().optional(),
  total_revenue: z.number().default(0),
  engagement_score: z.number().min(0).max(100).default(50),
  lead_id: z.string().optional(),
  preferences: z.any().optional(),
})

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
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedData = clientCreateSchema.parse(body)

    // Check if client with this email already exists in the organization
    const { data: existingClient } = await supabase
      .from('clients')
      .select('id')
      .eq('organization_id', userData.organization_id)
      .eq('email', validatedData.email)
      .single()

    if (existingClient) {
      return NextResponse.json({ error: 'A client with this email already exists' }, { status: 400 })
    }

    // If lead_id is provided, verify it belongs to the organization and update status
    if (validatedData.lead_id) {
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('id')
        .eq('id', validatedData.lead_id)
        .eq('organization_id', userData.organization_id)
        .single()

      if (leadError || !lead) {
        return NextResponse.json({ error: 'Invalid lead ID' }, { status: 400 })
      }

      // Update lead status to converted
      await supabase
        .from('leads')
        .update({ status: 'converted' })
        .eq('id', validatedData.lead_id)
    }

    const clientData = {
      ...validatedData,
      organization_id: userData.organization_id,
    }

    const { data: newClient, error } = await supabase
      .from('clients')
      .insert(clientData)
      .select(`
        *,
        lead:leads(id, source, campaign_id)
      `)
      .single()

    if (error) {
      console.error('Error creating client:', error)
      return NextResponse.json({ error: 'Failed to create client' }, { status: 500 })
    }

    // Log analytics event
    await supabase.from('analytics_events').insert({
      organization_id: userData.organization_id,
      event_type: 'client',
      event_name: 'client_created',
      properties: {
        client_id: newClient.id,
        membership_type: validatedData.membership_type,
        converted_from_lead: !!validatedData.lead_id,
        created_by: user.id
      },
      user_id: user.id,
      client_id: newClient.id,
      lead_id: validatedData.lead_id
    })

    return NextResponse.json(newClient, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.errors 
      }, { status: 400 })
    }
    
    console.error('Clients POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}