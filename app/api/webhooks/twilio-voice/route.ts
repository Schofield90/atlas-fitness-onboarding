import { NextRequest, NextResponse } from 'next/server'
import twilio from 'twilio'
import { createAdminClient } from '@/app/lib/supabase/admin'

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
    const adminSupabase = createAdminClient()
    
    // Log ALL incoming parameters for debugging
    console.log('Voice webhook received - ALL PARAMS:', params)
    console.log('Voice webhook received - Key details:', {
      from: params.From || 'unknown',
      to: params.To || 'unknown',
      called: params.Called || 'unknown',
      caller: params.Caller || 'unknown',
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
      
      // Find which organization owns this phone number
      const { data: organization, error: orgError } = await adminSupabase
        .from('organizations')
        .select('*')
        .eq('twilio_phone_number', calledNumber)
        .single()
      
      if (orgError || !organization) {
        console.error('No organization found for number:', calledNumber)
        twiml.say({
          voice: 'alice',
          language: 'en-GB'
        }, 'Sorry, this number is not currently in service.')
        twiml.hangup()
        return new NextResponse(twiml.toString(), {
          headers: { 'Content-Type': 'text/xml' }
        })
      }
      
      // Log the incoming call
      await adminSupabase.from('messages').insert({
        organization_id: organization.id,
        type: 'call',
        direction: 'inbound',
        from_number: callerNumber,
        to_number: calledNumber,
        twilio_sid: params.CallSid,
        status: 'initiated',
        body: 'Incoming phone call',
        metadata: {
          call_direction: 'inbound',
          timestamp: new Date().toISOString()
        }
      })
      
      // Get organization settings
      const { data: settings } = await adminSupabase
        .from('organization_settings')
        .select('*')
        .eq('organization_id', organization.id)
        .single()
      
      // Use organization-specific greeting or default
      const greeting = settings?.default_greeting || 'Thank you for calling'
      twiml.say({
        voice: 'alice',
        language: 'en-GB'
      }, `${greeting} ${organization.name}.`)
      
      // Pause briefly
      twiml.pause({ length: 1 })
      
      // Get available staff for this organization
      const { data: availableStaff } = await adminSupabase
        .rpc('get_available_staff_for_call', { org_id: organization.id })
      
      if (availableStaff && availableStaff.length > 0) {
        twiml.say({
          voice: 'alice',
          language: 'en-GB'
        }, 'Please hold while we connect you to our team.')
        
        // Get routing settings
        const routingType = settings?.call_routing_type || 'single'
        const callTimeout = settings?.call_timeout || 30
        
        if (routingType === 'simultaneous') {
          // Ring all available staff at once
          const dial = twiml.dial({
            callerId: callerNumber,
            timeout: callTimeout,
            action: '/api/webhooks/twilio-voice/status'
          })
          
          availableStaff.forEach(staff => {
            dial.number(staff.phone_number)
          })
        } else {
          // Single or round-robin - just use first available
          const dial = twiml.dial({
            callerId: callerNumber,
            timeout: callTimeout,
            action: '/api/webhooks/twilio-voice/status'
          })
          
          dial.number(availableStaff[0].phone_number)
        }
      } else {
        // No staff phone configured
        twiml.say({
          voice: 'alice',
          language: 'en-GB'
        }, 'We apologize, but we are unable to take your call at the moment. Please try again later.')
        
        twiml.hangup()
      }
    } else if (direction === 'outbound-dial' || direction === 'outbound-api') {
      // This is an outbound call from your CRM to a lead
      console.log('Handling outbound call - no organization lookup needed')
      
      // For outbound calls, we don't need to look up organization
      // Just connect the call
      twiml.say({
        voice: 'alice',
        language: 'en-GB'
      }, 'Connecting your call.')
      
      // The actual dial happens in the TwiML endpoint or initial call setup
      // This is just the initial response
      console.log('Outbound call TwiML generated successfully')
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
async function handleCallStatus(request: NextRequest) {
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