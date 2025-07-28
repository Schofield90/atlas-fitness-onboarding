import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { requireAuthWithOrg, createErrorResponse } from '@/app/lib/api/auth-check-org'
import { secureDelete, secureUpdate, createSecureResponse } from '@/app/lib/api/secure-delete'
import { z } from 'zod'

// Input validation schemas
const createLeadSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  phone: z.string().min(10).max(20),
  source: z.enum(['manual', 'facebook', 'website', 'referral', 'walk-in']).optional(),
  status: z.enum(['new', 'contacted', 'qualified', 'converted', 'lost']).optional(),
  form_name: z.string().optional(),
  campaign_name: z.string().optional(),
  facebook_lead_id: z.string().optional(),
  page_id: z.string().optional(),
  form_id: z.string().optional(),
  custom_fields: z.record(z.string(), z.any()).optional()
})

const updateLeadSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(10).max(20).optional(),
  status: z.enum(['new', 'contacted', 'qualified', 'converted', 'lost']).optional(),
  notes: z.string().optional()
})

export async function GET(request: NextRequest) {
  try {
    // Check authentication and get organization
    const user = await requireAuthWithOrg()
    
    // Create Supabase client
    const supabase = await createClient()
    
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const source = searchParams.get('source')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100) // Max 100 per page
    const offset = (page - 1) * limit
    
    // Build query with organization filter - CRITICAL for security
    let query = supabase
      .from('leads')
      .select('*', { count: 'exact' })
      .eq('organization_id', user.organizationId) // SECURITY: Only get leads from user's org
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    
    // Apply filters
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }
    
    if (source) {
      query = query.eq('source', source)
    }
    
    const { data: leads, error, count } = await query
    
    if (error) {
      console.error('Error fetching leads:', error)
      return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      leads: leads || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })
    
  } catch (error) {
    return createErrorResponse(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication and get organization
    const user = await requireAuthWithOrg()
    
    const supabase = await createClient()
    const body = await request.json()
    
    // Validate input
    const validatedData = createLeadSchema.parse(body)
    
    // Create new lead with organization_id - CRITICAL for security
    const { data: lead, error } = await supabase
      .from('leads')
      .insert({
        ...validatedData,
        field_data: validatedData.custom_fields || {},
        organization_id: user.organizationId, // SECURITY: Set organization from authenticated user
        user_id: user.id,
        source: validatedData.source || 'manual',
        status: validatedData.status || 'new'
      })
      .select()
      .single()
    
    if (error) {
      console.error('Error creating lead:', error)
      return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      lead
    })
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation failed',
        details: error.flatten().fieldErrors
      }, { status: 400 })
    }
    return createErrorResponse(error)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Check authentication and get organization
    const user = await requireAuthWithOrg()
    
    const supabase = await createClient()
    const body = await request.json()
    
    // Validate input
    const validatedData = updateLeadSchema.parse(body)
    const { id, ...updateData } = validatedData
    
    // Use secure update to ensure organization ownership
    const result = await secureUpdate({
      table: 'leads',
      id,
      organizationId: user.organizationId,
      data: updateData,
      supabase
    })
    
    return createSecureResponse(result)
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation failed',
        details: error.flatten().fieldErrors
      }, { status: 400 })
    }
    return createErrorResponse(error)
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Check authentication and get organization
    const user = await requireAuthWithOrg()
    
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const leadId = searchParams.get('id')
    
    if (!leadId) {
      return NextResponse.json({ error: 'Lead ID is required' }, { status: 400 })
    }
    
    // Validate UUID format to prevent injection
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(leadId)) {
      return NextResponse.json({ error: 'Invalid lead ID format' }, { status: 400 })
    }
    
    // Use secure delete to ensure organization ownership
    const result = await secureDelete({
      table: 'leads',
      id: leadId,
      organizationId: user.organizationId,
      supabase
    })
    
    return createSecureResponse(result)
    
  } catch (error) {
    return createErrorResponse(error)
  }
}