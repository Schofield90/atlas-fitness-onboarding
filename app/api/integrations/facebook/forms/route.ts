import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { getCurrentUserOrganization } from '@/app/lib/organization-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { organizationId, error: orgError } = await getCurrentUserOrganization()
    
    if (orgError || !organizationId) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const pageId = searchParams.get('pageId')

    // Build query
    let query = supabase
      .from('facebook_lead_forms')
      .select(`
        id,
        facebook_form_id,
        form_name,
        form_questions,
        is_active,
        last_sync_at,
        lead_count,
        facebook_pages!inner(
          facebook_page_id,
          page_name
        )
      `)
      .eq('organization_id', organizationId)
      .eq('is_active', true)

    // Filter by page if provided
    if (pageId && pageId !== 'any') {
      query = query.eq('facebook_pages.facebook_page_id', pageId)
    }

    const { data: forms, error } = await query.order('form_name')

    if (error) {
      console.error('Error fetching Facebook forms:', error)
      return NextResponse.json({ error: 'Failed to fetch forms' }, { status: 500 })
    }

    // Transform data for the frontend
    const transformedForms = forms?.map(form => ({
      id: form.facebook_form_id,
      name: form.form_name,
      pageId: form.facebook_pages.facebook_page_id,
      pageName: form.facebook_pages.page_name,
      questions: form.form_questions || [],
      leadCount: form.lead_count || 0,
      lastSync: form.last_sync_at
    })) || []

    return NextResponse.json({
      forms: transformedForms
    })
  } catch (error) {
    console.error('Error in GET /api/integrations/facebook/forms:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Create or update Facebook forms
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { organizationId, error: orgError } = await getCurrentUserOrganization()
    
    if (orgError || !organizationId) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const body = await request.json()
    const { forms, pageId } = body

    if (!forms || !Array.isArray(forms)) {
      return NextResponse.json({ error: 'Invalid forms data' }, { status: 400 })
    }

    // Get the page record
    const { data: page, error: pageError } = await supabase
      .from('facebook_pages')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('facebook_page_id', pageId)
      .single()

    if (pageError || !page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 })
    }

    // Upsert forms
    const upsertData = forms.map(form => ({
      organization_id: organizationId,
      page_id: page.id,
      facebook_form_id: form.id,
      form_name: form.name,
      form_questions: form.questions || [],
      is_active: true
    }))

    const { data, error } = await supabase
      .from('facebook_lead_forms')
      .upsert(upsertData, {
        onConflict: 'organization_id,facebook_form_id'
      })
      .select()

    if (error) {
      console.error('Error upserting Facebook forms:', error)
      return NextResponse.json({ error: 'Failed to save forms' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      forms: data,
      message: `Successfully saved ${data.length} forms`
    })
  } catch (error) {
    console.error('Error in POST /api/integrations/facebook/forms:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}