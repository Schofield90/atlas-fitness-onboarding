import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { leadsDB } from '@/app/lib/leads-store'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { formId, formName, pageId } = body
    
    if (!formId) {
      return NextResponse.json({ error: 'Form ID is required' }, { status: 400 })
    }
    
    // Retrieve the stored access token from secure cookie
    const cookieStore = await cookies()
    const tokenCookie = cookieStore.get('fb_token_data')
    
    if (!tokenCookie?.value) {
      return NextResponse.json({ error: 'Facebook not connected' }, { status: 401 })
    }
    
    const tokenData = JSON.parse(tokenCookie.value)
    const storedAccessToken = tokenData.access_token
    
    console.log(`🔄 Syncing leads from form: ${formId} (${formName})`)
    
    try {
      // First get page token if we have pageId
      let accessToken = storedAccessToken
      
      if (pageId) {
        const pageResponse = await fetch(
          `https://graph.facebook.com/v18.0/${pageId}?fields=access_token&access_token=${storedAccessToken}`
        )
        const pageData = await pageResponse.json()
        if (pageData.access_token) {
          accessToken = pageData.access_token
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
      
      // Save all leads using the store
      const leadsToSave = allLeads.map(lead => ({
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        source: 'facebook' as const,
        status: 'new' as const,
        form_name: lead.form_name,
        campaign_name: lead.campaign_name,
        facebook_lead_id: lead.facebook_lead_id,
        page_id: pageId || null,
        form_id: lead.form_id,
        custom_fields: lead.fields
      }))
      
      const { created, skipped } = leadsDB.bulkCreate(leadsToSave)
      
      console.log(`✅ Synced ${created} new leads from form ${formName} (${skipped} already existed)`)
      
      return NextResponse.json({ 
        success: true, 
        syncedCount: allLeads.length,
        savedCount: created,
        skippedCount: skipped,
        formId,
        formName,
        leads: allLeads.slice(0, 10), // Return first 10 for preview
        message: `Successfully synced ${created} new leads from ${allLeads.length} total (${skipped} duplicates skipped)`
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