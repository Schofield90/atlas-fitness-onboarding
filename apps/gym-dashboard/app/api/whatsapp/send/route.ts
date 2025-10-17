import { NextRequest, NextResponse } from 'next/server'
import { sendWhatsAppMessage, verifyWhatsAppNumber } from '@/app/lib/services/twilio'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { to, message, mediaUrl } = body

    if (!to || !message) {
      return NextResponse.json(
        { error: 'Phone number and message are required' },
        { status: 400 }
      )
    }

    // Verify phone number format
    const { isValid, formattedNumber } = verifyWhatsAppNumber(to)
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid phone number format. Please include country code (e.g., +1234567890)' },
        { status: 400 }
      )
    }

    // Send WhatsApp message
    const result = await sendWhatsAppMessage({
      to: formattedNumber,
      body: message,
      mediaUrl: mediaUrl ? (Array.isArray(mediaUrl) ? mediaUrl : [mediaUrl]) : undefined
    })

    if (result.success) {
      return NextResponse.json(result)
    } else {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('WhatsApp API error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send WhatsApp message' },
      { status: 500 }
    )
  }
}