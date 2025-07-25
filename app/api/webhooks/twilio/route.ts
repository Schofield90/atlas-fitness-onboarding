import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import twilio from 'twilio'
import { createClient } from '@/app/lib/supabase/server'
import { generateAIResponse, formatKnowledgeContext } from '@/app/lib/ai/anthropic'
import { fetchRelevantKnowledge } from '@/app/lib/knowledge'

// Twilio webhook signature validation
const validateTwilioSignature = async (request: NextRequest, bodyParams: Record<string, any>) => {
  const headersList = await headers()
  const twilioSignature = headersList.get('x-twilio-signature')
  
  // In development with ngrok, use the forwarded host
  const host = headersList.get('x-forwarded-host') || headersList.get('host')
  const protocol = headersList.get('x-forwarded-proto') || 'https'
  const webhookUrl = process.env.NODE_ENV === 'development' && host?.includes('ngrok')
    ? `${protocol}://${host}/api/webhooks/twilio`
    : `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio`
    
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

// Forward webhook to local development if configured
const forwardToLocalDev = async (bodyParams: Record<string, any>) => {
  const localWebhookUrl = process.env.LOCAL_DEV_WEBHOOK_URL
  if (!localWebhookUrl) return null

  try {
    const response = await fetch(localWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(bodyParams).toString()
    })
    
    if (response.ok) {
      return await response.text()
    }
  } catch (error) {
    console.error('Failed to forward to local dev:', error)
  }
  
  return null
}

export async function POST(request: NextRequest) {
  try {
    // Log all incoming requests for debugging
    console.log('Twilio webhook called at:', new Date().toISOString())
    
    const body = await request.text()
    
    // Parse the webhook data
    const params = new URLSearchParams(body)
    const bodyParams: Record<string, string> = {}
    params.forEach((value, key) => {
      bodyParams[key] = value
    })
    
    // Always log webhook data for debugging
    console.log('Webhook received:', {
      env: process.env.NODE_ENV,
      body: bodyParams,
      hasAuthToken: !!process.env.TWILIO_AUTH_TOKEN
    })
    
    // Check if we should forward to local development
    if (process.env.NODE_ENV === 'production' && process.env.LOCAL_DEV_WEBHOOK_URL) {
      const localResponse = await forwardToLocalDev(bodyParams)
      if (localResponse) {
        return new NextResponse(localResponse, {
          headers: { 'Content-Type': 'text/xml' }
        })
      }
    }
    
    // Temporarily disable signature validation for debugging
    // TODO: Re-enable this after debugging
    /*
    if (process.env.NODE_ENV === 'production' && !(await validateTwilioSignature(request, bodyParams))) {
      console.error('Twilio signature validation failed')
      return new NextResponse('Unauthorized', { status: 401 })
    }
    */
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
        
      default:
        // Use AI to generate response
        try {
          // Fetch relevant knowledge for context
          const knowledge = await fetchRelevantKnowledge(messageData.body)
          const knowledgeContext = formatKnowledgeContext(knowledge)
          
          console.log('Knowledge passed to AI:', {
            messageQuery: messageData.body,
            knowledgeItemsCount: knowledge.length,
            knowledgePreview: knowledge.slice(0, 3).map(k => ({
              type: k.type,
              content: k.content.substring(0, 100) + '...'
            }))
          })
          
          // Generate AI response
          const aiResponse = await generateAIResponse(messageData.body, cleanedFrom, knowledgeContext)
          responseMessage = aiResponse.message
          
          // Log if booking intent detected
          if (aiResponse.shouldBookAppointment) {
            console.log('Booking intent detected for:', cleanedFrom)
            // TODO: Implement booking flow
          }
          
          // Save extracted info if any
          if (aiResponse.extractedInfo?.email) {
            // TODO: Update contact with extracted information
            console.log('Extracted info:', aiResponse.extractedInfo)
          }
        } catch (error) {
          console.error('AI response error:', error)
          responseMessage = 'Thanks for your message! Our team will get back to you shortly. For immediate assistance, please call us at 01234 567890.'
        }
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
    // Return 200 OK even on error to prevent Twilio retries during debugging
    return new NextResponse('OK', { status: 200 })
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