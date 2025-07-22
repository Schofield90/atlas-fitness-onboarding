import { NextRequest } from 'next/server'
import { handleApiRoute, supabaseAdmin } from '@/lib/api/middleware'

interface FacebookLeadData {
  id: string
  created_time: string
  field_data: Array<{
    name: string
    values: string[]
  }>
}

interface FacebookLeadsResponse {
  data: FacebookLeadData[]
  paging?: {
    next?: string
  }
}

export async function POST(request: NextRequest) {
  return handleApiRoute(request, async (req) => {
    const { user } = req
    const body = await request.json()
    const { pageId } = body

    // Get the Facebook page with integration details
    const { data: page, error: pageError } = await supabaseAdmin
      .from('facebook_pages')
      .select(`
        *,
        facebook_integrations!inner (
          access_token,
          is_active
        )
      `)
      .eq('id', pageId)
      .eq('organization_id', user.organization_id)
      .eq('is_active', true)
      .single()

    if (pageError || !page) {
      throw new Error('Facebook page not found or inactive')
    }

    if (!page.facebook_integrations.is_active) {
      throw new Error('Facebook integration is not active')
    }

    // Get lead forms for this page
    const leadFormsResponse = await fetch(
      `https://graph.facebook.com/v18.0/${page.facebook_page_id}/leadgen_forms?access_token=${page.page_access_token}`
    )

    if (!leadFormsResponse.ok) {
      throw new Error('Failed to fetch lead forms from Facebook')
    }

    const leadFormsData = await leadFormsResponse.json()
    const syncResults = {
      formsProcessed: 0,
      leadsProcessed: 0,
      newLeads: 0,
      errors: [] as string[]
    }

    // Process each lead form
    for (const form of leadFormsData.data || []) {
      syncResults.formsProcessed++

      // Store or update lead form
      const { data: leadForm, error: formError } = await supabaseAdmin
        .from('facebook_lead_forms')
        .upsert({
          page_id: pageId,
          organization_id: user.organization_id,
          facebook_form_id: form.id,
          form_name: form.name,
          form_status: form.status || 'active',
          privacy_policy_url: form.privacy_policy_url,
          questions: form.questions || []
        }, {
          onConflict: 'organization_id,facebook_form_id'
        })
        .select()
        .single()

      if (formError) {
        syncResults.errors.push(`Failed to store form ${form.name}: ${formError.message}`)
        continue
      }

      // Fetch leads for this form
      try {
        const leadsResponse = await fetch(
          `https://graph.facebook.com/v18.0/${form.id}/leads?access_token=${page.page_access_token}`
        )

        if (!leadsResponse.ok) {
          syncResults.errors.push(`Failed to fetch leads for form ${form.name}`)
          continue
        }

        const leadsData: FacebookLeadsResponse = await leadsResponse.json()

        // Process each lead
        for (const lead of leadsData.data || []) {
          syncResults.leadsProcessed++

          // Convert field_data to a more usable format
          const leadDataMap: Record<string, string> = {}
          for (const field of lead.field_data) {
            leadDataMap[field.name] = field.values.join(', ')
          }

          // Check if lead already exists
          const { data: existingLead } = await supabaseAdmin
            .from('facebook_leads')
            .select('id')
            .eq('organization_id', user.organization_id)
            .eq('facebook_lead_id', lead.id)
            .single()

          if (!existingLead) {
            // Store new Facebook lead
            const { data: newFbLead, error: leadError } = await supabaseAdmin
              .from('facebook_leads')
              .insert({
                organization_id: user.organization_id,
                form_id: leadForm.id,
                page_id: pageId,
                facebook_lead_id: lead.id,
                lead_data: leadDataMap,
                facebook_created_time: lead.created_time,
                processed: false
              })
              .select()
              .single()

            if (!leadError && newFbLead) {
              syncResults.newLeads++

              // Auto-convert to main lead if enabled
              if (page.auto_sync_leads) {
                try {
                  const { data: convertedLead, error: convertError } = await supabaseAdmin
                    .rpc('convert_facebook_lead', { facebook_lead_id: newFbLead.id })

                  if (convertError) {
                    syncResults.errors.push(`Failed to convert lead ${lead.id}: ${convertError.message}`)
                  } else {
                    // Update Facebook lead with converted lead ID
                    await supabaseAdmin
                      .from('facebook_leads')
                      .update({ 
                        processed: true,
                        converted_lead_id: convertedLead
                      })
                      .eq('id', newFbLead.id)
                  }
                } catch (error) {
                  syncResults.errors.push(`Error converting lead ${lead.id}: ${error}`)
                }
              }
            }
          }
        }

        // Update lead count for the form
        const { count } = await supabaseAdmin
          .from('facebook_leads')
          .select('*', { count: 'exact', head: true })
          .eq('form_id', leadForm.id)

        await supabaseAdmin
          .from('facebook_lead_forms')
          .update({ leads_count: count || 0 })
          .eq('id', leadForm.id)

      } catch (error) {
        syncResults.errors.push(`Error processing form ${form.name}: ${error}`)
      }
    }

    // Update last synced timestamp
    await supabaseAdmin
      .from('facebook_pages')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('id', pageId)

    return {
      success: true,
      results: syncResults
    }
  })
}