import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { getCurrentUserOrganization } from '@/app/lib/organization-server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    const { organizationId, error: orgError } = await getCurrentUserOrganization()
    
    if (orgError || !organizationId) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // First check if we have a Facebook integration
    const { data: integration } = await supabase
      .from('facebook_integrations')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .single()

    if (!integration) {
      // No integration found, return empty pages
      return NextResponse.json({
        pages: [],
        hasConnection: false,
        message: 'No Facebook integration found. Please connect your Facebook account first.'
      })
    }

    // Fetch Facebook pages for the organization
    const { data: pages, error } = await supabase
      .from('facebook_pages')
      .select(`
        id,
        facebook_page_id,
        page_name,
        access_token,
        is_active,
        is_primary,
        lead_forms:facebook_lead_forms(
          id,
          facebook_form_id,
          form_name,
          is_active,
          last_sync_at
        )
      `)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('is_primary', { ascending: false })
      .order('page_name')

    if (error) {
      console.error('Error fetching Facebook pages:', error)
      return NextResponse.json({ error: `Failed to fetch pages: ${error.message}` }, { status: 500 })
    }

    // Transform data for the frontend
    const transformedPages = pages?.map(page => ({
      id: page.facebook_page_id,
      name: page.page_name,
      forms: page.lead_forms?.filter((form: any) => form.is_active) || []
    })) || []

    return NextResponse.json({
      pages: transformedPages,
      hasConnection: pages && pages.length > 0
    })
  } catch (error) {
    console.error('Error in GET /api/integrations/facebook/pages:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Create or update Facebook pages
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { organizationId, error: orgError } = await getCurrentUserOrganization()
    
    if (orgError || !organizationId) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const body = await request.json()
    const { pages, integrationId } = body

    if (!pages || !Array.isArray(pages)) {
      return NextResponse.json({ error: 'Invalid pages data' }, { status: 400 })
    }

    // Upsert pages
    const upsertData = pages.map(page => ({
      organization_id: organizationId,
      integration_id: integrationId,
      facebook_page_id: page.id,
      page_name: page.name,
      access_token: page.access_token,
      is_active: true,
      is_primary: page.is_primary || false
    }))

    const { data, error } = await supabase
      .from('facebook_pages')
      .upsert(upsertData, {
        onConflict: 'organization_id,facebook_page_id'
      })
      .select()

    if (error) {
      console.error('Error upserting Facebook pages:', error)
      return NextResponse.json({ error: 'Failed to save pages' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      pages: data,
      message: `Successfully saved ${data.length} pages`
    })
  } catch (error) {
    console.error('Error in POST /api/integrations/facebook/pages:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}