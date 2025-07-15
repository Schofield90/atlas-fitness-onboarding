import { NextRequest } from 'next/server'
import { handleApiRoute, supabaseAdmin, validateRequestBody } from '@/lib/api/middleware'
import { clientUpdateSchema } from '@/lib/validations/api'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleApiRoute(request, async (req) => {
    const { user } = req
    const { id: clientId } = await params

    const { data: client, error } = await supabaseAdmin
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
      .eq('organization_id', user.organization_id)
      .single()

    if (error) {
      throw new Error('Client not found')
    }

    return client
  })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleApiRoute(request, async (req) => {
    const { user } = req
    const { id: clientId } = await params
    const body = await request.json()

    const { data: validatedData, error: validationError } = validateRequestBody(
      body,
      clientUpdateSchema
    )

    if (validationError || !validatedData) {
      throw new Error(validationError || 'Invalid request body')
    }

    const clientUpdateData = validatedData as any

    // Verify client belongs to user's organization
    const { data: existingClient, error: fetchError } = await supabaseAdmin
      .from('clients')
      .select('id, membership_status, total_revenue')
      .eq('id', clientId)
      .eq('organization_id', user.organization_id)
      .single()

    if (fetchError || !existingClient) {
      throw new Error('Client not found')
    }

    const { data: updatedClient, error } = await supabaseAdmin
      .from('clients')
      .update(clientUpdateData)
      .eq('id', clientId)
      .select(`
        *,
        lead:leads(id, source, campaign_id)
      `)
      .single()

    if (error) {
      throw new Error('Failed to update client')
    }

    // Log analytics events for significant changes
    const events = []

    if (clientUpdateData.membership_status && clientUpdateData.membership_status !== existingClient.membership_status) {
      events.push({
        organization_id: user.organization_id,
        event_type: 'client',
        event_name: 'membership_status_changed',
        properties: {
          client_id: clientId,
          old_status: existingClient.membership_status,
          new_status: clientUpdateData.membership_status,
          updated_by: user.id
        },
        user_id: user.id,
        client_id: clientId
      })
    }

    if (clientUpdateData.total_revenue && clientUpdateData.total_revenue !== existingClient.total_revenue) {
      events.push({
        organization_id: user.organization_id,
        event_type: 'client',
        event_name: 'revenue_updated',
        properties: {
          client_id: clientId,
          old_revenue: existingClient.total_revenue,
          new_revenue: clientUpdateData.total_revenue,
          revenue_change: clientUpdateData.total_revenue - (existingClient.total_revenue || 0),
          updated_by: user.id
        },
        user_id: user.id,
        client_id: clientId
      })
    }

    if (events.length > 0) {
      await supabaseAdmin.from('analytics_events').insert(events)
    }

    return updatedClient
  })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleApiRoute(request, async (req) => {
    const { user } = req
    const { id: clientId } = await params

    // Only owners and admins can delete clients
    if (!['owner', 'admin'].includes(user.role)) {
      throw new Error('Insufficient permissions')
    }

    // Verify client belongs to user's organization
    const { data: client, error: fetchError } = await supabaseAdmin
      .from('clients')
      .select('id, total_revenue')
      .eq('id', clientId)
      .eq('organization_id', user.organization_id)
      .single()

    if (fetchError || !client) {
      throw new Error('Client not found')
    }

    const { error } = await supabaseAdmin
      .from('clients')
      .delete()
      .eq('id', clientId)

    if (error) {
      throw new Error('Failed to delete client')
    }

    // Log analytics event
    await supabaseAdmin.from('analytics_events').insert({
      organization_id: user.organization_id,
      event_type: 'client',
      event_name: 'client_deleted',
      properties: {
        client_id: clientId,
        total_revenue: client.total_revenue,
        deleted_by: user.id
      },
      user_id: user.id
    })

    return { message: 'Client deleted successfully' }
  }, { allowedRoles: ['owner', 'admin'] })
}