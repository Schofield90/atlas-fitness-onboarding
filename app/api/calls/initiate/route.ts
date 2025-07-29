import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { requireAuth, createErrorResponse } from '@/app/lib/api/auth-check'
import twilio from 'twilio'

export async function POST(request: NextRequest) {
  try {
    const userWithOrg = await requireAuth()
    const supabase = await createClient()
    const body = await request.json()

    const { leadId, to } = body

    // Validate input
    if (!leadId || !to) {
      return NextResponse.json({
        error: 'Missing required fields',
        required: ['leadId', 'to']
      }, { status: 400 })
    }

    // Verify lead belongs to organization
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .eq('organization_id', userWithOrg.organizationId)
      .single()

    if (leadError || !lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    // Check if Twilio is configured
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      return NextResponse.json({ 
        error: 'Calling service not configured. Please set up Twilio credentials.' 
      }, { status: 503 })
    }

    // Check if phone from number is configured
    if (!process.env.TWILIO_SMS_FROM) {
      return NextResponse.json({ 
        error: 'Phone number not configured. Please set TWILIO_SMS_FROM.' 
      }, { status: 503 })
    }

    // Check if app URL is configured
    if (!process.env.NEXT_PUBLIC_APP_URL) {
      console.warn('NEXT_PUBLIC_APP_URL not configured, using fallback URL')
    }

    // For browser-based calling, you would:
    // 1. Generate a Twilio Access Token with Voice grant
    // 2. Return the token to the client
    // 3. Client uses Twilio Voice SDK to make the call

    // For server-initiated calls (simpler approach):
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    const twilioClient = twilio(accountSid, authToken)

    // Get base URL and trim any whitespace/newlines
    const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://atlas-fitness-onboarding.vercel.app').trim()
    
    try {
      
      console.log('Initiating call with:', {
        to,
        from: process.env.TWILIO_SMS_FROM,
        url: `${baseUrl}/api/calls/twiml?leadId=${leadId}`,
        baseUrl
      })

      // Create a call that connects the user's phone to the lead's phone
      const call = await twilioClient.calls.create({
        to: to,
        from: process.env.TWILIO_SMS_FROM!, // Using SMS number for outbound calls
        url: `${baseUrl}/api/calls/twiml?leadId=${leadId}`, // TwiML instructions
        statusCallback: `${baseUrl}/api/calls/status`,
        statusCallbackEvent: ['initiated', 'answered', 'completed'],
        record: true, // Record the call
      })

      // Log call initiation in database
      const { error: logError } = await supabase
        .from('messages')
        .insert({
          organization_id: userWithOrg.organizationId,
          lead_id: leadId,
          user_id: userWithOrg.id,
          type: 'sms', // Using SMS type for calls for now
          direction: 'outbound',
          status: 'pending',
          body: `Phone call initiated to ${lead.name}`,
          from_number: process.env.TWILIO_SMS_FROM,
          to_number: to,
          twilio_sid: call.sid,
        })

      if (logError) {
        console.error('Failed to log call:', logError)
      }

      return NextResponse.json({
        success: true,
        callSid: call.sid,
        status: call.status
      })

    } catch (twilioError: any) {
      console.error('Twilio call error:', {
        message: twilioError.message,
        code: twilioError.code,
        moreInfo: twilioError.moreInfo,
        status: twilioError.status,
        details: twilioError,
        to: to,
        from: process.env.TWILIO_SMS_FROM,
        url: `${baseUrl}/api/calls/twiml?leadId=${leadId}`
      })
      
      // Check for specific Twilio errors
      if (twilioError.code === 21215) {
        return NextResponse.json({
          error: 'Invalid phone number format',
          details: 'Please ensure the phone number includes country code (e.g., +447777777777)'
        }, { status: 400 })
      }
      
      if (twilioError.code === 21217) {
        return NextResponse.json({
          error: 'Phone number not verified',
          details: 'The destination phone number needs to be verified in your Twilio trial account'
        }, { status: 400 })
      }
      
      if (twilioError.code === 21614) {
        return NextResponse.json({
          error: 'Invalid phone number',
          details: 'The "To" phone number is not a valid phone number'
        }, { status: 400 })
      }
      
      if (twilioError.code === 21401) {
        return NextResponse.json({
          error: 'Invalid Account SID',
          details: 'The Twilio Account SID is incorrect'
        }, { status: 401 })
      }
      
      if (twilioError.code === 20003) {
        return NextResponse.json({
          error: 'Authentication failed',
          details: 'Please check your Twilio Account SID and Auth Token'
        }, { status: 401 })
      }
      
      return NextResponse.json({
        error: 'Failed to initiate call',
        details: twilioError.message || 'Unknown error',
        code: twilioError.code,
        moreInfo: twilioError.moreInfo,
        debugInfo: {
          to: to,
          from: process.env.TWILIO_SMS_FROM,
          twilioUrl: `${baseUrl}/api/calls/twiml?leadId=${leadId}`
        }
      }, { status: 500 })
    }

  } catch (error) {
    return createErrorResponse(error)
  }
}