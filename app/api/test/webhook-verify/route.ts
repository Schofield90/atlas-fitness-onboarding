import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

// Test endpoint to verify webhook setup
export async function GET(request: NextRequest) {
  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || request.headers.get('host') || 'localhost:3000'}/api/webhooks/facebook-leads`
  
  // Test the webhook verification
  const testUrl = `${webhookUrl}?hub.mode=subscribe&hub.verify_token=gym_webhook_verify_2024&hub.challenge=test_challenge_123`
  
  return NextResponse.json({
    webhook_endpoint: webhookUrl,
    verify_token: 'gym_webhook_verify_2024',
    test_verification_url: testUrl,
    instructions: {
      facebook_setup: {
        1: 'Go to your Facebook App Dashboard',
        2: 'Navigate to Webhooks settings',
        3: 'Add a new webhook subscription',
        4: `Enter callback URL: ${webhookUrl}`,
        5: 'Enter verify token: gym_webhook_verify_2024',
        6: 'Subscribe to "leadgen" field',
        7: 'Facebook will call the GET endpoint to verify'
      },
      manual_test: {
        1: `Visit: ${testUrl}`,
        2: 'You should see: test_challenge_123',
        3: 'This confirms the webhook endpoint is working'
      }
    }
  })
}