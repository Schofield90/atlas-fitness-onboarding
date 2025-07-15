import { NextRequest } from 'next/server'
import { handleApiRoute, supabaseAdmin, validateRequestBody, parseSearchParams } from '@/lib/api/middleware'
import { leadCreateSchema, leadQuerySchema } from '@/lib/validations/api'

export async function GET(request: NextRequest) {
  return handleApiRoute(request, async (req) => {
    const { user } = req
    
    const params = parseSearchParams(request, leadQuerySchema)
    const { page, limit, search, status, assigned_to, source, sort = 'created_at', order = 'desc' } = params

    let query = supabaseAdmin
      .from('leads')
      .select(`
        *,
        assigned_user:users!leads_assigned_to_fkey(id, name, email),
        campaign:campaigns(id, name, type),
        interactions_count:interactions(count)
      `, { count: 'exact' })
      .eq('organization_id', user.organization_id)

    // Apply filters
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`)
    }

    if (status) {
      query = query.eq('status', status)
    }

    if (assigned_to) {
      query = query.eq('assigned_to', assigned_to)
    }

    if (source) {
      query = query.eq('source', source)
    }

    // Apply sorting and pagination
    query = query
      .order(sort, { ascending: order === 'asc' })
      .range((page - 1) * limit, page * limit - 1)

    const { data: leads, error, count } = await query

    if (error) {
      throw new Error('Failed to fetch leads')
    }

    return {
      leads,
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
      leadCreateSchema
    )

    if (validationError || !validatedData) {
      throw new Error(validationError || 'Invalid request body')
    }

    const leadCreateData = validatedData as any

    // Check if lead with this email already exists in the organization
    const { data: existingLead } = await supabaseAdmin
      .from('leads')
      .select('id')
      .eq('organization_id', user.organization_id)
      .eq('email', leadCreateData.email)
      .single()

    if (existingLead) {
      throw new Error('A lead with this email already exists')
    }

    const leadData = {
      ...leadCreateData,
      organization_id: user.organization_id,
      lead_score: 0 // Will be calculated by triggers
    }

    const { data: newLead, error } = await supabaseAdmin
      .from('leads')
      .insert(leadData)
      .select(`
        *,
        assigned_user:users!leads_assigned_to_fkey(id, name, email),
        campaign:campaigns(id, name, type)
      `)
      .single()

    if (error) {
      throw new Error('Failed to create lead')
    }

    // Log analytics event
    await supabaseAdmin.from('analytics_events').insert({
      organization_id: user.organization_id,
      event_type: 'lead',
      event_name: 'lead_created',
      properties: {
        lead_id: newLead.id,
        source: leadCreateData.source,
        created_by: user.id
      },
      user_id: user.id,
      lead_id: newLead.id
    })

    return newLead
  })
}