import { NextRequest, NextResponse } from 'next/server'
import { sendSMS } from '@/app/lib/services/twilio'

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

    // Validate phone number format
    const phoneRegex = /^\+?[1-9]\d{1,14}$/
    const formattedNumber = to.startsWith('+') ? to : `+${to}`
    
    if (!phoneRegex.test(formattedNumber)) {
      return NextResponse.json(
        { error: 'Invalid phone number format. Please include country code (e.g., +1234567890)' },
        { status: 400 }
      )
    }

    // Send SMS
    const result = await sendSMS({
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
    console.error('SMS API error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send SMS' },
      { status: 500 }
    )
  }
}