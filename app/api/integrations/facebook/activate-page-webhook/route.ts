import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { pageId, pageAccessToken } = body
    
    if (!pageId || !pageAccessToken) {
      return NextResponse.json({ 
        success: false, 
        error: 'Page ID and access token are required' 
      }, { status: 400 })
    }
    
    console.log(`🔔 Activating webhook for page: ${pageId}`)
    
    // Subscribe the page to send webhooks to your app
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${pageId}/subscribed_apps`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscribed_fields: 'leadgen,messages,feed',
          access_token: pageAccessToken
        })
      }
    )
    
    const data = await response.json()
    console.log('Page subscription response:', data)
    
    if (data.success || response.ok) {
      // In production, save to database that this page is active
      // For now, we'll just return success
      console.log(`✅ Webhook activated for page ${pageId}`)
      
      return NextResponse.json({ 
        success: true,
        message: 'Webhook activated successfully',
        pageId
      })
    }
    
    return NextResponse.json({ 
      success: false, 
      error: data.error?.message || 'Failed to activate webhook',
      details: data
    }, { status: 400 })
    
  } catch (error) {
    console.error('Error activating page webhook:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Check if a page has webhook activated
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pageId = searchParams.get('pageId')
    const pageAccessToken = searchParams.get('pageAccessToken')
    
    if (!pageId || !pageAccessToken) {
      return NextResponse.json({ 
        success: false, 
        error: 'Page ID and access token are required' 
      }, { status: 400 })
    }
    
    // Check current subscription status
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${pageId}/subscribed_apps?access_token=${pageAccessToken}`
    )
    
    const data = await response.json()
    console.log('Current subscriptions:', data)
    
    // Check if our app is in the list
    const isSubscribed = data.data?.some((app: any) => 
      app.subscribed_fields?.includes('leadgen')
    ) || false
    
    return NextResponse.json({ 
      success: true,
      isSubscribed,
      pageId,
      subscriptions: data.data || []
    })
    
  } catch (error) {
    console.error('Error checking webhook status:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}