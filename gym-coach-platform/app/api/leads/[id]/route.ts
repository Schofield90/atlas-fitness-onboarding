import { NextRequest } from 'next/server'
import { handleApiRoute, supabaseAdmin, validateRequestBody } from '@/lib/api/middleware'
import { leadUpdateSchema } from '@/lib/validations/api'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleApiRoute(request, async (req) => {
    const { user } = req
    const { id: leadId } = await params

    const { data: lead, error } = await supabaseAdmin
      .from('leads')
      .select(`
        *,
        assigned_user:users!leads_assigned_to_fkey(id, name, email),
        campaign:campaigns(id, name, type),
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
      .eq('id', leadId)
      .eq('organization_id', user.organization_id)
      .single()

    if (error) {
      throw new Error('Lead not found')
    }

    return lead
  })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleApiRoute(request, async (req) => {
    const { user } = req
    const { id: leadId } = await params
    const body = await request.json()

    const { data: validatedData, error: validationError } = validateRequestBody(
      body,
      leadUpdateSchema
    )

    if (validationError || !validatedData) {
      throw new Error(validationError || 'Invalid request body')
    }

    const leadUpdateData = validatedData as any

    // Verify lead belongs to user's organization
    const { data: existingLead, error: fetchError } = await supabaseAdmin
      .from('leads')
      .select('id, status')
      .eq('id', leadId)
      .eq('organization_id', user.organization_id)
      .single()

    if (fetchError || !existingLead) {
      throw new Error('Lead not found')
    }

    const { data: updatedLead, error } = await supabaseAdmin
      .from('leads')
      .update(leadUpdateData)
      .eq('id', leadId)
      .select(`
        *,
        assigned_user:users!leads_assigned_to_fkey(id, name, email),
        campaign:campaigns(id, name, type)
      `)
      .single()

    if (error) {
      throw new Error('Failed to update lead')
    }

    // Log analytics event if status changed
    if (leadUpdateData.status && leadUpdateData.status !== existingLead.status) {
      await supabaseAdmin.from('analytics_events').insert({
        organization_id: user.organization_id,
        event_type: 'lead',
        event_name: 'lead_status_changed',
        properties: {
          lead_id: leadId,
          old_status: existingLead.status,
          new_status: leadUpdateData.status,
          updated_by: user.id
        },
        user_id: user.id,
        lead_id: leadId
      })
    }

    return updatedLead
  })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleApiRoute(request, async (req) => {
    const { user } = req
    const { id: leadId } = await params

    // Only owners and admins can delete leads
    if (!['owner', 'admin'].includes(user.role)) {
      throw new Error('Insufficient permissions')
    }

    // Verify lead belongs to user's organization
    const { data: lead, error: fetchError } = await supabaseAdmin
      .from('leads')
      .select('id')
      .eq('id', leadId)
      .eq('organization_id', user.organization_id)
      .single()

    if (fetchError || !lead) {
      throw new Error('Lead not found')
    }

    const { error } = await supabaseAdmin
      .from('leads')
      .delete()
      .eq('id', leadId)

    if (error) {
      throw new Error('Failed to delete lead')
    }

    // Log analytics event
    await supabaseAdmin.from('analytics_events').insert({
      organization_id: user.organization_id,
      event_type: 'lead',
      event_name: 'lead_deleted',
      properties: {
        lead_id: leadId,
        deleted_by: user.id
      },
      user_id: user.id
    })

    return { message: 'Lead deleted successfully' }
  }, { allowedRoles: ['owner', 'admin'] })
}