import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { rateLimit } from '@/app/lib/rate-limit'

const whatsappTestLimiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500, // Max unique users
})

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Apply rate limiting - 3 test WhatsApp messages per minute per user
    const rateLimitOk = await whatsappTestLimiter.check(request, 3, user.id)
    if (!rateLimitOk) {
      return NextResponse.json({ 
        error: 'Rate limit exceeded. Please wait a minute before sending another test message.' 
      }, { status: 429 })
    }
    
    const body = await request.json()
    const { to, message, from } = body
    
    if (!to || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    
    // Validate phone number format
    const phoneRegex = /^\+?[1-9]\d{7,14}$/
    if (!phoneRegex.test(to.replace(/\s/g, ''))) {
      return NextResponse.json({ error: 'Invalid phone number format' }, { status: 400 })
    }
    
    // Here you would integrate with WhatsApp Business API or Twilio WhatsApp
    // For now, we'll simulate sending
    console.log('Sending test WhatsApp message:', {
      to,
      message,
      from: from || process.env.WHATSAPP_BUSINESS_NUMBER
    })
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // In production, you would use WhatsApp Business API
    // Example with Twilio WhatsApp:
    // const twilio = require('twilio')
    // const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    // await client.messages.create({
    //   body: message,
    //   from: `whatsapp:${from || process.env.WHATSAPP_BUSINESS_NUMBER}`,
    //   to: `whatsapp:${to}`
    // })
    
    return NextResponse.json({ 
      success: true, 
      message: 'Test WhatsApp message sent successfully' 
    })
    
  } catch (error) {
    console.error('Error sending test WhatsApp:', error)
    return NextResponse.json(
      { error: 'Failed to send test WhatsApp message' },
      { status: 500 }
    )
  }
}