import { NextRequest, NextResponse } from 'next/server'
import twilio from 'twilio'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { to, message } = body

    // Get environment variables
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    const twilioWhatsAppFrom = process.env.TWILIO_WHATSAPP_FROM

    // Debug information
    const debugInfo = {
      envVars: {
        hasAccountSid: !!accountSid,
        hasAuthToken: !!authToken,
        twilioWhatsAppFrom: twilioWhatsAppFrom,
        twilioWhatsAppFromWithPrefix: twilioWhatsAppFrom?.startsWith('whatsapp:') 
          ? twilioWhatsAppFrom 
          : `whatsapp:${twilioWhatsAppFrom}`
      },
      request: {
        to: to,
        toWithPrefix: to?.startsWith('whatsapp:') ? to : `whatsapp:${to}`,
        messageLength: message?.length
      }
    }

    if (!accountSid || !authToken) {
      return NextResponse.json({
        error: 'Twilio credentials not configured',
        debug: debugInfo
      }, { status: 500 })
    }

    if (!twilioWhatsAppFrom) {
      return NextResponse.json({
        error: 'TWILIO_WHATSAPP_FROM not configured',
        debug: debugInfo
      }, { status: 500 })
    }

    // Initialize client
    const client = twilio(accountSid, authToken)

    // Prepare numbers with whatsapp: prefix
    const fromNumber = twilioWhatsAppFrom.startsWith('whatsapp:') 
      ? twilioWhatsAppFrom 
      : `whatsapp:${twilioWhatsAppFrom}`
    const toNumber = to.startsWith('whatsapp:') 
      ? to 
      : `whatsapp:${to}`

    console.log('Attempting to send WhatsApp message:', {
      from: fromNumber,
      to: toNumber,
      body: message
    })

    // Send message
    const result = await client.messages.create({
      from: fromNumber,
      to: toNumber,
      body: message
    })

    return NextResponse.json({
      success: true,
      message: result,
      debug: {
        ...debugInfo,
        actual: {
          from: fromNumber,
          to: toNumber,
          messageSid: result.sid,
          status: result.status,
          errorCode: result.errorCode,
          errorMessage: result.errorMessage
        }
      }
    })
  } catch (error: any) {
    console.error('WhatsApp send error:', error)
    
    // Parse Twilio error
    let errorDetails = {
      message: error.message,
      code: error.code,
      moreInfo: error.moreInfo,
      status: error.status
    }

    return NextResponse.json({
      error: 'Failed to send WhatsApp message',
      details: errorDetails,
      fullError: error.toString()
    }, { status: 500 })
  }
}