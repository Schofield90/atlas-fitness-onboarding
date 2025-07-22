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
    
    const allForms = []
    const errors = []
    
    // Fetch REAL lead forms for each selected page
    for (const pageId of pagesToFetch) {
      try {
        console.log(`🔍 Fetching lead forms for page: ${pageId}`)
        
        // REAL Facebook API call
        const apiUrl = `https://graph.facebook.com/v18.0/${pageId}/leadgen_forms?fields=id,name,status,created_time,leads_count,questions,privacy_policy_url,follow_up_action_url,context_card,thank_you_page&limit=100&access_token=${storedAccessToken}`
        
        console.log('🌐 API URL:', apiUrl.replace(storedAccessToken, 'TOKEN_HIDDEN'))
        
        const response = await fetch(apiUrl)
        
        if (!response.ok) {
          const errorText = await response.text()
          console.error(`❌ Error response for page ${pageId}:`, errorText)
          errors.push({ pageId, error: errorText })
          continue
        }
        
        const data = await response.json()
        console.log(`📥 Forms response for page ${pageId}:`, {
          hasData: !!data.data,
          formCount: data.data?.length || 0,
          hasError: !!data.error
        })
        
        if (data.error) {
          errors.push({ pageId, error: data.error.message })
          continue
        }
        
        // Add page info to each form
        if (data.data && Array.isArray(data.data)) {
          const formsWithPageInfo = data.data.map(form => ({
            id: form.id,
            name: form.name,
            status: form.status,
            created_time: form.created_time,
            leads_count: form.leads_count || 0,
            pageId,
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
          console.log(`✅ Added ${formsWithPageInfo.length} forms from page ${pageId}`)
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