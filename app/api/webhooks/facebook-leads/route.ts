import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

// Handle Facebook webhook verification
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')
  
  console.log('🔔 Webhook verification attempt:', { mode, token, challenge })
  
  // Check if this is a subscribe request with the correct token
  if (mode === 'subscribe' && token === 'gym_webhook_verify_2024') {
    console.log('✅ Webhook verified successfully')
    // Return the challenge to verify the webhook
    return new Response(challenge, { 
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    })
  }
  
  console.log('❌ Webhook verification failed')
  return new Response('Forbidden', { status: 403 })
}

// Handle actual lead webhooks
export async function POST(request: NextRequest) {
  console.log('📥 Webhook POST received')
  
  try {
    const body = await request.json()
    console.log('Webhook payload:', JSON.stringify(body, null, 2))
    
    // Facebook sends webhook data in this structure:
    // {
    //   "entry": [{
    //     "id": "PAGE_ID",
    //     "time": 1234567890,
    //     "changes": [{
    //       "field": "leadgen",
    //       "value": {
    //         "form_id": "FORM_ID",
    //         "leadgen_id": "LEAD_ID",
    //         "created_time": 1234567890,
    //         "page_id": "PAGE_ID"
    //       }
    //     }]
    //   }]
    // }
    
    if (body.entry && Array.isArray(body.entry)) {
      for (const entry of body.entry) {
        if (entry.changes && Array.isArray(entry.changes)) {
          for (const change of entry.changes) {
            if (change.field === 'leadgen' && change.value) {
              const leadData = change.value
              console.log('📋 New lead received:', {
                formId: leadData.form_id,
                leadId: leadData.leadgen_id,
                pageId: leadData.page_id,
                createdTime: new Date(leadData.created_time * 1000).toISOString()
              })
              
              // TODO: Fetch full lead details using the Graph API
              // For now, we'll just log the lead notification
              // In production, you would:
              // 1. Use the leadgen_id to fetch full lead details
              // 2. Save the lead to your database
              // 3. Trigger any notifications or workflows
            }
          }
        }
      }
    }
    
    // Always return 200 OK to acknowledge receipt
    // Facebook will retry if you don't respond quickly
    return new Response('OK', { status: 200 })
    
  } catch (error) {
    console.error('❌ Webhook error:', error)
    // Still return 200 to prevent Facebook from retrying
    // Log the error for debugging
    return new Response('OK', { status: 200 })
  }
}