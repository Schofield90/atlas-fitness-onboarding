import { NextResponse } from 'next/server'

export async function GET() {
  const config = {
    hasAccountSid: !!process.env.TWILIO_ACCOUNT_SID,
    hasAuthToken: !!process.env.TWILIO_AUTH_TOKEN,
    whatsappFrom: process.env.TWILIO_WHATSAPP_FROM,
    smsFrom: process.env.TWILIO_SMS_FROM,
    whatsappFromFormat: {
      raw: process.env.TWILIO_WHATSAPP_FROM,
      hasWhatsappPrefix: process.env.TWILIO_WHATSAPP_FROM?.startsWith('whatsapp:'),
      numberOnly: process.env.TWILIO_WHATSAPP_FROM?.replace('whatsapp:', '')
    }
  }

  // Don't expose auth token, just show if it exists
  return NextResponse.json({
    ...config,
    recommendation: !config.whatsappFromFormat.hasWhatsappPrefix 
      ? 'Add "whatsapp:" prefix to TWILIO_WHATSAPP_FROM in Vercel environment variables' 
      : 'Configuration looks correct'
  })
}