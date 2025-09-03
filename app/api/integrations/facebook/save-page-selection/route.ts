import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { getCurrentUserOrganization } from '@/app/lib/organization-server'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { pageId, organizationId: requestOrgId } = body
    
    if (!pageId) {
      return NextResponse.json({ error: 'Page ID is required' }, { status: 400 })
    }
    
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    const { organizationId, error: orgError } = await getCurrentUserOrganization()
    
    if (orgError || !organizationId) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }
    
    // Get the Facebook integration
    const { data: integration } = await supabase
      .from('facebook_integrations')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .single()
    
    if (!integration) {
      return NextResponse.json({ error: 'Facebook integration not found' }, { status: 404 })
    }
    
    // First, unset any existing primary pages
    await supabase
      .from('facebook_pages')
      .update({ is_primary: false })
      .eq('integration_id', integration.id)
    
    // Then set the selected page as primary
    const { error: updateError } = await supabase
      .from('facebook_pages')
      .update({ 
        is_primary: true,
        updated_at: new Date().toISOString()
      })
      .eq('integration_id', integration.id)
      .eq('facebook_page_id', pageId)
    
    if (updateError) {
      console.error('Error updating primary page:', updateError)
      return NextResponse.json(
        { error: 'Failed to save page selection' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'Page selection saved'
    })
    
  } catch (error) {
    console.error('Error saving page selection:', error)
    return NextResponse.json(
      { error: 'Failed to save page selection' },
      { status: 500 }
    )
  }
}