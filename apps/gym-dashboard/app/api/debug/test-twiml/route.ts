import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // Test if the TwiML endpoint is accessible
  const leadId = 'test-lead-123'
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://atlas-fitness-onboarding.vercel.app').trim()
  const twimlUrl = `${baseUrl}/api/calls/twiml?leadId=${leadId}`
  
  try {
    const response = await fetch(twimlUrl)
    const text = await response.text()
    
    return NextResponse.json({
      url: twimlUrl,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      body: text,
      isValid: response.headers.get('content-type')?.includes('text/xml'),
      preview: text.substring(0, 500)
    })
  } catch (error: any) {
    return NextResponse.json({
      error: 'Failed to fetch TwiML',
      message: error.message,
      url: twimlUrl
    }, { status: 500 })
  }
}