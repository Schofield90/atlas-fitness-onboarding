import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // Log that the webhook was hit
    console.log('Test webhook called at:', new Date().toISOString())
    
    // Get the body
    const body = await request.text()
    console.log('Webhook body:', body)
    
    // Parse if it's form data
    let parsedData = {}
    try {
      const params = new URLSearchParams(body)
      params.forEach((value, key) => {
        parsedData[key] = value
      })
    } catch (e) {
      // Not form data, try JSON
      try {
        parsedData = JSON.parse(body)
      } catch (e2) {
        parsedData = { raw: body }
      }
    }
    
    console.log('Parsed webhook data:', parsedData)
    
    // Return success
    return new NextResponse('Webhook received successfully', {
      status: 200,
      headers: {
        'Content-Type': 'text/plain'
      }
    })
  } catch (error: any) {
    console.error('Test webhook error:', error)
    return NextResponse.json({
      error: 'Webhook test failed',
      details: error.message
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'Test webhook is working',
    instructions: 'Send a POST request to this endpoint to test',
    twilioWebhookUrl: 'https://atlas-fitness-onboarding.vercel.app/api/webhooks/twilio'
  })
}