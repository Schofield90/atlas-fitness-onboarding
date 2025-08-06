import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { getCurrentUserOrganization } from '@/app/lib/organization-server'
import MetaAdsClient from '@/app/lib/integrations/meta-ads-client'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { organizationId } = await getCurrentUserOrganization()
    
    if (!organizationId) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 })
    }

    const body = await request.json()
    const { pageId, forceRefresh = false } = body

    if (!pageId) {
      return NextResponse.json({ error: 'pageId is required' }, { status: 400 })
    }

    // Get Meta client
    const metaClient = await MetaAdsClient.createFromIntegration(organizationId)
    if (!metaClient) {
      return NextResponse.json({ 
        error: 'Meta integration not found. Please connect your Facebook account first.' 
      }, { status: 400 })
    }

    // Get the page record from database
    const { data: pageRecord, error: pageError } = await supabase
      .from('facebook_pages')
      .select('id, facebook_page_id, page_name')
      .eq('organization_id', organizationId)
      .eq('id', pageId)
      .eq('is_active', true)
      .single()

    if (pageError || !pageRecord) {
      return NextResponse.json({ error: 'Page not found or inactive' }, { status: 404 })
    }

    // Check if we need to sync (avoid too frequent syncing unless forced)
    if (!forceRefresh) {
      const { data: lastSync } = await supabase
        .from('facebook_lead_forms')
        .select('last_sync_at')
        .eq('organization_id', organizationId)
        .eq('page_id', pageId)
        .order('last_sync_at', { ascending: false })
        .limit(1)
        .single()

      if (lastSync?.last_sync_at) {
        const lastSyncTime = new Date(lastSync.last_sync_at)
        const now = new Date()
        const diffMinutes = (now.getTime() - lastSyncTime.getTime()) / (1000 * 60)
        
        if (diffMinutes < 5) { // Don't sync more than once every 5 minutes
          return NextResponse.json({ 
            message: 'Forms were recently synced. Use forceRefresh=true to override.',
            lastSyncAt: lastSync.last_sync_at
          })
        }
      }
    }

    // Fetch lead forms from Meta API
    const leadForms = await metaClient.getPageLeadForms(pageRecord.facebook_page_id)
    
    if (!leadForms || leadForms.length === 0) {
      return NextResponse.json({ 
        message: `No lead forms found for page: ${pageRecord.page_name}`,
        forms: []
      })
    }

    // Sync lead forms to database
    const syncResults = []
    
    for (const form of leadForms) {
      try {
        const { error: formError } = await supabase
          .from('facebook_lead_forms')
          .upsert({
            page_id: pageRecord.id,
            organization_id: organizationId,
            facebook_form_id: form.id,
            form_name: form.name,
            status: form.status || 'active',
            questions: form.questions || [],
            is_active: form.status === 'ACTIVE',
            last_sync_at: new Date().toISOString()
          }, {
            onConflict: 'organization_id,facebook_form_id'
          })

        if (formError) {
          console.error(`Failed to sync form ${form.id}:`, formError)
          syncResults.push({
            formId: form.id,
            formName: form.name,
            status: 'error',
            error: formError.message
          })
        } else {
          syncResults.push({
            formId: form.id,
            formName: form.name,
            status: 'success',
            formStatus: form.status
          })
        }
      } catch (error: any) {
        console.error(`Error syncing form ${form.id}:`, error)
        syncResults.push({
          formId: form.id,
          formName: form.name,
          status: 'error',
          error: error.message
        })
      }
    }

    const successCount = syncResults.filter(r => r.status === 'success').length
    const errorCount = syncResults.filter(r => r.status === 'error').length

    return NextResponse.json({
      success: true,
      message: `Synced ${successCount} lead forms successfully for ${pageRecord.page_name}, ${errorCount} errors`,
      pageName: pageRecord.page_name,
      results: syncResults,
      summary: {
        totalForms: leadForms.length,
        successful: successCount,
        errors: errorCount
      }
    })

  } catch (error: any) {
    console.error('Lead forms sync error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to sync lead forms',
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

    const { searchParams } = new URL(request.url)
    const pageId = searchParams.get('pageId')

    let query = supabase
      .from('facebook_lead_forms')
      .select(`
        id,
        facebook_form_id,
        form_name,
        status,
        questions,
        is_active,
        last_sync_at,
        created_at,
        facebook_pages (
          page_name,
          facebook_page_id
        )
      `)
      .eq('organization_id', organizationId)

    if (pageId) {
      query = query.eq('page_id', pageId)
    }

    const { data: forms, error } = await query
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch lead forms' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      forms: forms || [],
      count: forms?.length || 0
    })

  } catch (error: any) {
    console.error('Get lead forms error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch lead forms' },
      { status: 500 }
    )
  }
}