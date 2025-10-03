import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const params = new URLSearchParams(body)
    
    const messageData = {
      from: params.get('From') || '',
      to: params.get('To') || '',
      body: params.get('Body') || '',
      messageSid: params.get('MessageSid') || '',
      timestamp: new Date().toISOString()
    }
    
    console.log('TEST WEBHOOK RECEIVED:', messageData)
    
    // Return a simple test response
    const MessagingResponse = (await import('twilio')).twiml.MessagingResponse
    const twiml = new MessagingResponse()
    twiml.message('Test webhook received your message successfully! Main webhook is at /api/webhooks/twilio')
    
    return new NextResponse(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' }
    })
  } catch (error) {
    console.error('Test webhook error:', error)
    return new NextResponse('Error', { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'Test webhook is working',
    mainWebhook: 'https://atlas-fitness-onboarding.vercel.app/api/webhooks/twilio',
    instructions: 'Set your Twilio WhatsApp webhook to the mainWebhook URL above'
  })
}