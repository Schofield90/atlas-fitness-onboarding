import { NextRequest, NextResponse } from 'next/server'
import { checkAuthAndOrganization } from '@/app/lib/api/auth-check-org'
import { createClient } from '@/app/lib/supabase/server'

// POST - Publish landing page
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await checkAuthAndOrganization(request)
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: 401 })
  }

  const { user, organizationId } = authResult
  const supabase = createClient()

  const updates = {
    status: 'published',
    published_at: new Date().toISOString(),
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

  return NextResponse.json({ 
    data,
    publicUrl: `/l/${data.slug}`
  })
}

// DELETE - Unpublish landing page
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await checkAuthAndOrganization(request)
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: 401 })
  }

  const { user, organizationId } = authResult
  const supabase = createClient()

  const updates = {
    status: 'draft',
    unpublished_at: new Date().toISOString(),
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