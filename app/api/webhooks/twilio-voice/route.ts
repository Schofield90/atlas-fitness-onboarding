import { NextRequest, NextResponse } from 'next/server'
import twilio from 'twilio'

export async function POST(request: NextRequest) {
  return handleVoiceWebhook(request)
}

export async function GET(request: NextRequest) {
  return handleVoiceWebhook(request)
}

async function handleVoiceWebhook(request: NextRequest) {
  try {
    // Get form data from Twilio (they send as form-encoded)
    const formData = await request.formData().catch(() => null)
    const params = formData ? Object.fromEntries(formData) : {}
    
    // Log the incoming call details
    console.log('Voice webhook received:', {
      from: params.From || 'unknown',
      to: params.To || 'unknown',
      callSid: params.CallSid || 'unknown',
      direction: params.Direction || 'unknown',
      callStatus: params.CallStatus || 'unknown'
    })
    
    // Create TwiML response
    const twiml = new twilio.twiml.VoiceResponse()
    
    // Get the direction of the call
    const direction = params.Direction || 'inbound'
    const calledNumber = params.Called || params.To
    const callerNumber = params.Caller || params.From
    
    if (direction === 'inbound' || direction === 'inbound-api') {
      // Someone is calling the Twilio number
      console.log('Handling inbound call from:', callerNumber)
      
      // Greet the caller
      twiml.say({
        voice: 'alice',
        language: 'en-GB'
      }, 'Thank you for calling Atlas Fitness.')
      
      // Pause briefly
      twiml.pause({ length: 1 })
      
      // Connect to the staff member
      const staffPhone = process.env.USER_PHONE_NUMBER || process.env.DEFAULT_STAFF_PHONE
      
      if (staffPhone) {
        twiml.say({
          voice: 'alice',
          language: 'en-GB'
        }, 'Please hold while we connect you to our team.')
        
        // Create a dial to connect to staff
        const dial = twiml.dial({
          callerId: callerNumber, // Show the customer's number to staff
          timeout: 30,
          action: '/api/webhooks/twilio-voice/status' // Optional: handle post-call
        })
        
        // Dial the staff member
        dial.number(staffPhone)
      } else {
        // No staff phone configured
        twiml.say({
          voice: 'alice',
          language: 'en-GB'
        }, 'We apologize, but we are unable to take your call at the moment. Please try again later or visit us at our Harrogate or York locations.')
        
        twiml.hangup()
      }
    } else if (direction === 'outbound-dial') {
      // This is the second leg of an outbound call (connecting to the lead)
      console.log('Handling outbound dial leg')
      
      // For outbound calls initiated from the app, we just need to connect
      // The greeting was already handled in the TwiML endpoint
      twiml.say({
        voice: 'alice',
        language: 'en-GB'
      }, 'Connecting your call.')
      
    } else if (direction === 'outbound-api') {
      // Outbound call initiated via API
      console.log('Handling outbound API call')
      
      // The call should already be configured with dial in the initial TwiML
      // This is just a fallback
      twiml.say({
        voice: 'alice',
        language: 'en-GB'
      }, 'Thank you for calling Atlas Fitness.')
    }
    
    // Generate TwiML string
    const twimlString = twiml.toString()
    console.log('Generated voice TwiML:', twimlString)
    
    // Return TwiML response
    return new NextResponse(twimlString, {
      status: 200,
      headers: {
        'Content-Type': 'text/xml',
        'Cache-Control': 'no-cache'
      }
    })
    
  } catch (error: any) {
    console.error('Voice webhook error:', error)
    
    // Return error TwiML
    const errorTwiml = new twilio.twiml.VoiceResponse()
    errorTwiml.say({
      voice: 'alice',
      language: 'en-GB'
    }, 'We apologize, but we are experiencing technical difficulties. Please try again later.')
    errorTwiml.hangup()
    
    return new NextResponse(errorTwiml.toString(), {
      status: 200,
      headers: {
        'Content-Type': 'text/xml'
      }
    })
  }
}

// Optional: Handle call status updates
export async function handleCallStatus(request: NextRequest) {
  try {
    const formData = await request.formData()
    const params = Object.fromEntries(formData)
    
    console.log('Call status update:', {
      callSid: params.CallSid,
      callStatus: params.CallStatus,
      duration: params.CallDuration,
      dialCallStatus: params.DialCallStatus
    })
    
    // You can log this to your database if needed
    
    return new NextResponse('OK', { status: 200 })
  } catch (error) {
    console.error('Call status error:', error)
    return new NextResponse('OK', { status: 200 })
  }
}