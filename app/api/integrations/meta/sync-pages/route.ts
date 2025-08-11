import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { getCurrentUserOrganization } from '@/app/lib/organization-server'
import MetaAdsClient from '@/app/lib/integrations/meta-ads-client'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { organizationId } = await getCurrentUserOrganization()
    
    if (!organizationId) {
      // Try to get the user and provide more helpful error
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
      }
      
      return NextResponse.json({ 
        error: 'No organization found', 
        details: 'Your user account is not associated with an organization. Please visit /fix-organization to resolve this.',
        user_id: user.id
      }, { status: 400 })
    }

    // Get Meta client for this organization
    const metaClient = await MetaAdsClient.createFromIntegration(organizationId)
    if (!metaClient) {
      return NextResponse.json({ 
        error: 'Meta integration not found. Please connect your Facebook account first.' 
      }, { status: 400 })
    }

    // Get integration record
    const { data: integration } = await supabase
      .from('facebook_integrations')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .single()

    if (!integration) {
      return NextResponse.json({ error: 'Active integration not found' }, { status: 400 })
    }

    // Fetch pages from Meta API
    console.log('🔄 Fetching pages from Meta API...')
    let pages = []
    
    try {
      pages = await metaClient.getPages()
      console.log(`✅ Meta API returned ${pages?.length || 0} pages`)
    } catch (apiError: any) {
      console.error('❌ Meta API error:', apiError)
      return NextResponse.json({ 
        error: 'Failed to fetch pages from Facebook',
        details: apiError.message,
        code: apiError.code || 'UNKNOWN',
        type: apiError.type
      }, { status: 500 })
    }
    
    if (!pages || pages.length === 0) {
      console.log('⚠️ No pages found - user may not have page admin permissions')
      return NextResponse.json({ 
        message: 'No pages found or user has no page access permissions',
        pages: []
      })
    }

    // Sync pages to database
    const syncResults = []
    
    for (const page of pages) {
      try {
        const { error: pageError } = await supabase
          .from('facebook_pages')
          .upsert({
            integration_id: integration.id,
            organization_id: organizationId,
            facebook_page_id: page.id,
            page_name: page.name,
            page_username: page.username || null,
            page_category: page.category || null,
            access_token: page.access_token,
            token_expires_at: null, // Page tokens typically don't expire
            is_active: true,
            page_info: {
              category: page.category,
              username: page.username,
              tasks: page.tasks || []
            },
            permissions: page.tasks || []
          }, {
            onConflict: 'organization_id,facebook_page_id'
          })

        if (pageError) {
          console.error(`Failed to sync page ${page.id}:`, pageError)
          syncResults.push({
            pageId: page.id,
            pageName: page.name,
            status: 'error',
            error: pageError.message
          })
        } else {
          syncResults.push({
            pageId: page.id,
            pageName: page.name,
            status: 'success'
          })
        }
      } catch (error: any) {
        console.error(`Error syncing page ${page.id}:`, error)
        syncResults.push({
          pageId: page.id,
          pageName: page.name,
          status: 'error',
          error: error.message
        })
      }
    }

    const successCount = syncResults.filter(r => r.status === 'success').length
    const errorCount = syncResults.filter(r => r.status === 'error').length

    // Update integration last sync time
    await supabase
      .from('facebook_integrations')
      .update({ 
        last_sync_at: new Date().toISOString(),
        settings: { last_pages_sync: new Date().toISOString() }
      })
      .eq('organization_id', organizationId)
      .eq('is_active', true)

    return NextResponse.json({
      success: true,
      message: `Synced ${successCount} pages successfully, ${errorCount} errors`,
      results: syncResults,
      summary: {
        totalPages: pages.length,
        successful: successCount,
        errors: errorCount
      }
    })

  } catch (error: any) {
    console.error('Pages sync error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to sync pages',
        details: error.message,
        code: error.code || 'UNKNOWN_ERROR'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { organizationId } = await getCurrentUserOrganization()
    
    if (!organizationId) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 })
    }

    // Get synced pages from database
    const { data: pages, error } = await supabase
      .from('facebook_pages')
      .select(`
        id,
        facebook_page_id,
        page_name,
        page_username,
        page_category,
        is_active,
        is_primary,
        page_info,
        permissions,
        created_at,
        updated_at
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch pages' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      pages: pages || [],
      count: pages?.length || 0
    })

  } catch (error: any) {
    console.error('Get pages error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pages' },
      { status: 500 }
    )
  }
}