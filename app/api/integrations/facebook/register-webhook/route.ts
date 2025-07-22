import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { formId } = body
    
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
    
    console.log(`🔗 Registering webhook for form: ${formId}`)
    
    // In a production environment, you would:
    // 1. Register a webhook endpoint with Facebook
    // 2. Subscribe to leadgen updates for this form
    // 3. Store the webhook configuration in your database
    
    // For now, we'll simulate the registration
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://gymleadhub-onboarding.vercel.app'}/api/webhooks/facebook-leads`
    
    // Facebook webhook registration would look like:
    // POST https://graph.facebook.com/v18.0/{app-id}/subscriptions
    // fields: leadgen
    // callback_url: webhookUrl
    // verify_token: process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN
    
    // For this demo, we'll return success
    return NextResponse.json({
      success: true,
      formId,
      webhookUrl,
      message: 'Webhook registered successfully',
      note: 'In production, this would register a real webhook with Facebook'
    })
    
  } catch (error) {
    console.error('❌ Error registering webhook:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to register webhook', 
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
}