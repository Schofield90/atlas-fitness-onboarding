import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

interface SyncRequest {
  pageId?: string
  formId?: string
  limit?: number
}

export async function POST(request: NextRequest) {
  try {
    const body: SyncRequest = await request.json()
    const { pageId, formId, limit = 100 } = body
    
    // Retrieve the stored access token from secure cookie
    const cookieStore = await cookies()
    const tokenCookie = cookieStore.get('fb_token_data')
    
    if (!tokenCookie?.value) {
      return NextResponse.json({ error: 'No Facebook token found' }, { status: 401 })
    }
    
    const tokenData = JSON.parse(tokenCookie.value)
    const storedAccessToken = tokenData.access_token
    
    console.log('🔄 Starting Facebook leads sync', { pageId, formId, limit })
    
    const syncedLeads = []
    const errors = []
    
    // If specific form ID provided, sync from that form
    if (formId && pageId) {
      try {
        // First get the page token
        const pageResponse = await fetch(
          `https://graph.facebook.com/v18.0/${pageId}?fields=id,name,access_token&access_token=${storedAccessToken}`
        )
        const pageData = await pageResponse.json()
        
        if (pageData.error) {
          throw new Error(pageData.error.message)
        }
        
        const pageAccessToken = pageData.access_token || storedAccessToken
        
        // Fetch leads from the specific form
        const leadsResponse = await fetch(
          `https://graph.facebook.com/v18.0/${formId}/leads?fields=id,created_time,field_data&limit=${limit}&access_token=${pageAccessToken}`
        )
        const leadsData = await leadsResponse.json()
        
        if (leadsData.data) {
          for (const lead of leadsData.data) {
            const processedLead = processLeadData(lead, formId, pageId, pageData.name)
            syncedLeads.push(processedLead)
          }
        }
      } catch (error) {
        errors.push({
          formId,
          pageId,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }
    // If page ID provided, sync all forms from that page
    else if (pageId) {
      try {
        // Get page token and forms
        const pageResponse = await fetch(
          `https://graph.facebook.com/v18.0/${pageId}?fields=id,name,access_token&access_token=${storedAccessToken}`
        )
        const pageData = await pageResponse.json()
        
        if (pageData.error) {
          throw new Error(pageData.error.message)
        }
        
        const pageAccessToken = pageData.access_token || storedAccessToken
        
        // Get all lead forms for this page
        const formsResponse = await fetch(
          `https://graph.facebook.com/v18.0/${pageId}/leadgen_forms?fields=id,name&limit=100&access_token=${pageAccessToken}`
        )
        const formsData = await formsResponse.json()
        
        if (formsData.data) {
          // Sync leads from each form
          for (const form of formsData.data) {
            try {
              const leadsResponse = await fetch(
                `https://graph.facebook.com/v18.0/${form.id}/leads?fields=id,created_time,field_data&limit=${limit}&access_token=${pageAccessToken}`
              )
              const leadsData = await leadsResponse.json()
              
              if (leadsData.data) {
                for (const lead of leadsData.data) {
                  const processedLead = processLeadData(lead, form.id, pageId, pageData.name, form.name)
                  syncedLeads.push(processedLead)
                }
              }
            } catch (error) {
              errors.push({
                formId: form.id,
                formName: form.name,
                error: error instanceof Error ? error.message : 'Unknown error'
              })
            }
          }
        }
      } catch (error) {
        errors.push({
          pageId,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }
    // Otherwise, sync from all pages
    else {
      try {
        // Get all pages
        const pagesResponse = await fetch(
          `https://graph.facebook.com/v18.0/me/accounts?fields=id,name,access_token&limit=100&access_token=${storedAccessToken}`
        )
        const pagesData = await pagesResponse.json()
        
        if (pagesData.data) {
          for (const page of pagesData.data) {
            const pageAccessToken = page.access_token || storedAccessToken
            
            try {
              // Get all lead forms for this page
              const formsResponse = await fetch(
                `https://graph.facebook.com/v18.0/${page.id}/leadgen_forms?fields=id,name&limit=100&access_token=${pageAccessToken}`
              )
              const formsData = await formsResponse.json()
              
              if (formsData.data) {
                // Sync leads from each form
                for (const form of formsData.data) {
                  try {
                    const leadsResponse = await fetch(
                      `https://graph.facebook.com/v18.0/${form.id}/leads?fields=id,created_time,field_data&limit=${limit}&access_token=${pageAccessToken}`
                    )
                    const leadsData = await leadsResponse.json()
                    
                    if (leadsData.data) {
                      for (const lead of leadsData.data) {
                        const processedLead = processLeadData(lead, form.id, page.id, page.name, form.name)
                        syncedLeads.push(processedLead)
                      }
                    }
                  } catch (error) {
                    errors.push({
                      pageId: page.id,
                      pageName: page.name,
                      formId: form.id,
                      formName: form.name,
                      error: error instanceof Error ? error.message : 'Unknown error'
                    })
                  }
                }
              }
            } catch (error) {
              errors.push({
                pageId: page.id,
                pageName: page.name,
                error: error instanceof Error ? error.message : 'Unknown error'
              })
            }
          }
        }
      } catch (error) {
        errors.push({
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }
    
    // Save synced leads to database (in production)
    // For now, we'll just return them
    
    return NextResponse.json({
      success: true,
      synced: syncedLeads.length,
      leads: syncedLeads,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Sync error:', error)
    return NextResponse.json({
      error: 'Failed to sync leads',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

function processLeadData(
  lead: any, 
  formId: string, 
  pageId: string, 
  pageName?: string,
  formName?: string
) {
  // Extract field data
  const fieldData = {}
  let name = ''
  let email = ''
  let phone = ''
  
  if (lead.field_data) {
    for (const field of lead.field_data) {
      fieldData[field.name] = field.values?.[0] || ''
      
      // Common field mappings
      const fieldNameLower = field.name.toLowerCase()
      if (fieldNameLower.includes('name') && !fieldNameLower.includes('last')) {
        name = field.values?.[0] || ''
      } else if (fieldNameLower.includes('email')) {
        email = field.values?.[0] || ''
      } else if (fieldNameLower.includes('phone') || fieldNameLower.includes('mobile')) {
        phone = field.values?.[0] || ''
      }
    }
  }
  
  return {
    facebook_lead_id: lead.id,
    created_at: lead.created_time,
    form_id: formId,
    form_name: formName,
    page_id: pageId,
    page_name: pageName,
    name: name || 'Unknown',
    email: email || 'Not provided',
    phone: phone || 'Not provided',
    source: 'facebook',
    status: 'new',
    field_data: fieldData,
    raw_data: lead
  }
}