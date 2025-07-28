import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { requireAuth, createErrorResponse } from '@/app/lib/api/auth-check'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication and get organization
    const userWithOrg = await requireAuth()
    
    const supabase = await createClient()
    const { id } = await params

    // Fetch the specific lead with organization check
    const { data: lead, error } = await supabase
      .from('leads')
      .select('*')
      .eq('id', id)
      .eq('organization_id', userWithOrg.organizationId) // Ensure org access
      .single()

    if (error || !lead) {
      console.error('Error fetching lead:', error)
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    return NextResponse.json({ lead })
  } catch (error) {
    console.error('Error in lead GET:', error)
    return createErrorResponse(error)
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication and get organization
    const userWithOrg = await requireAuth()
    
    const supabase = await createClient()
    const { id } = await params
    const body = await request.json()
    
    // Remove fields that shouldn't be updated
    const { organization_id, created_by, ...updateData } = body
    
    // Update lead - ensure it belongs to the user's organization
    const { data: lead, error } = await supabase
      .from('leads')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('organization_id', userWithOrg.organizationId) // Ensure org owns this lead
      .select()
      .single()
    
    if (error || !lead) {
      console.error('Error updating lead:', error)
      return NextResponse.json({ error: 'Lead not found or unauthorized' }, { status: 404 })
    }
    
    return NextResponse.json({ 
      success: true,
      lead 
    })
  } catch (error) {
    console.error('Error in lead PATCH:', error)
    return createErrorResponse(error)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication and get organization
    const userWithOrg = await requireAuth()
    
    const supabase = await createClient()
    const { id } = await params
    
    // First, verify the lead exists and belongs to the organization
    const { data: existingLead, error: checkError } = await supabase
      .from('leads')
      .select('id')
      .eq('id', id)
      .eq('organization_id', userWithOrg.organizationId)
      .single()
    
    if (checkError || !existingLead) {
      return NextResponse.json({ error: 'Lead not found or unauthorized' }, { status: 404 })
    }
    
    // Delete lead - ensure it belongs to the user's organization
    const { error } = await supabase
      .from('leads')
      .delete()
      .eq('id', id)
      .eq('organization_id', userWithOrg.organizationId) // Ensure org owns this lead
    
    if (error) {
      console.error('Error deleting lead:', error)
      return NextResponse.json({ error: 'Failed to delete lead' }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      deleted: id
    })
  } catch (error) {
    console.error('Error in lead DELETE:', error)
    return createErrorResponse(error)
  }
}