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
    
    // Get parameters from query
    const leadId = request.nextUrl.searchParams.get('leadId')
    let userPhone = request.nextUrl.searchParams.get('userPhone')
    
    // Fallback to environment variable if not in URL
    if (!userPhone) {
      userPhone = process.env.USER_PHONE_NUMBER || null
      console.log('No userPhone in URL, using env variable:', userPhone)
    }
    
    console.log('TwiML request received:', { leadId, userPhone })
    
    if (userPhone) {
      // This creates a real phone bridge
      // The call will connect the lead to the user's phone
      const dial = twiml.dial({
        callerId: process.env.TWILIO_SMS_FROM, // Use your Twilio number as caller ID
        record: 'record-from-ringing', // Start recording when phone starts ringing
        recordingStatusCallback: `${(process.env.NEXT_PUBLIC_APP_URL || 'https://atlas-fitness-onboarding.vercel.app').trim()}/api/calls/recording`,
        timeout: 30, // Ring for 30 seconds before timing out
      })
      
      // Dial the user's phone number
      dial.number(userPhone)
      
      // If the dial fails or user doesn't answer
      twiml.say({
        voice: 'alice',
        language: 'en-GB'
      }, 'Sorry, we could not connect your call. Please try again later.')
    } else {
      // No user phone configured
      console.error('No user phone number available for bridging call')
      twiml.say({
        voice: 'alice',
        language: 'en-GB'
      }, 'Configuration error: No destination phone number set. Please configure USER_PHONE_NUMBER in your environment variables.')
      
      twiml.hangup()
    }
    
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