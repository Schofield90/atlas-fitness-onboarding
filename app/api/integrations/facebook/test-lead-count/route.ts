import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { formId, pageId } = body
    
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
    const userAccessToken = tokenData.access_token
    
    console.log(`🔍 Testing lead count for form: ${formId}`)
    
    const tests: any = {
      formId,
      pageId,
      timestamp: new Date().toISOString(),
      tests: []
    }
    
    // Test 1: Try with user token
    try {
      const userTokenUrl = `https://graph.facebook.com/v18.0/${formId}/leads?limit=1&summary=true&access_token=${userAccessToken}`
      console.log('Testing with user token...')
      
      const userTokenResponse = await fetch(userTokenUrl)
      const userTokenData = await userTokenResponse.json()
      
      tests.tests.push({
        name: 'User Token Test',
        url: userTokenUrl.replace(userAccessToken, 'TOKEN...'),
        status: userTokenResponse.status,
        success: !userTokenData.error,
        summary: userTokenData.summary,
        error: userTokenData.error,
        has_data: userTokenData.data?.length > 0,
        lead_count: userTokenData.summary?.total_count || 0
      })
    } catch (error) {
      tests.tests.push({
        name: 'User Token Test',
        success: false,
        error: error.message
      })
    }
    
    // Test 2: Try with page token if pageId provided
    if (pageId) {
      try {
        // First get page token
        const pageResponse = await fetch(
          `https://graph.facebook.com/v18.0/${pageId}?fields=access_token&access_token=${userAccessToken}`
        )
        const pageData = await pageResponse.json()
        
        if (pageData.access_token) {
          const pageTokenUrl = `https://graph.facebook.com/v18.0/${formId}/leads?limit=1&summary=true&access_token=${pageData.access_token}`
          console.log('Testing with page token...')
          
          const pageTokenResponse = await fetch(pageTokenUrl)
          const pageTokenData = await pageTokenResponse.json()
          
          tests.tests.push({
            name: 'Page Token Test',
            url: pageTokenUrl.replace(pageData.access_token, 'PAGE_TOKEN...'),
            status: pageTokenResponse.status,
            success: !pageTokenData.error,
            summary: pageTokenData.summary,
            error: pageTokenData.error,
            has_data: pageTokenData.data?.length > 0,
            lead_count: pageTokenData.summary?.total_count || 0
          })
        } else {
          tests.tests.push({
            name: 'Page Token Test',
            success: false,
            error: 'Could not get page access token'
          })
        }
      } catch (error) {
        tests.tests.push({
          name: 'Page Token Test',
          success: false,
          error: error.message
        })
      }
    }
    
    // Test 3: Try different API variations
    const variations = [
      {
        name: 'Without summary',
        url: `https://graph.facebook.com/v18.0/${formId}/leads?access_token=${userAccessToken}`
      },
      {
        name: 'With fields',
        url: `https://graph.facebook.com/v18.0/${formId}/leads?fields=id,created_time&limit=1&access_token=${userAccessToken}`
      },
      {
        name: 'Form info',
        url: `https://graph.facebook.com/v18.0/${formId}?fields=id,name,status,leads_count&access_token=${userAccessToken}`
      }
    ]
    
    for (const variation of variations) {
      try {
        const response = await fetch(variation.url)
        const data = await response.json()
        
        tests.tests.push({
          name: variation.name,
          url: variation.url.replace(userAccessToken, 'TOKEN...'),
          status: response.status,
          success: !data.error,
          data: data.data?.length || data,
          error: data.error
        })
      } catch (error) {
        tests.tests.push({
          name: variation.name,
          success: false,
          error: error.message
        })
      }
    }
    
    // Summary
    tests.summary = {
      all_tests: tests.tests.length,
      successful_tests: tests.tests.filter(t => t.success).length,
      found_leads: tests.tests.some(t => t.lead_count > 0),
      recommendations: []
    }
    
    // Add recommendations
    if (tests.tests.every(t => !t.success)) {
      tests.summary.recommendations.push('All tests failed - check permissions')
    }
    
    if (tests.tests.some(t => t.error?.code === 190)) {
      tests.summary.recommendations.push('Token may be expired or invalid')
    }
    
    if (tests.tests.some(t => t.error?.code === 100)) {
      tests.summary.recommendations.push('Form may not exist or you lack permissions')
    }
    
    if (tests.tests.find(t => t.name === 'Page Token Test')?.success && 
        !tests.tests.find(t => t.name === 'User Token Test')?.success) {
      tests.summary.recommendations.push('Page token works but user token fails - use page token')
    }
    
    return NextResponse.json(tests)
    
  } catch (error) {
    console.error('Test error:', error)
    return NextResponse.json({
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}