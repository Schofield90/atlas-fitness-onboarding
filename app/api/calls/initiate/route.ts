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

    // For browser-based calling, you would:
    // 1. Generate a Twilio Access Token with Voice grant
    // 2. Return the token to the client
    // 3. Client uses Twilio Voice SDK to make the call

    // For server-initiated calls (simpler approach):
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    const twilioClient = twilio(accountSid, authToken)

    try {
      // Create a call that connects the user's phone to the lead's phone
      const call = await twilioClient.calls.create({
        to: to,
        from: process.env.TWILIO_SMS_FROM!, // Using SMS number for outbound calls
        url: `${process.env.NEXT_PUBLIC_APP_URL}/api/calls/twiml?leadId=${leadId}`, // TwiML instructions
        statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/calls/status`,
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
      console.error('Twilio error:', twilioError)
      return NextResponse.json({
        error: 'Failed to initiate call',
        details: twilioError.message
      }, { status: 500 })
    }

  } catch (error) {
    return createErrorResponse(error)
  }
}