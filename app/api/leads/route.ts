import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { requireAuth, createErrorResponse } from '@/app/lib/api/auth-check'

export async function GET(request: NextRequest) {
  try {
    // Check authentication using the helper function
    const user = await requireAuth()
    
    // Create Supabase client
    const supabase = await createClient()
    
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const source = searchParams.get('source')
    
    // Build query - now we can use user.id directly
    let query = supabase
      .from('leads')
      .select('*')
      .eq('user_id', user.id) // Filter by authenticated user
      .order('created_at', { ascending: false })
    
    // Apply filters
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }
    
    if (source) {
      query = query.eq('source', source)
    }
    
    const { data: leads, error } = await query
    
    if (error) {
      console.error('Error fetching leads:', error)
      return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      leads: leads || [],
      total: leads?.length || 0
    })
    
  } catch (error) {
    // Use the error response helper
    return createErrorResponse(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await requireAuth()
    
    const supabase = await createClient()
    const body = await request.json()
    
    // Validate required fields
    if (!body.name || !body.email || !body.phone) {
      return NextResponse.json({
        error: 'Missing required fields',
        required: ['name', 'email', 'phone']
      }, { status: 400 })
    }
    
    // Create new lead with user_id from authenticated user
    const { data: lead, error } = await supabase
      .from('leads')
      .insert({
        name: body.name,
        email: body.email,
        phone: body.phone,
        source: body.source || 'manual',
        status: body.status || 'new',
        form_name: body.form_name,
        campaign_name: body.campaign_name,
        facebook_lead_id: body.facebook_lead_id,
        page_id: body.page_id,
        form_id: body.form_id,
        field_data: body.custom_fields || {},
        user_id: user.id // Use authenticated user's ID
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
    return createErrorResponse(error)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Check authentication
    const user = await requireAuth()
    
    const supabase = await createClient()
    const body = await request.json()
    
    if (!body.id) {
      return NextResponse.json({ error: 'Lead ID is required' }, { status: 400 })
    }
    
    // Update lead - ensure it belongs to the authenticated user
    const { data: lead, error } = await supabase
      .from('leads')
      .update({
        status: body.status,
        ...body
      })
      .eq('id', body.id)
      .eq('user_id', user.id) // Ensure user owns this lead
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
    // Check authentication
    const user = await requireAuth()
    
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const leadId = searchParams.get('id')
    
    if (!leadId) {
      return NextResponse.json({ error: 'Lead ID is required' }, { status: 400 })
    }
    
    // Delete lead - ensure it belongs to the authenticated user
    const { error } = await supabase
      .from('leads')
      .delete()
      .eq('id', leadId)
      .eq('user_id', user.id) // Ensure user owns this lead
    
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