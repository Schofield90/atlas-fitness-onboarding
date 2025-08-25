import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { getCurrentUserOrganization } from '@/app/lib/organization-server'
import { leadsDB } from '@/app/lib/leads-store'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { formId, formName, pageId } = body
    
    if (!formId) {
      return NextResponse.json({ error: 'Form ID is required' }, { status: 400 })
    }
    
    // Get access token from database instead of cookies
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
    const { data: integration, error: intError } = await supabase
      .from('facebook_integrations')
      .select('access_token, facebook_user_id')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .single()
    
    if (intError || !integration || !integration.access_token) {
      console.log('⚠️ No active Facebook integration found')
      return NextResponse.json(
        { error: 'Facebook not connected' }, 
        { status: 401 }
      )
    }
    
    const storedAccessToken = integration.access_token
    
    console.log(`🔄 Syncing leads from form: ${formId} (${formName})`)
    
    try {
      // Get page token from database if we have pageId
      let accessToken = storedAccessToken
      
      if (pageId) {
        const { data: dbPage } = await supabase
          .from('facebook_pages')
          .select('access_token')
          .eq('organization_id', organizationId)
          .eq('facebook_page_id', pageId)
          .single()
        
        if (dbPage?.access_token) {
          accessToken = dbPage.access_token
          console.log('🔐 Using page access token from database')
        }
      }
      
      // Get all leads from this form
      const allLeads = []
      let nextUrl = `https://graph.facebook.com/v18.0/${formId}/leads?access_token=${accessToken}`
      
      // Handle pagination
      while (nextUrl) {
        const response = await fetch(nextUrl)
        const data = await response.json()
        
        if (data.error) {
          console.error('Error fetching leads:', data.error)
          return NextResponse.json({ 
            success: false, 
            error: data.error.message,
            error_code: data.error.code
          }, { status: 400 })
        }
        
        if (data.data) {
          // For each lead, get full details
          for (const lead of data.data) {
            try {
              const leadDetailResponse = await fetch(
                `https://graph.facebook.com/v18.0/${lead.id}?access_token=${accessToken}`
              )
              const leadDetails = await leadDetailResponse.json()
              
              // Extract field data
              const fields: Record<string, string> = {}
              let fullName = ''
              let email = ''
              let phone = ''
              
              leadDetails.field_data?.forEach((field: any) => {
                const value = field.values?.[0] || ''
                fields[field.name] = value
                
                // Common field mappings
                const fieldNameLower = field.name.toLowerCase()
                if (fieldNameLower.includes('name') && !fieldNameLower.includes('last')) {
                  fullName = value
                } else if (fieldNameLower === 'full_name') {
                  fullName = value
                } else if (fieldNameLower.includes('email')) {
                  email = value
                } else if (fieldNameLower.includes('phone') || fieldNameLower.includes('mobile')) {
                  phone = value
                }
              })
              
              // If no full name, try to combine first and last
              if (!fullName && (fields.first_name || fields.last_name)) {
                fullName = `${fields.first_name || ''} ${fields.last_name || ''}`.trim()
              }
              
              allLeads.push({
                facebook_lead_id: lead.id,
                form_id: formId,
                form_name: formName,
                created_time: leadDetails.created_time,
                name: fullName || 'Unknown',
                email: email || fields.email || 'Not provided',
                phone: phone || fields.phone_number || fields.phone || 'Not provided',
                fields,
                campaign_id: leadDetails.campaign_id,
                campaign_name: leadDetails.campaign_name,
                ad_id: leadDetails.ad_id,
                ad_name: leadDetails.ad_name,
                adset_id: leadDetails.adset_id,
                adset_name: leadDetails.adset_name,
                is_organic: leadDetails.is_organic || false
              })
            } catch (error) {
              console.error(`Error fetching lead ${lead.id}:`, error)
            }
          }
        }
        
        // Check for next page
        nextUrl = data.paging?.next || null
      }
      
      // Save all leads to database
      let savedCount = 0
      let skippedCount = 0
      const saveErrors = []
      
      for (const lead of allLeads) {
        try {
          // Check if lead already exists
          const { data: existingLead } = await supabase
            .from('leads')
            .select('id')
            .eq('organization_id', organizationId)
            .eq('facebook_lead_id', lead.facebook_lead_id)
            .single()
          
          if (existingLead) {
            skippedCount++
            continue
          }
          
          // Create new lead
          const { error: insertError } = await supabase
            .from('leads')
            .insert({
              organization_id: organizationId,
              name: lead.name,
              email: lead.email,
              phone: lead.phone,
              source: 'facebook',
              status: 'new',
              facebook_lead_id: lead.facebook_lead_id,
              facebook_form_id: lead.form_id,
              metadata: {
                form_name: lead.form_name,
                page_id: pageId || null,
                campaign_id: lead.campaign_id,
                campaign_name: lead.campaign_name,
                ad_id: lead.ad_id,
                ad_name: lead.ad_name,
                adset_id: lead.adset_id,
                adset_name: lead.adset_name,
                is_organic: lead.is_organic,
                field_data: lead.fields,
                synced_at: new Date().toISOString()
              },
              created_at: lead.created_time
            })
          
          if (insertError) {
            console.error('Error saving lead:', insertError)
            saveErrors.push({
              lead_id: lead.facebook_lead_id,
              error: insertError.message
            })
          } else {
            savedCount++
          }
        } catch (error) {
          console.error('Error processing lead:', error)
          saveErrors.push({
            lead_id: lead.facebook_lead_id,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }
      
      console.log(`✅ Synced ${savedCount} new leads from form ${formName} (${skippedCount} already existed)`)
      
      return NextResponse.json({ 
        success: true, 
        syncedCount: allLeads.length,
        savedCount: savedCount,
        skippedCount: skippedCount,
        formId,
        formName,
        leads: allLeads.slice(0, 10), // Return first 10 for preview
        saveErrors: saveErrors.length > 0 ? saveErrors : undefined,
        message: `Successfully synced ${savedCount} new leads from ${allLeads.length} total (${skippedCount} duplicates skipped)`
      })
      
    } catch (error) {
      console.error('Sync error:', error)
      return NextResponse.json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    }
    
  } catch (error) {
    console.error('Request error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}