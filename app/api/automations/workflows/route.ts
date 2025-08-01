import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { getCurrentUserOrganization } from '@/app/lib/services/membership-service'

export async function GET() {
  try {
    const { organizationId, error: orgError } = await getCurrentUserOrganization()
    if (orgError || !organizationId) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('workflows')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching workflows:', error)
      return NextResponse.json({ error: 'Failed to fetch workflows' }, { status: 500 })
    }

    return NextResponse.json({ workflows: data || [] })
  } catch (error) {
    console.error('Error in GET /api/automations/workflows:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { organizationId, error: orgError } = await getCurrentUserOrganization()
    if (orgError || !organizationId) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const body = await request.json()
    const supabase = await createClient()
    
    // Prepare workflow data
    const workflowData = {
      organization_id: organizationId,
      name: body.name || 'New Workflow',
      description: body.description || '',
      status: body.status || 'draft',
      nodes: body.nodes || [],
      edges: body.edges || [],
      variables: body.variables || {},
      trigger_type: body.trigger_type,
      trigger_config: body.trigger_config || {},
      settings: body.settings || {}
    }

    const { data, error } = await supabase
      .from('workflows')
      .insert(workflowData)
      .select()
      .single()

    if (error) {
      console.error('Error creating workflow:', error)
      return NextResponse.json({ error: 'Failed to create workflow' }, { status: 500 })
    }

    return NextResponse.json({ workflow: data })
  } catch (error) {
    console.error('Error in POST /api/automations/workflows:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}