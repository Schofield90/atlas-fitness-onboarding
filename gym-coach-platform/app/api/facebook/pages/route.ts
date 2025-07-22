import { NextRequest } from 'next/server'
import { handleApiRoute, supabaseAdmin } from '@/lib/api/middleware'

export async function GET(request: NextRequest) {
  return handleApiRoute(request, async (req) => {
    const { user } = req

    // Get all Facebook pages for the organization
    const { data: pages, error } = await supabaseAdmin
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
        updated_at,
        facebook_integrations!inner(
          id,
          facebook_user_name,
          facebook_user_email,
          is_active,
          last_sync_at
        )
      `)
      .eq('organization_id', user.organization_id)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error('Failed to fetch Facebook pages')
    }

    return { pages }
  })
}

export async function POST(request: NextRequest) {
  return handleApiRoute(request, async (req) => {
    const { user } = req
    const body = await request.json()
    const { action, page_id, is_active, is_primary } = body

    switch (action) {
      case 'toggle_active':
        return await togglePageActive(user.organization_id, page_id, is_active)
      
      case 'set_primary':
        return await setPrimaryPage(user.organization_id, page_id)
      
      case 'refresh_pages':
        return await refreshPages(user.organization_id)
      
      default:
        throw new Error('Invalid action')
    }
  })
}

async function togglePageActive(organizationId: string, pageId: string, isActive: boolean) {
  const { data: page, error } = await supabaseAdmin
    .from('facebook_pages')
    .update({
      is_active: isActive,
      updated_at: new Date().toISOString()
    })
    .eq('id', pageId)
    .eq('organization_id', organizationId)
    .select()
    .single()

  if (error) {
    throw new Error('Failed to update page status')
  }

  // Log analytics event
  await supabaseAdmin.from('analytics_events').insert({
    organization_id: organizationId,
    event_type: 'facebook',
    event_name: 'page_status_changed',
    properties: {
      page_id: pageId,
      facebook_page_id: page.facebook_page_id,
      is_active: isActive
    }
  })

  return { page, message: `Page ${isActive ? 'activated' : 'deactivated'} successfully` }
}

async function setPrimaryPage(organizationId: string, pageId: string) {
  // First, remove primary status from all pages
  await supabaseAdmin
    .from('facebook_pages')
    .update({ is_primary: false })
    .eq('organization_id', organizationId)

  // Then set the specified page as primary
  const { data: page, error } = await supabaseAdmin
    .from('facebook_pages')
    .update({
      is_primary: true,
      is_active: true, // Auto-activate the primary page
      updated_at: new Date().toISOString()
    })
    .eq('id', pageId)
    .eq('organization_id', organizationId)
    .select()
    .single()

  if (error) {
    throw new Error('Failed to set primary page')
  }

  // Log analytics event
  await supabaseAdmin.from('analytics_events').insert({
    organization_id: organizationId,
    event_type: 'facebook',
    event_name: 'primary_page_changed',
    properties: {
      page_id: pageId,
      facebook_page_id: page.facebook_page_id,
      page_name: page.page_name
    }
  })

  return { page, message: 'Primary page set successfully' }
}

async function refreshPages(organizationId: string) {
  // Get the active Facebook integration
  const { data: integration, error: integrationError } = await supabaseAdmin
    .from('facebook_integrations')
    .select('id, access_token, facebook_user_id')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .single()

  if (integrationError || !integration) {
    throw new Error('No active Facebook integration found')
  }

  try {
    // Fetch pages from Facebook
    const pagesUrl = `https://graph.facebook.com/v18.0/me/accounts?` +
      `fields=id,name,access_token,category,category_list,perms&` +
      `access_token=${integration.access_token}`

    const response = await fetch(pagesUrl)
    const pagesData = await response.json()

    if (pagesData.error) {
      throw new Error(`Facebook API error: ${pagesData.error.message}`)
    }

    if (!pagesData.data || pagesData.data.length === 0) {
      return { pages: [], message: 'No pages found' }
    }

    // Upsert pages to database
    const pageInserts = pagesData.data.map((page: any) => ({
      integration_id: integration.id,
      organization_id: organizationId,
      facebook_page_id: page.id,
      page_name: page.name,
      page_category: page.category,
      access_token: page.access_token,
      token_expires_at: null, // Page tokens typically don't expire
      is_active: true,
      page_info: {
        category_list: page.category_list || [],
        permissions: page.perms || []
      },
      permissions: page.perms || []
    }))

    const { data: upsertedPages, error: upsertError } = await supabaseAdmin
      .from('facebook_pages')
      .upsert(pageInserts, {
        onConflict: 'organization_id,facebook_page_id'
      })
      .select()

    if (upsertError) {
      throw new Error('Failed to save pages to database')
    }

    // Update integration sync time
    await supabaseAdmin
      .from('facebook_integrations')
      .update({
        last_sync_at: new Date().toISOString()
      })
      .eq('id', integration.id)

    // Log analytics event
    await supabaseAdmin.from('analytics_events').insert({
      organization_id: organizationId,
      event_type: 'facebook',
      event_name: 'pages_refreshed',
      properties: {
        pages_count: upsertedPages?.length || 0,
        integration_id: integration.id
      }
    })

    return { 
      pages: upsertedPages, 
      message: `Successfully refreshed ${upsertedPages?.length || 0} pages` 
    }

  } catch (error) {
    console.error('Error refreshing Facebook pages:', error)
    throw new Error('Failed to refresh pages from Facebook')
  }
}