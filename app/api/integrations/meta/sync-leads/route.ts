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
    const { formId, since, limit = 100 } = body

    if (!formId) {
      return NextResponse.json({ error: 'formId is required' }, { status: 400 })
    }

    // Get Meta client
    const metaClient = await MetaAdsClient.createFromIntegration(organizationId)
    if (!metaClient) {
      return NextResponse.json({ 
        error: 'Meta integration not found. Please connect your Facebook account first.' 
      }, { status: 400 })
    }

    // Get the form record from database
    const { data: formRecord, error: formError } = await supabase
      .from('facebook_lead_forms')
      .select(`
        id,
        facebook_form_id,
        form_name,
        facebook_pages (
          page_name,
          facebook_page_id
        )
      `)
      .eq('organization_id', organizationId)
      .eq('id', formId)
      .eq('is_active', true)
      .single()

    if (formError || !formRecord) {
      return NextResponse.json({ error: 'Lead form not found or inactive' }, { status: 404 })
    }

    // Determine the since date
    let sinceDate: Date | undefined
    if (since) {
      sinceDate = new Date(since)
    } else {
      // Get the most recent lead to avoid duplicates
      const { data: lastLead } = await supabase
        .from('facebook_leads')
        .select('created_at')
        .eq('form_id', formId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (lastLead?.created_at) {
        sinceDate = new Date(lastLead.created_at)
      } else {
        // Default to last 30 days if no previous leads
        sinceDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      }
    }

    // Fetch leads from Meta API
    const leads = await metaClient.getFormLeads(formRecord.facebook_form_id, sinceDate)
    
    if (!leads || leads.length === 0) {
      return NextResponse.json({ 
        message: `No new leads found for form: ${formRecord.form_name}`,
        leads: [],
        since: sinceDate?.toISOString()
      })
    }

    // Process and sync leads to database
    const syncResults = []
    let processedCount = 0
    let duplicateCount = 0
    let errorCount = 0
    
    for (const lead of leads.slice(0, limit)) {
      try {
        // Transform field_data array to a more usable format
        const leadData: any = {}
        if (lead.field_data) {
          for (const field of lead.field_data) {
            const fieldName = field.name?.toLowerCase().replace(/\s+/g, '_') || 'unknown'
            leadData[fieldName] = field.values?.[0] || field.value || null
          }
        }

        // Store raw Facebook lead
        const { data: fbLead, error: fbError } = await supabase
          .from('facebook_leads')
          .insert({
            form_id: formRecord.id,
            organization_id: organizationId,
            facebook_lead_id: lead.id,
            lead_data: {
              ...leadData,
              raw_field_data: lead.field_data,
              created_time: lead.created_time
            },
            processing_status: 'pending'
          })
          .select('id')
          .single()

        if (fbError) {
          if (fbError.code === '23505') { // Unique constraint violation (duplicate)
            duplicateCount++
            syncResults.push({
              leadId: lead.id,
              status: 'duplicate',
              message: 'Lead already exists'
            })
          } else {
            errorCount++
            console.error(`Failed to store Facebook lead ${lead.id}:`, fbError)
            syncResults.push({
              leadId: lead.id,
              status: 'error',
              error: fbError.message
            })
          }
          continue
        }

        // The database trigger will automatically convert this to a CRM lead
        processedCount++
        syncResults.push({
          leadId: lead.id,
          status: 'success',
          facebookLeadId: fbLead?.id,
          leadData: leadData
        })

      } catch (error: any) {
        errorCount++
        console.error(`Error processing lead ${lead.id}:`, error)
        syncResults.push({
          leadId: lead.id,
          status: 'error',
          error: error.message
        })
      }
    }

    // Update form last sync time
    await supabase
      .from('facebook_lead_forms')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', formId)

    return NextResponse.json({
      success: true,
      message: `Processed ${processedCount} new leads, ${duplicateCount} duplicates, ${errorCount} errors`,
      formName: formRecord.form_name,
      pageName: Array.isArray(formRecord.facebook_pages) 
        ? formRecord.facebook_pages[0]?.page_name 
        : (formRecord.facebook_pages as any)?.page_name,
      results: syncResults,
      summary: {
        totalFetched: leads.length,
        processed: processedCount,
        duplicates: duplicateCount,
        errors: errorCount,
        since: sinceDate?.toISOString()
      }
    })

  } catch (error: any) {
    console.error('Leads sync error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to sync leads',
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
    const formId = searchParams.get('formId')
    const status = searchParams.get('status') // pending, processed, failed
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabase
      .from('facebook_leads')
      .select(`
        id,
        facebook_lead_id,
        lead_data,
        processing_status,
        processed_at,
        error_message,
        created_at,
        crm_lead_id,
        facebook_lead_forms (
          form_name,
          facebook_pages (
            page_name
          )
        ),
        leads (
          id,
          name,
          email,
          phone,
          source
        )
      `)
      .eq('organization_id', organizationId)

    if (formId) {
      query = query.eq('form_id', formId)
    }

    if (status) {
      query = query.eq('processing_status', status)
    }

    const { data: leads, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      leads: leads || [],
      count: leads?.length || 0,
      pagination: {
        limit,
        offset,
        hasMore: (leads?.length || 0) === limit
      }
    })

  } catch (error: any) {
    console.error('Get leads error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch leads' },
      { status: 500 }
    )
  }
}