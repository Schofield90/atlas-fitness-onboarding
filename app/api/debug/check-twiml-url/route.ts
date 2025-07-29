import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const leadId = request.nextUrl.searchParams.get('leadId') || 'test-lead'
  const userPhone = process.env.USER_PHONE_NUMBER || '+447777777777'
  
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://atlas-fitness-onboarding.vercel.app').trim()
  
  // Show what URL is being generated
  const twimlUrl = `${baseUrl}/api/calls/twiml?leadId=${leadId}&userPhone=${encodeURIComponent(userPhone)}`
  
  // Test fetching the TwiML
  let twimlResponse
  try {
    const response = await fetch(twimlUrl)
    const text = await response.text()
    twimlResponse = {
      status: response.status,
      ok: response.ok,
      contentType: response.headers.get('content-type'),
      body: text
    }
  } catch (error: any) {
    twimlResponse = {
      error: error.message
    }
  }
  
  return NextResponse.json({
    config: {
      USER_PHONE_NUMBER: process.env.USER_PHONE_NUMBER || 'NOT SET',
      TWILIO_SMS_FROM: process.env.TWILIO_SMS_FROM || 'NOT SET',
      baseUrl
    },
    generatedUrl: twimlUrl,
    twimlResponse,
    recommendation: !process.env.USER_PHONE_NUMBER ? 
      'Add USER_PHONE_NUMBER to your Vercel environment variables (e.g., +447777777777)' : 
      'Configuration looks good'
  })
}