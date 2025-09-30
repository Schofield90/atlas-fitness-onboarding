import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
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

    // Find all test clients
    const { data: testClients, error: clientsError } = await supabase
      .from('clients')
      .select('*')
      .eq('organization_id', userData.organization_id)
      .or('name.ilike.%test%,email.ilike.%test%')

    if (clientsError) {
      return NextResponse.json({
        error: 'Failed to find test clients',
        details: clientsError
      }, { status: 500 })
    }

    // Get all clients for context
    const { data: allClients } = await supabase
      .from('clients')
      .select('id, name, email, created_at')
      .eq('organization_id', userData.organization_id)
      .order('created_at', { ascending: false })
      .limit(10)

    return NextResponse.json({
      test_clients: testClients || [],
      test_clients_count: testClients?.length || 0,
      recent_clients: allClients || [],
      instructions: 'To delete test clients, POST to this endpoint with { client_ids: [...] }'
    })
  } catch (error) {
    console.error('Find test clients error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: String(error)
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization and role
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Only owners and admins can delete clients
    if (!['owner', 'admin'].includes(userData.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { client_ids } = body

    if (!client_ids || !Array.isArray(client_ids)) {
      return NextResponse.json({ error: 'client_ids array required' }, { status: 400 })
    }

    const deleted = []
    for (const clientId of client_ids) {
      // Delete portal access first
      await supabase
        .from('client_portal_access')
        .delete()
        .eq('client_id', clientId)

      // Delete client
      const { error: deleteError } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId)
        .eq('organization_id', userData.organization_id)

      if (deleteError) {
        deleted.push({ client_id: clientId, error: deleteError.message })
      } else {
        deleted.push({ client_id: clientId, success: true })
      }
    }

    return NextResponse.json({
      message: 'Deletion completed',
      results: deleted
    })
  } catch (error) {
    console.error('Delete test clients error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: String(error)
    }, { status: 500 })
  }
}