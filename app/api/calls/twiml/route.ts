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
  console.log('TwiML handler called with URL:', request.url)
  console.log('Query params:', Object.fromEntries(request.nextUrl.searchParams))
  
  try {
    const twiml = new twilio.twiml.VoiceResponse()
    
    // Get parameters from query
    const leadId = request.nextUrl.searchParams.get('leadId')
    let userPhone = request.nextUrl.searchParams.get('userPhone')
    
    console.log('Raw params:', { leadId, userPhone })
    
    // Fallback to environment variable if not in URL
    if (!userPhone) {
      userPhone = process.env.USER_PHONE_NUMBER || null
      console.log('No userPhone in URL, checking env variable:', {
        envVarExists: !!process.env.USER_PHONE_NUMBER,
        envVarValue: process.env.USER_PHONE_NUMBER ? 'SET' : 'NOT SET',
        resultingUserPhone: userPhone
      })
    }
    
    console.log('Final TwiML params:', { leadId, userPhone, hasUserPhone: !!userPhone })
    
    if (userPhone) {
      console.log('Creating dial with userPhone:', userPhone)
      console.log('Using callerId:', process.env.TWILIO_SMS_FROM)
      
      // Simplified dial without recording for now
      const dial = twiml.dial({
        callerId: process.env.TWILIO_SMS_FROM,
        timeout: 30
      })
      
      // Dial the user's phone number
      dial.number(userPhone)
      
      console.log('Dial created successfully')
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