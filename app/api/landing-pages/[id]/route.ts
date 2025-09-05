import { NextRequest, NextResponse } from 'next/server'
import { checkAuthAndOrganization } from '@/app/lib/api/auth-check-org'
import { createClient } from '@/app/lib/supabase/server'

// GET - Get single landing page
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await checkAuthAndOrganization(request)
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: 401 })
  }

  const { organizationId } = authResult
  const supabase = createClient()

  const { data, error } = await supabase
    .from('landing_pages')
    .select('*')
    .eq('id', params.id)
    .eq('organization_id', organizationId)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 })
  }

  return NextResponse.json({ data })
}

// PUT - Update landing page
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await checkAuthAndOrganization(request)
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: 401 })
  }

  const { user, organizationId } = authResult
  const body = await request.json()
  const supabase = createClient()

  const updates = {
    name: body.name,
    slug: body.slug,
    title: body.title,
    description: body.description,
    content: body.content,
    styles: body.styles,
    settings: body.settings,
    meta_title: body.meta_title,
    meta_description: body.meta_description,
    updated_by: user.id,
    updated_at: new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('landing_pages')
    .update(updates)
    .eq('id', params.id)
    .eq('organization_id', organizationId)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}

// DELETE - Delete landing page
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await checkAuthAndOrganization(request)
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: 401 })
  }

  const { organizationId } = authResult
  const supabase = createClient()

  const { error } = await supabase
    .from('landing_pages')
    .delete()
    .eq('id', params.id)
    .eq('organization_id', organizationId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}