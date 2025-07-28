import { NextRequest, NextResponse } from 'next/server'
import twilio from 'twilio'

export async function POST(request: NextRequest) {
  const twiml = new twilio.twiml.VoiceResponse()
  
  // Get lead ID from query params
  const leadId = request.nextUrl.searchParams.get('leadId')
  
  // Create a simple message and then connect to an agent
  twiml.say({
    voice: 'alice',
    language: 'en-GB'
  }, 'Connecting you to Atlas Fitness. One moment please.')
  
  // Play hold music while connecting
  twiml.play('http://demo.twilio.com/docs/classic.mp3')
  
  // In a real implementation, you would:
  // 1. Dial the gym's agent/staff member
  // 2. Conference both parties
  // 3. Record the conversation
  
  // For now, just a simple response
  twiml.say({
    voice: 'alice',
    language: 'en-GB'
  }, 'Thank you for calling Atlas Fitness. This call is being recorded for quality purposes.')
  
  // Return TwiML response
  return new NextResponse(twiml.toString(), {
    status: 200,
    headers: {
      'Content-Type': 'text/xml',
    },
  })
}