import { NextRequest, NextResponse } from 'next/server'
import twilio from 'twilio'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { to } = body

    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    const twilioWhatsAppFrom = process.env.TWILIO_WHATSAPP_FROM

    if (!accountSid || !authToken || !twilioWhatsAppFrom) {
      return NextResponse.json({
        error: 'Twilio credentials not configured'
      }, { status: 500 })
    }

    const client = twilio(accountSid, authToken)
    
    // For WhatsApp Business, you need to use a pre-approved template
    // This is a sample template - you need to create your own in Twilio Console
    const message = await client.messages.create({
      from: `whatsapp:${twilioWhatsAppFrom.replace('whatsapp:', '')}`,
      to: `whatsapp:${to.replace('whatsapp:', '')}`,
      // Using a simple template message
      body: `Your appointment is coming up on {{1}} at {{2}}`,
      // Template parameters (if your template has them)
      contentSid: 'HX...' // Replace with your actual template SID from Twilio Console
    })

    return NextResponse.json({
      success: true,
      messageSid: message.sid,
      status: message.status,
      note: 'For WhatsApp Business, you need approved templates for business-initiated messages. Freeform messages only work within 24 hours of customer interaction.'
    })
  } catch (error: any) {
    console.error('WhatsApp template error:', error)
    
    return NextResponse.json({
      error: 'Failed to send WhatsApp message',
      details: error.message,
      note: 'Error 63016 usually means you need to use an approved template for business-initiated messages, or the customer needs to message you first.'
    }, { status: 500 })
  }
}