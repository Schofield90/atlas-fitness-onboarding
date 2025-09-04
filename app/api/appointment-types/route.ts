import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Resolve user's organization (with robust fallbacks to match Settings page behavior)
    let organizationId: string | null = null

    // Try organization_members (primary source in multi-tenant schema)
    const { data: orgMember } = await supabase
      .from('organization_members')
      .select('org_id')
      .eq('user_id', user.id)
      .single()

    if (orgMember?.org_id) {
      organizationId = orgMember.org_id as string
    }

    // Fallback 1: users table may have organization_id on some deployments
    if (!organizationId) {
      const { data: userRow } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', user.id)
        .single()

      if (userRow?.organization_id) {
        organizationId = userRow.organization_id as string
      }
    }

    // Fallback 2: known default org (align with AppointmentTypesManager.tsx)
    if (!organizationId) {
      organizationId = process.env.DEFAULT_ORGANIZATION_ID || '63589490-8f55-4157-bd3a-e141594b748e'
    }

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const { data: appointmentTypes, error } = await supabase
      .from('appointment_types')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('name')

    if (error) {
      throw new Error(`Failed to fetch appointment types: ${error.message}`)
    }

    return NextResponse.json({ appointment_types: appointmentTypes || [] })

  } catch (error) {
    console.error('Error fetching appointment types:', error)
    return NextResponse.json(
      { error: 'Failed to fetch appointment types' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: orgMember, error: orgError } = await supabase
      .from('organization_members')
      .select('org_id')
      .eq('user_id', user.id)
      .single()

    if (orgError || !orgMember) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const body = await request.json()
    
    const { data: appointmentType, error } = await supabase
      .from('appointment_types')
      .insert({
        ...body,
        organization_id: orgMember.org_id,
        user_id: user.id
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create appointment type: ${error.message}`)
    }

    return NextResponse.json({ appointment_type: appointmentType }, { status: 201 })

  } catch (error) {
    console.error('Error creating appointment type:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create appointment type' },
      { status: 500 }
    )
  }
}