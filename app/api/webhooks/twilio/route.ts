import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import twilio from 'twilio'
import { createClient } from '@/app/lib/supabase/server'

// Twilio webhook signature validation
const validateTwilioSignature = async (request: NextRequest, bodyParams: Record<string, any>) => {
  const headersList = await headers()
  const twilioSignature = headersList.get('x-twilio-signature')
  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio`
  const authToken = process.env.TWILIO_AUTH_TOKEN

  if (!twilioSignature || !authToken) {
    return false
  }

  return twilio.validateRequest(
    authToken,
    twilioSignature,
    webhookUrl,
    bodyParams
  )
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    
    // Parse the webhook data
    const params = new URLSearchParams(body)
    const bodyParams: Record<string, string> = {}
    params.forEach((value, key) => {
      bodyParams[key] = value
    })
    
    // Validate Twilio signature in production
    if (process.env.NODE_ENV === 'production' && !(await validateTwilioSignature(request, bodyParams))) {
      return new NextResponse('Unauthorized', { status: 401 })
    }
    const messageData = {
      from: params.get('From') || '',
      to: params.get('To') || '',
      body: params.get('Body') || '',
      messageSid: params.get('MessageSid') || '',
      accountSid: params.get('AccountSid') || '',
      mediaUrl: params.get('MediaUrl0'), // First media URL if any
      numMedia: params.get('NumMedia') || '0'
    }

    // Determine if it's WhatsApp or SMS
    const isWhatsApp = messageData.from.startsWith('whatsapp:')
    const cleanedFrom = messageData.from.replace('whatsapp:', '')

    console.log(`Received ${isWhatsApp ? 'WhatsApp' : 'SMS'} message:`, {
      from: cleanedFrom,
      body: messageData.body
    })

    // Store the incoming message
    const supabase = await createClient()
    const tableName = isWhatsApp ? 'whatsapp_logs' : 'sms_logs'
    
    await supabase.from(tableName).insert({
      message_id: messageData.messageSid,
      to: messageData.to,
      from_number: cleanedFrom,
      message: messageData.body,
      status: 'received',
      has_media: parseInt(messageData.numMedia) > 0,
      ...(isWhatsApp && messageData.mediaUrl && { media_urls: [messageData.mediaUrl] })
    })

    // Handle specific keywords or commands
    const lowerBody = messageData.body.toLowerCase().trim()
    let responseMessage = null

    switch (lowerBody) {
      case 'stop':
      case 'unsubscribe':
        // Handle unsubscribe
        await handleUnsubscribe(cleanedFrom)
        responseMessage = "You've been unsubscribed from our messages. Reply START to resubscribe."
        break
        
      case 'start':
      case 'subscribe':
        // Handle resubscribe
        await handleResubscribe(cleanedFrom)
        responseMessage = "Welcome back! You're now subscribed to receive messages from us."
        break
        
      case 'help':
        responseMessage = `Available commands:
• STOP - Unsubscribe from messages
• START - Resubscribe to messages
• HELP - Show this message

For assistance, please contact our support team.`
        break
        
      case 'renew':
        // Handle membership renewal request
        responseMessage = "Thanks for your interest in renewing! Our team will contact you shortly with renewal options."
        // TODO: Create a task or notification for staff
        break
    }

    // Send auto-response if applicable
    if (responseMessage) {
      const MessagingResponse = twilio.twiml.MessagingResponse
      const twiml = new MessagingResponse()
      twiml.message(responseMessage)
      
      return new NextResponse(twiml.toString(), {
        headers: { 'Content-Type': 'text/xml' }
      })
    }

    // Return empty response (no auto-reply)
    return new NextResponse('', { status: 200 })

  } catch (error) {
    console.error('Twilio webhook error:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

// Handle unsubscribe requests
async function handleUnsubscribe(phoneNumber: string) {
  const supabase = await createClient()
  
  // Check if contact exists
  const { data: contact } = await supabase
    .from('contacts')
    .select('id')
    .eq('phone', phoneNumber)
    .single()

  if (contact) {
    // Update contact preferences
    await supabase
      .from('contacts')
      .update({ 
        sms_opt_in: false,
        whatsapp_opt_in: false,
        unsubscribed_at: new Date().toISOString()
      })
      .eq('id', contact.id)
  } else {
    // Create unsubscribed contact record
    await supabase
      .from('contacts')
      .insert({
        phone: phoneNumber,
        sms_opt_in: false,
        whatsapp_opt_in: false,
        unsubscribed_at: new Date().toISOString()
      })
  }
}

// Handle resubscribe requests
async function handleResubscribe(phoneNumber: string) {
  const supabase = await createClient()
  
  // Update or create contact
  const { data: contact } = await supabase
    .from('contacts')
    .select('id')
    .eq('phone', phoneNumber)
    .single()

  if (contact) {
    await supabase
      .from('contacts')
      .update({ 
        sms_opt_in: true,
        whatsapp_opt_in: true,
        unsubscribed_at: null
      })
      .eq('id', contact.id)
  } else {
    await supabase
      .from('contacts')
      .insert({
        phone: phoneNumber,
        sms_opt_in: true,
        whatsapp_opt_in: true
      })
  }
}