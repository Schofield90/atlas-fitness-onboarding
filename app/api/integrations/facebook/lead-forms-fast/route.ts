import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { getCurrentUserOrganization } from '@/app/lib/organization-server'

export const runtime = 'nodejs'

// Faster version that only gets essential info
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pageId = searchParams.get('pageId')
    const checkSaved = searchParams.get('checkSaved') === 'true'
    
    // Special mode to check saved forms in database
    if (checkSaved) {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
      }
      
      const { organizationId } = await getCurrentUserOrganization()
      if (!organizationId) {
        return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
      }
      
      // Get all saved forms for this organization
      const { data: savedForms, error } = await supabase
        .from('facebook_lead_forms')
        .select('*')
        .eq('organization_id', organizationId)
      
      return NextResponse.json({
        organizationId,
        totalSavedForms: savedForms?.length || 0,
        savedForms: savedForms || [],
        error: error?.message
      })
    }
    
    if (!pageId) {
      return NextResponse.json({ error: 'Page ID required' }, { status: 400 })
    }

    // Get access token from database
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    const { organizationId, error: orgError } = await getCurrentUserOrganization()
    
    if (orgError || !organizationId) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }
    
    // Get Facebook integration from database
    const { data: integration } = await supabase
      .from('facebook_integrations')
      .select('access_token')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .single()
    
    if (!integration?.access_token) {
      return NextResponse.json({ error: 'Facebook not connected' }, { status: 401 })
    }
    
    // Get page access token from database
    const { data: dbPage } = await supabase
      .from('facebook_pages')
      .select('access_token, page_name')
      .eq('facebook_page_id', pageId)
      .eq('organization_id', organizationId)
      .single()
    
    const pageAccessToken = dbPage?.access_token || integration.access_token
    const pageName = dbPage?.page_name || 'Unknown Page'
    
    console.log(`📋 Fast-fetching forms for page: ${pageId} (${pageName})`)
    
    // Get forms list - just basic info for speed
    const formsResponse = await fetch(
      `https://graph.facebook.com/v18.0/${pageId}/leadgen_forms?` +
      `fields=id,name,status,created_time&` +
      `limit=100&` +
      `access_token=${pageAccessToken}`
    )
    
    const formsData = await formsResponse.json()
    
    if (formsData.error) {
      console.error(`❌ Forms API Error:`, formsData.error)
      return NextResponse.json({
        error: 'Failed to fetch forms',
        details: formsData.error.message,
        forms: []
      }, { status: 400 })
    }
    
    // Process forms quickly without extra API calls
    const forms = (formsData.data || []).map((form: any) => ({
      id: form.id,
      name: form.name || 'Untitled Form',
      status: form.status || 'UNKNOWN',
      created_time: form.created_time,
      created_time_formatted: form.created_time ? 
        new Date(form.created_time).toLocaleDateString('en-GB', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }) : 'Unknown',
      leads_count: 'Check in Facebook', // Don't fetch to save time
      questions_count: 0, // Don't fetch to save time
      pageId,
      pageName,
      is_active: form.status === 'ACTIVE',
      can_access_leads: true, // Assume yes to save time
    }))
    
    console.log(`✅ Fetched ${forms.length} forms quickly`)
    
    return NextResponse.json({ 
      success: true,
      forms,
      summary: {
        total_forms: forms.length,
        active_forms: forms.filter((f: any) => f.is_active).length,
      }
    })

  } catch (error) {
    console.error('❌ Error in fast lead forms fetch:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch lead forms', 
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
}