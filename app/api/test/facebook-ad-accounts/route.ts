import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    // Retrieve the stored access token from secure cookie
    const cookieStore = cookies()
    const tokenCookie = cookieStore.get('fb_token_data')
    
    if (!tokenCookie?.value) {
      return NextResponse.json({ error: 'No Facebook token found' }, { status: 401 })
    }
    
    const tokenData = JSON.parse(tokenCookie.value)
    const accessToken = tokenData.access_token
    
    console.log('🧪 Testing Facebook Ad Accounts API')
    console.log('Token:', accessToken.substring(0, 20) + '...')
    
    // Test different API endpoints
    const tests = []
    
    // Test 1: Basic ad accounts
    const test1 = await fetch(
      `https://graph.facebook.com/v18.0/me/adaccounts?access_token=${accessToken}`
    )
    const data1 = await test1.json()
    tests.push({
      name: 'Basic ad accounts',
      endpoint: '/me/adaccounts',
      status: test1.status,
      success: !data1.error,
      error: data1.error,
      count: data1.data?.length || 0,
      data: data1
    })
    
    // Test 2: Ad accounts with fields
    const test2 = await fetch(
      `https://graph.facebook.com/v18.0/me/adaccounts?fields=id,name,account_status&access_token=${accessToken}`
    )
    const data2 = await test2.json()
    tests.push({
      name: 'Ad accounts with fields',
      endpoint: '/me/adaccounts?fields=id,name,account_status',
      status: test2.status,
      success: !data2.error,
      error: data2.error,
      count: data2.data?.length || 0,
      sample: data2.data?.[0]
    })
    
    // Test 3: Check permissions
    const test3 = await fetch(
      `https://graph.facebook.com/v18.0/me/permissions?access_token=${accessToken}`
    )
    const data3 = await test3.json()
    tests.push({
      name: 'User permissions',
      endpoint: '/me/permissions',
      status: test3.status,
      success: !data3.error,
      permissions: data3.data
    })
    
    return NextResponse.json({
      success: true,
      user_id: tokenData.user_id,
      user_name: tokenData.user_name,
      tests,
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