import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pageId = searchParams.get('pageId')
    const pageIds = searchParams.get('pageIds')
    
    // Support both single pageId and multiple pageIds
    const pagesToFetch = pageIds ? pageIds.split(',').filter(Boolean) : (pageId ? [pageId] : [])
    
    if (pagesToFetch.length === 0) {
      return NextResponse.json(
        { error: 'No pages selected' }, 
        { status: 400 }
      )
    }

    // Retrieve the stored access token from secure cookie
    const cookieStore = await cookies()
    const tokenCookie = cookieStore.get('fb_token_data')
    
    let storedAccessToken = null
    let facebookUserId = null
    
    if (tokenCookie?.value) {
      try {
        const tokenData = JSON.parse(tokenCookie.value)
        storedAccessToken = tokenData.access_token
        facebookUserId = tokenData.user_id
        console.log('🔑 Retrieved Facebook token for lead forms')
      } catch (e) {
        console.error('Failed to parse token cookie:', e)
      }
    }
    
    if (!storedAccessToken) {
      return NextResponse.json(
        { error: 'Facebook not connected' }, 
        { status: 401 }
      )
    }

    console.log(`📋 Fetching REAL Lead Forms for Facebook Pages: ${pagesToFetch.join(', ')}`)
    console.log('🔑 Token exists:', !!storedAccessToken)
    console.log('🔑 Token first 10 chars:', storedAccessToken?.substring(0, 10) + '...')
    
    const allForms = []
    const errors = []
    
    // Fetch REAL lead forms for each selected page
    for (const pageId of pagesToFetch) {
      try {
        console.log(`\n--- Fetching forms for page: ${pageId} ---`)
        
        // First, try to get page details to ensure access and get page token
        const pageUrl = `https://graph.facebook.com/v18.0/${pageId}?fields=id,name,access_token&access_token=${storedAccessToken}`
        console.log('📄 Getting page info first...')
        
        const pageResponse = await fetch(pageUrl)
        const pageData = await pageResponse.json()
        console.log('Page data:', {
          id: pageData.id,
          name: pageData.name,
          hasPageToken: !!pageData.access_token,
          error: pageData.error
        })
        
        if (pageData.error) {
          console.error('❌ Page access error:', pageData.error)
          errors.push({ pageId, error: `Page access error: ${pageData.error.message}` })
          continue
        }
        
        // Use page access token if available, otherwise use user token
        const pageAccessToken = pageData.access_token || storedAccessToken
        console.log('🔐 Using token type:', pageData.access_token ? 'Page Access Token' : 'User Access Token')
        
        // Try different API endpoint variations
        const endpoints = [
          {
            name: 'Standard endpoint',
            url: `https://graph.facebook.com/v18.0/${pageId}/leadgen_forms?access_token=${pageAccessToken}`
          },
          {
            name: 'With all fields',
            url: `https://graph.facebook.com/v18.0/${pageId}/leadgen_forms?fields=id,name,status,created_time,leads_count,questions&access_token=${pageAccessToken}`
          },
          {
            name: 'With limit',
            url: `https://graph.facebook.com/v18.0/${pageId}/leadgen_forms?limit=100&access_token=${pageAccessToken}`
          }
        ]
        
        let foundForms = false
        
        for (const endpoint of endpoints) {
          console.log(`\n🔄 Trying ${endpoint.name}...`)
          console.log('URL:', endpoint.url.replace(pageAccessToken, 'TOKEN...'))
          
          const response = await fetch(endpoint.url)
          const data = await response.json()
          
          console.log('Response status:', response.status)
          console.log('Response data:', JSON.stringify(data, null, 2))
          
          if (data.error) {
            console.error(`❌ API Error:`, data.error)
            continue
          }
          
          if (data.data && data.data.length > 0) {
            console.log(`✅ Found ${data.data.length} forms with ${endpoint.name}!`)
            foundForms = true
            
            // Add page info to each form
            const formsWithPageInfo = data.data.map(form => ({
              id: form.id,
              name: form.name,
              status: form.status,
              created_time: form.created_time,
              leads_count: form.leads_count || 0,
              pageId,
              pageName: pageData.name,
              // Process questions
              questions: form.questions || [],
              questions_count: form.questions?.length || 0,
              // Context card info
              context_card: form.context_card || {
                title: 'Lead Form',
                description: form.name,
                button_text: 'Submit'
              },
              // Thank you page
              thank_you_page: form.thank_you_page || {
                title: 'Thank You!',
                body: 'We will contact you soon.'
              },
              // Additional fields
              privacy_policy_url: form.privacy_policy_url,
              follow_up_action_url: form.follow_up_action_url,
              is_active: form.status === 'ACTIVE'
            }))
            
            allForms.push(...formsWithPageInfo)
            break // Found forms, no need to try other endpoints
          }
        }
        
        if (!foundForms) {
          console.log('⚠️ No forms found with any endpoint variation')
          errors.push({ 
            pageId, 
            pageName: pageData.name,
            error: 'No lead forms found. Forms may not exist or may require different permissions.' 
          })
        }
      } catch (error) {
        console.error(`❌ Error fetching forms for page ${pageId}:`, error)
        errors.push({ 
          pageId, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        })
      }
    }
    
    console.log(`📊 Total forms found: ${allForms.length} across ${pagesToFetch.length} pages`)
    
    return NextResponse.json({ 
      success: true,
      forms: allForms,
      errors: errors.length > 0 ? errors : undefined,
      summary: {
        total_forms: allForms.length,
        active_forms: allForms.filter(form => form.is_active).length,
        total_leads: allForms.reduce((sum, form) => sum + (form.leads_count || 0), 0),
        pages_checked: pagesToFetch.length,
        pages_with_errors: errors.length
      },
      debug: {
        totalForms: allForms.length,
        pagesChecked: pagesToFetch.length,
        hasErrors: errors.length > 0,
        api_call: 'GET /{page-id}/leadgen_forms',
        permissions_required: ['leads_retrieval', 'pages_show_list'],
        data_source: 'facebook_api',
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('❌ Error fetching Facebook lead forms:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch Facebook lead forms', 
        details: error instanceof Error ? error.message : 'Unknown error',
        debug: {
          endpoint: '/api/integrations/facebook/lead-forms',
          timestamp: new Date().toISOString()
        }
      }, 
      { status: 500 }
    )
  }
}