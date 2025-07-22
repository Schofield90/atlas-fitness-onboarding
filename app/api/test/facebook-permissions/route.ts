import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    // Retrieve the stored access token from secure cookie
    const cookieStore = await cookies()
    const tokenCookie = cookieStore.get('fb_token_data')
    
    if (!tokenCookie?.value) {
      return NextResponse.json({ error: 'No Facebook token found' }, { status: 401 })
    }
    
    const tokenData = JSON.parse(tokenCookie.value)
    const accessToken = tokenData.access_token
    
    console.log('🔍 Testing Facebook permissions and token info')
    
    const tests = []
    
    // Test 1: Debug Token
    const debugTokenResponse = await fetch(
      `https://graph.facebook.com/v18.0/debug_token?input_token=${accessToken}&access_token=${accessToken}`
    )
    const debugData = await debugTokenResponse.json()
    tests.push({
      name: 'Token Debug Info',
      endpoint: '/debug_token',
      data: debugData.data || debugData,
      isPageToken: debugData.data?.type === 'PAGE',
      tokenType: debugData.data?.type,
      scopes: debugData.data?.scopes
    })
    
    // Test 2: Check permissions
    const permissionsResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/permissions?access_token=${accessToken}`
    )
    const permissionsData = await permissionsResponse.json()
    tests.push({
      name: 'User Permissions',
      endpoint: '/me/permissions',
      permissions: permissionsData.data,
      hasLeadsRetrieval: permissionsData.data?.some(p => p.permission === 'leads_retrieval' && p.status === 'granted'),
      hasPagesShowList: permissionsData.data?.some(p => p.permission === 'pages_show_list' && p.status === 'granted')
    })
    
    // Test 3: Get pages with their tokens
    const pagesResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/accounts?fields=id,name,access_token,tasks&access_token=${accessToken}`
    )
    const pagesData = await pagesResponse.json()
    tests.push({
      name: 'Pages with Tokens',
      endpoint: '/me/accounts',
      pagesCount: pagesData.data?.length || 0,
      pages: pagesData.data?.map(page => ({
        id: page.id,
        name: page.name,
        hasToken: !!page.access_token,
        tasks: page.tasks // Admin permissions
      }))
    })
    
    // Test 4: Try to get lead forms for first page
    if (pagesData.data?.[0]) {
      const firstPage = pagesData.data[0]
      const pageToken = firstPage.access_token || accessToken
      
      // Try with user token
      const userTokenResponse = await fetch(
        `https://graph.facebook.com/v18.0/${firstPage.id}/leadgen_forms?limit=5&access_token=${accessToken}`
      )
      const userTokenData = await userTokenResponse.json()
      
      // Try with page token
      const pageTokenResponse = await fetch(
        `https://graph.facebook.com/v18.0/${firstPage.id}/leadgen_forms?limit=5&access_token=${pageToken}`
      )
      const pageTokenData = await pageTokenResponse.json()
      
      tests.push({
        name: 'Lead Forms Test',
        pageId: firstPage.id,
        pageName: firstPage.name,
        withUserToken: {
          success: !userTokenData.error,
          formsCount: userTokenData.data?.length || 0,
          error: userTokenData.error
        },
        withPageToken: {
          success: !pageTokenData.error,
          formsCount: pageTokenData.data?.length || 0,
          error: pageTokenData.error
        }
      })
    }
    
    return NextResponse.json({
      success: true,
      user_id: tokenData.user_id,
      user_name: tokenData.user_name,
      tests,
      recommendations: generateRecommendations(tests),
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Test error:', error)
    return NextResponse.json({
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

function generateRecommendations(tests: any[]) {
  const recommendations = []
  
  const tokenInfo = tests.find(t => t.name === 'Token Debug Info')
  const permissions = tests.find(t => t.name === 'User Permissions')
  const leadFormsTest = tests.find(t => t.name === 'Lead Forms Test')
  
  if (!permissions?.hasLeadsRetrieval) {
    recommendations.push('Missing leads_retrieval permission - request this permission')
  }
  
  if (tokenInfo?.tokenType !== 'PAGE' && leadFormsTest?.withUserToken?.error) {
    recommendations.push('Using User Token but need Page Token for lead forms')
  }
  
  if (!permissions?.hasPagesShowList) {
    recommendations.push('Missing pages_show_list permission')
  }
  
  return recommendations
}