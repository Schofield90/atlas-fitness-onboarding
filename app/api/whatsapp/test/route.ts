import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import twilio from 'twilio'

export async function POST(req: NextRequest) {
  try {
    const { to, message, settings } = await req.json()
    
    if (!to || !message || !settings) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const businessNumber = settings.config.business_number
    if (!businessNumber) {
      return NextResponse.json(
        { error: 'WhatsApp business number not configured' },
        { status: 400 }
      )
    }

    // Use Twilio credentials from settings or environment
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN

    if (!accountSid || !authToken) {
      return NextResponse.json(
        { error: 'Twilio credentials not configured' },
        { status: 400 }
      )
    }

    // Send WhatsApp message using Twilio
    const client = twilio(accountSid, authToken)
    
    const whatsappMessage = await client.messages.create({
      body: message,
      from: businessNumber,
      to: to.startsWith('whatsapp:') ? to : `whatsapp:${to}`
    })

    return NextResponse.json({
      success: true,
      message: 'Test WhatsApp message sent successfully',
      messageId: whatsappMessage.sid
    })
  } catch (error: any) {
    console.error('Error sending test WhatsApp message:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send test WhatsApp message' },
      { status: 500 }
    )
  }
}