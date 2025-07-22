import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

export async function GET(
  request: NextRequest, 
  { params }: { params: Promise<{ formId: string }> }
) {
  try {
    const { formId } = await params
    
    // Retrieve the stored access token from secure cookie
    const cookieStore = await cookies()
    const tokenCookie = cookieStore.get('fb_token_data')
    
    if (!tokenCookie?.value) {
      return NextResponse.json({ error: 'Facebook not connected' }, { status: 401 })
    }
    
    const tokenData = JSON.parse(tokenCookie.value)
    const storedAccessToken = tokenData.access_token
    
    const tests: any = {
      formId,
      timestamp: new Date().toISOString(),
      tests: []
    }
    
    // Test 1: Basic form info
    try {
      const formRes = await fetch(
        `https://graph.facebook.com/v18.0/${formId}?access_token=${storedAccessToken}`
      )
      const basicInfo = await formRes.json()
      tests.tests.push({
        name: 'Basic form info',
        endpoint: `/${formId}`,
        status: formRes.status,
        success: !basicInfo.error,
        data: basicInfo,
        error: basicInfo.error
      })
    } catch (error) {
      tests.tests.push({
        name: 'Basic form info',
        success: false,
        error: error.message
      })
    }
    
    // Test 2: Form with all fields
    try {
      const detailRes = await fetch(
        `https://graph.facebook.com/v18.0/${formId}?fields=id,name,status,created_time,questions,locale,privacy_policy_url,context_card,thank_you_page&access_token=${storedAccessToken}`
      )
      const detailedInfo = await detailRes.json()
      tests.tests.push({
        name: 'Detailed form info',
        endpoint: `/${formId}?fields=...`,
        status: detailRes.status,
        success: !detailedInfo.error,
        data: detailedInfo,
        error: detailedInfo.error,
        questions_count: detailedInfo.questions?.length || 0
      })
    } catch (error) {
      tests.tests.push({
        name: 'Detailed form info',
        success: false,
        error: error.message
      })
    }
    
    // Test 3: Lead access
    try {
      const leadsRes = await fetch(
        `https://graph.facebook.com/v18.0/${formId}/leads?limit=1&access_token=${storedAccessToken}`
      )
      const leadAccess = await leadsRes.json()
      tests.tests.push({
        name: 'Lead access test',
        endpoint: `/${formId}/leads`,
        status: leadsRes.status,
        success: !leadAccess.error,
        has_leads: leadAccess.data?.length > 0,
        error: leadAccess.error
      })
    } catch (error) {
      tests.tests.push({
        name: 'Lead access test',
        success: false,
        error: error.message
      })
    }
    
    // Test 4: Lead count with summary
    try {
      const countRes = await fetch(
        `https://graph.facebook.com/v18.0/${formId}/leads?limit=0&summary=true&access_token=${storedAccessToken}`
      )
      const countData = await countRes.json()
      tests.tests.push({
        name: 'Lead count',
        endpoint: `/${formId}/leads?summary=true`,
        status: countRes.status,
        success: !countData.error,
        total_count: countData.summary?.total_count || 0,
        error: countData.error
      })
    } catch (error) {
      tests.tests.push({
        name: 'Lead count',
        success: false,
        error: error.message
      })
    }
    
    // Summary
    tests.summary = {
      all_tests_passed: tests.tests.every(t => t.success),
      total_tests: tests.tests.length,
      passed_tests: tests.tests.filter(t => t.success).length,
      recommendations: []
    }
    
    // Add recommendations based on test results
    if (tests.tests.some(t => t.error?.code === 190)) {
      tests.summary.recommendations.push('Token may be expired or invalid')
    }
    
    if (tests.tests.some(t => t.error?.code === 100)) {
      tests.summary.recommendations.push('Form may not exist or you lack permissions')
    }
    
    if (tests.tests.some(t => t.name === 'Lead access test' && !t.success)) {
      tests.summary.recommendations.push('Missing leads_retrieval permission')
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