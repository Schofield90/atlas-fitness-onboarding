import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import twilio from 'twilio'

export async function POST(req: NextRequest) {
  try {
    const { to, settings } = await req.json()
    
    if (!to || !settings) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const primaryNumber = settings.config.phone_numbers?.find((p: any) => p.is_primary)
    if (!primaryNumber) {
      return NextResponse.json(
        { error: 'No primary phone number configured' },
        { status: 400 }
      )
    }

    // Check if we have Twilio credentials
    const accountSid = settings.config.twilio_account_sid || process.env.TWILIO_ACCOUNT_SID
    const authToken = settings.config.twilio_auth_token || process.env.TWILIO_AUTH_TOKEN

    if (!accountSid || !authToken) {
      return NextResponse.json(
        { error: 'Twilio credentials not configured' },
        { status: 400 }
      )
    }

    // Send test SMS using Twilio
    const client = twilio(accountSid, authToken)
    
    const message = await client.messages.create({
      body: 'Test SMS from Atlas Fitness. Your SMS integration is working correctly!',
      from: primaryNumber.number,
      to: to
    })

    return NextResponse.json({
      success: true,
      message: 'Test SMS sent successfully',
      messageId: message.sid
    })
  } catch (error: any) {
    console.error('Error sending test SMS:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send test SMS' },
      { status: 500 }
    )
  }
}