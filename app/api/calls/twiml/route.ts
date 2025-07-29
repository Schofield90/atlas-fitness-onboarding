import { NextRequest, NextResponse } from 'next/server'
import twilio from 'twilio'

// Twilio makes GET requests to TwiML endpoints
export async function GET(request: NextRequest) {
  return handleTwiml(request)
}

export async function POST(request: NextRequest) {
  return handleTwiml(request)
}

async function handleTwiml(request: NextRequest) {
  try {
    const twiml = new twilio.twiml.VoiceResponse()
    
    // Get lead ID from query params
    const leadId = request.nextUrl.searchParams.get('leadId')
    
    console.log('TwiML request received for lead:', leadId)
    
    // Simple greeting message
    twiml.say({
      voice: 'alice',
      language: 'en-GB'
    }, 'Hello from Atlas Fitness. You are now connected with our team.')
    
    // Pause for 2 seconds
    twiml.pause({ length: 2 })
    
    // Another message
    twiml.say({
      voice: 'alice',
      language: 'en-GB'
    }, 'This is a test call from your gym management system. The call is working correctly.')
    
    // End the call after the message
    twiml.hangup()
    
    const twimlString = twiml.toString()
    console.log('Generated TwiML:', twimlString)
    
    // Return TwiML response
    return new NextResponse(twimlString, {
      status: 200,
      headers: {
        'Content-Type': 'text/xml',
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error: any) {
    console.error('TwiML generation error:', error)
    
    // Return a simple valid TwiML on error
    const errorTwiml = new twilio.twiml.VoiceResponse()
    errorTwiml.say('Sorry, an error occurred. Please try again later.')
    errorTwiml.hangup()
    
    return new NextResponse(errorTwiml.toString(), {
      status: 200,
      headers: {
        'Content-Type': 'text/xml',
      },
    })
  }
}