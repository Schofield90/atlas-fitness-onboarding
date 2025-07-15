import { NextRequest } from 'next/server'
import { handleApiRoute, supabaseAdmin, validateRequestBody, parseSearchParams } from '@/lib/api/middleware'
import { clientCreateSchema, clientQuerySchema } from '@/lib/validations/api'

export async function GET(request: NextRequest) {
  return handleApiRoute(request, async (req) => {
    const { user } = req
    
    const params = parseSearchParams(request, clientQuerySchema)
    const { 
      page, 
      limit, 
      search, 
      membership_status, 
      membership_type, 
      sort = 'created_at', 
      order = 'desc' 
    } = params

    let query = supabaseAdmin
      .from('clients')
      .select(`
        *,
        lead:leads(id, source, campaign_id),
        interactions_count:interactions(count)
      `, { count: 'exact' })
      .eq('organization_id', user.organization_id)

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
      throw new Error('Failed to fetch clients')
    }

    return {
      clients,
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    }
  })
}

export async function POST(request: NextRequest) {
  return handleApiRoute(request, async (req) => {
    const { user } = req
    const body = await request.json()
    
    const { data: validatedData, error: validationError } = validateRequestBody(
      body,
      clientCreateSchema
    )

    if (validationError || !validatedData) {
      throw new Error(validationError || 'Invalid request body')
    }

    const clientCreateData = validatedData as any

    // Check if client with this email already exists in the organization
    const { data: existingClient } = await supabaseAdmin
      .from('clients')
      .select('id')
      .eq('organization_id', user.organization_id)
      .eq('email', clientCreateData.email)
      .single()

    if (existingClient) {
      throw new Error('A client with this email already exists')
    }

    // If lead_id is provided, verify it belongs to the organization and update status
    if (clientCreateData.lead_id) {
      const { data: lead, error: leadError } = await supabaseAdmin
        .from('leads')
        .select('id')
        .eq('id', clientCreateData.lead_id)
        .eq('organization_id', user.organization_id)
        .single()

      if (leadError || !lead) {
        throw new Error('Invalid lead ID')
      }

      // Update lead status to converted
      await supabaseAdmin
        .from('leads')
        .update({ status: 'converted' })
        .eq('id', clientCreateData.lead_id)
    }

    const clientData = {
      ...clientCreateData,
      organization_id: user.organization_id,
      engagement_score: clientCreateData.engagement_score || 50 // Default engagement score
    }

    const { data: newClient, error } = await supabaseAdmin
      .from('clients')
      .insert(clientData)
      .select(`
        *,
        lead:leads(id, source, campaign_id)
      `)
      .single()

    if (error) {
      throw new Error('Failed to create client')
    }

    // Log analytics event
    await supabaseAdmin.from('analytics_events').insert({
      organization_id: user.organization_id,
      event_type: 'client',
      event_name: 'client_created',
      properties: {
        client_id: newClient.id,
        membership_type: clientCreateData.membership_type,
        converted_from_lead: !!clientCreateData.lead_id,
        created_by: user.id
      },
      user_id: user.id,
      client_id: newClient.id,
      lead_id: clientCreateData.lead_id
    })

    return newClient
  })
}