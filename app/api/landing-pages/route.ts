import { NextRequest, NextResponse } from 'next/server'
import { checkAuthAndOrganization } from '@/app/lib/api/auth-check-org'
import { createClient } from '@/app/lib/supabase/server'

// GET - List all landing pages for organization
export async function GET(request: NextRequest) {
  const authResult = await checkAuthAndOrganization(request)
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: 401 })
  }

  const { organizationId } = authResult
  const supabase = createClient()

  const { data, error } = await supabase
    .from('landing_pages')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}

// POST - Create new landing page
export async function POST(request: NextRequest) {
  const authResult = await checkAuthAndOrganization(request)
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: 401 })
  }

  const { user, organizationId } = authResult
  const body = await request.json()
  const supabase = createClient()

  const landingPage = {
    organization_id: organizationId,
    name: body.name,
    slug: body.slug || body.name.toLowerCase().replace(/\s+/g, '-'),
    title: body.title,
    description: body.description,
    content: body.content || [],
    styles: body.styles || {},
    settings: body.settings || {},
    meta_title: body.meta_title,
    meta_description: body.meta_description,
    status: 'draft',
    created_by: user.id,
    updated_by: user.id
  }

  const { data, error } = await supabase
    .from('landing_pages')
    .insert(landingPage)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data }, { status: 201 })
}