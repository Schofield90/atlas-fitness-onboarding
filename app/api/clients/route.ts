import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { requireAuth } from '@/app/lib/api/auth-check'
import { 
  handleApiError, 
  ValidationError, 
  DatabaseError,
  withApiErrorBoundary 
} from '@/app/lib/errors'

async function createClientMember(request: NextRequest) {
  // Check authentication and get organization
  const userWithOrg = await requireAuth()
    
  const supabase = await createClient()
  const body = await request.json()
  
  // Validate required fields
  if (!body.first_name) {
    throw ValidationError.required('first_name', { body })
  }
  if (!body.last_name) {
    throw ValidationError.required('last_name', { body })
  }
  if (!body.email) {
    throw ValidationError.required('email', { body })
  }
  if (!body.phone) {
    throw ValidationError.required('phone', { body })
  }
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(body.email)) {
    throw ValidationError.invalid('email', body.email, 'valid email address')
  }
  
  // Check for existing client with same email in this organization
  const { data: existingClient } = await supabase
    .from('clients')
    .select('id, email')
    .eq('email', body.email)
    .eq('organization_id', userWithOrg.organizationId)
    .single()
  
  if (existingClient) {
    throw ValidationError.duplicate('email', body.email)
  }
  
  // Build insert data
  const insertData: any = {
    first_name: body.first_name,
    last_name: body.last_name,
    full_name: `${body.first_name} ${body.last_name}`,
    email: body.email,
    phone: body.phone,
    organization_id: userWithOrg.organizationId,
    created_by: userWithOrg.id,
    status: 'active'
  }
  
  // Add optional fields if provided
  if (body.date_of_birth) insertData.date_of_birth = body.date_of_birth
  if (body.address) insertData.address = body.address
  if (body.emergency_contact_name) insertData.emergency_contact_name = body.emergency_contact_name
  if (body.emergency_contact_phone) insertData.emergency_contact_phone = body.emergency_contact_phone
  if (body.goals) insertData.goals = body.goals
  if (body.medical_conditions) insertData.medical_conditions = body.medical_conditions
  if (body.source) insertData.source = body.source
  
  // Create the client
  const { data: client, error } = await supabase
    .from('clients')
    .insert(insertData)
    .select()
    .single()
  
  if (error) {
    throw DatabaseError.queryError('clients', 'insert', {
      organizationId: userWithOrg.organizationId,
      insertData,
      originalError: error.message,
      code: error.code,
      hint: error.hint
    })
  }
  
  return NextResponse.json({
    success: true,
    client
  })
}

// Wrap with error boundary
export const POST = withApiErrorBoundary(createClientMember)

async function getClients(request: NextRequest) {
  // Check authentication and get organization
  const userWithOrg = await requireAuth()
    
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('page_size') || '50')
  
  const supabase = await createClient()
  
  // Calculate range for pagination
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  
  // Build query - filter by organization
  let query = supabase
    .from('clients')
    .select(`
      *,
      client_memberships (
        id,
        status,
        start_date,
        end_date,
        membership_plan:membership_plans (
          id,
          name,
          price_pennies,
          billing_period
        )
      )
    `, { count: 'exact' })
    .eq('organization_id', userWithOrg.organizationId)
    .order('created_at', { ascending: false })
    .range(from, to)
  
  // Apply status filter
  if (status && status !== 'all') {
    query = query.eq('status', status)
  }
  
  const { data: clients, error, count } = await query
  
  if (error) {
    throw DatabaseError.queryError('clients', 'select', {
      filters: { status },
      organizationId: userWithOrg.organizationId,
      originalError: error.message,
      code: error.code
    })
  }
  
  return NextResponse.json({
    success: true,
    clients: clients || [],
    pagination: {
      page,
      pageSize,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / pageSize)
    },
    organizationId: userWithOrg.organizationId
  })
}

// Wrap with error boundary
export const GET = withApiErrorBoundary(getClients)