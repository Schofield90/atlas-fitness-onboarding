import { NextRequest, NextResponse } from 'next/server'
import twilio from 'twilio'

export async function GET(request: NextRequest) {
  console.log('Test voice webhook called')
  
  const twiml = new twilio.twiml.VoiceResponse()
  
  // Simple test response
  twiml.say({
    voice: 'alice',
    language: 'en-GB'
  }, 'Hello from Atlas Fitness. This is a test of the voice webhook.')
  
  twiml.pause({ length: 1 })
  
  twiml.say({
    voice: 'alice',
    language: 'en-GB'
  }, 'If you hear this message, the webhook is working correctly.')
  
  const twimlString = twiml.toString()
  console.log('Test TwiML generated:', twimlString)
  
  return new NextResponse(twimlString, {
    status: 200,
    headers: {
      'Content-Type': 'text/xml',
      'Cache-Control': 'no-cache',
    },
  })
}

export async function POST(request: NextRequest) {
  return GET(request)
}