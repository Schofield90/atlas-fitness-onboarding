import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { requireAuth, createErrorResponse } from '@/app/lib/api/auth-check'

export async function GET(request: NextRequest) {
  try {
    // Check authentication and get organization
    const userWithOrg = await requireAuth()
    
    // Create Supabase client
    const supabase = await createClient()
    
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const source = searchParams.get('source')
    const assignedTo = searchParams.get('assigned_to')
    const createdBy = searchParams.get('created_by')
    
    // Build query - filter by organization for shared access
    let query = supabase
      .from('leads')
      .select(`
        *,
        lead_tags (
          tag_id,
          tags (
            id,
            name,
            color
          )
        )
      `)
      .eq('organization_id', userWithOrg.organizationId) // Filter by organization
      .order('created_at', { ascending: false })
    
    // Apply filters
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }
    
    if (source) {
      query = query.eq('source', source)
    }
    
    if (assignedTo) {
      query = query.eq('assigned_to', assignedTo)
    }
    
    if (createdBy) {
      query = query.eq('created_by', createdBy)
    }
    
    const { data: leads, error } = await query
    
    if (error) {
      console.error('Error fetching leads:', error)
      return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      leads: leads || [],
      total: leads?.length || 0,
      organizationId: userWithOrg.organizationId
    })
    
  } catch (error) {
    // Use the error response helper
    return createErrorResponse(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication and get organization
    const userWithOrg = await requireAuth()
    
    const supabase = await createClient()
    const body = await request.json()
    
    // Validate required fields
    if (!body.name || !body.email || !body.phone) {
      return NextResponse.json({
        error: 'Missing required fields',
        required: ['name', 'email', 'phone']
      }, { status: 400 })
    }
    
    // Log the data we're trying to insert
    console.log('Creating lead with data:', {
      name: body.name,
      email: body.email,
      phone: body.phone,
      organization_id: userWithOrg.organizationId,
      created_by: userWithOrg.id
    })
    
    // Build insert data with only essential fields
    const insertData: any = {
      name: body.name,
      email: body.email,
      phone: body.phone,
      organization_id: userWithOrg.organizationId
    }
    
    // Add optional fields only if they're provided
    if (body.source) insertData.source = body.source
    if (body.status) insertData.status = body.status
    if (body.form_name) insertData.form_name = body.form_name
    if (body.campaign_name) insertData.campaign_name = body.campaign_name
    
    // Create the lead
    const { data: lead, error } = await supabase
      .from('leads')
      .insert(insertData)
      .select()
      .single()
    
    if (error) {
      console.error('Error creating lead:', error)
      return NextResponse.json({ 
        error: 'Failed to create lead',
        details: error.message,
        code: error.code,
        hint: error.hint
      }, { status: 500 })
    }
    
    // Trigger workflow for new lead
    try {
      const webhookResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/webhooks/lead-created`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead,
          organizationId: userWithOrg.organizationId
        })
      })
      
      if (!webhookResponse.ok) {
        console.error('Failed to trigger lead created webhook')
      }
    } catch (webhookError) {
      console.error('Error triggering workflow:', webhookError)
      // Don't fail the lead creation if webhook fails
    }
    
    return NextResponse.json({
      success: true,
      lead
    })
    
  } catch (error) {
    return createErrorResponse(error)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Check authentication and get organization
    const userWithOrg = await requireAuth()
    
    const supabase = await createClient()
    const body = await request.json()
    
    if (!body.id) {
      return NextResponse.json({ error: 'Lead ID is required' }, { status: 400 })
    }
    
    // Remove fields that shouldn't be updated
    const { id, organization_id, created_by, ...updateData } = body
    
    // Update lead - ensure it belongs to the user's organization
    const { data: lead, error } = await supabase
      .from('leads')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', body.id)
      .eq('organization_id', userWithOrg.organizationId) // Ensure org owns this lead
      .select()
      .single()
    
    if (error) {
      console.error('Error updating lead:', error)
      return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 })
    }
    
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found or unauthorized' }, { status: 404 })
    }
    
    return NextResponse.json({
      success: true,
      lead
    })
    
  } catch (error) {
    return createErrorResponse(error)
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Check authentication and get organization
    const userWithOrg = await requireAuth()
    
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const leadId = searchParams.get('id')
    
    if (!leadId) {
      return NextResponse.json({ error: 'Lead ID is required' }, { status: 400 })
    }
    
    // First, verify the lead exists and belongs to the organization
    const { data: existingLead, error: checkError } = await supabase
      .from('leads')
      .select('id')
      .eq('id', leadId)
      .eq('organization_id', userWithOrg.organizationId)
      .single()
    
    if (checkError || !existingLead) {
      return NextResponse.json({ error: 'Lead not found or unauthorized' }, { status: 404 })
    }
    
    // Delete lead - ensure it belongs to the user's organization
    const { error } = await supabase
      .from('leads')
      .delete()
      .eq('id', leadId)
      .eq('organization_id', userWithOrg.organizationId) // Ensure org owns this lead
    
    if (error) {
      console.error('Error deleting lead:', error)
      return NextResponse.json({ error: 'Failed to delete lead' }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      deleted: leadId
    })
    
  } catch (error) {
    return createErrorResponse(error)
  }
}