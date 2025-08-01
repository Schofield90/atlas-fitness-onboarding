import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import twilio from 'twilio'
import { createClient } from '@/app/lib/supabase/server'
import { generateAIResponse, formatKnowledgeContext } from '@/app/lib/ai/anthropic'
import { fetchRelevantKnowledge } from '@/app/lib/knowledge'
import { createAdminClient } from '@/app/lib/supabase/admin'

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
    
    // Check if this is a status callback (not an actual message)
    const messageStatus = params.get('MessageStatus') || params.get('SmsStatus')
    if (messageStatus && !params.get('Body')) {
      console.log('Ignoring status callback:', messageStatus)
      return new NextResponse('<Response></Response>', {
        headers: { 'Content-Type': 'text/xml' }
      })
    }
    
    // Extract message data
    const messageData = {
      messageSid: params.get('MessageSid') || params.get('SmsSid') || '',
      body: params.get('Body') || '',
      from: params.get('From') || '',
      to: params.get('To') || '',
      fromCountry: params.get('FromCountry'),
      fromCity: params.get('FromCity'),
    }
    
    if (!messageData.body || !messageData.from) {
      console.log('Empty message or missing from number, ignoring')
      return new NextResponse('<Response></Response>', {
        headers: { 'Content-Type': 'text/xml' }
      })
    }
    
    console.log('Processing message:', messageData)
    
    // Determine if this is WhatsApp or SMS
    const isWhatsApp = messageData.from.includes('whatsapp:') || messageData.to.includes('whatsapp:')
    const cleanedFrom = messageData.from.replace('whatsapp:', '')
    const cleanedTo = messageData.to.replace('whatsapp:', '')
    const channel = isWhatsApp ? 'whatsapp' : 'sms'
    
    // Create admin Supabase client for database operations
    const adminSupabase = createAdminClient()
    
    // Get organization from phone number
    const phoneWithoutPrefix = cleanedFrom.startsWith('+44') 
      ? cleanedFrom.replace('+44', '0') 
      : cleanedFrom
    
    // Try to find organization by lead phone number
    const { data: lead } = await adminSupabase
      .from('leads')
      .select('id, organization_id')
      .or(`phone.eq.${cleanedFrom},phone.eq.${phoneWithoutPrefix}`)
      .single()
    
    const organizationId = lead?.organization_id || '63589490-8f55-4157-bd3a-e141594b748e'
    
    // Log incoming message
    const tableName = isWhatsApp ? 'whatsapp_logs' : 'sms_logs'
    const logData = {
      message_id: messageData.messageSid,
      to: messageData.to,
      from_number: cleanedFrom,
      message: messageData.body,
      status: 'received',
      organization_id: organizationId
    }
    
    console.log(`Saving incoming ${channel} message:`, logData)
    await adminSupabase.from(tableName).insert(logData)
    
    // Save to conversation context
    const contextMessage = {
      role: 'user',
      content: messageData.body,
      timestamp: new Date().toISOString()
    }
    
    const { data: contextResult } = await adminSupabase.rpc('append_to_conversation', {
      p_organization_id: organizationId,
      p_phone_number: cleanedFrom,
      p_channel: channel,
      p_message: contextMessage
    })
    
    console.log('Saved to conversation context:', contextResult)
    
    // Handle specific keywords or commands
    const lowerBody = messageData.body.toLowerCase().trim()
    let responseMessage = null
    
    switch (lowerBody) {
      case 'stop':
      case 'unsubscribe':
        await handleUnsubscribe(cleanedFrom)
        responseMessage = "You've been unsubscribed from our messages. Reply START to resubscribe."
        break
        
      case 'start':
      case 'subscribe':
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
        responseMessage = "Thanks for your interest in renewing! Our team will contact you shortly with renewal options."
        break
        
      default:
        // Use AI to generate response with conversation context
        try {
          // Get conversation history
          const { data: conversationContext } = await adminSupabase.rpc('get_conversation_context', {
            p_organization_id: organizationId,
            p_phone_number: cleanedFrom,
            p_channel: channel
          })
          
          console.log('Retrieved conversation context:', {
            messageCount: conversationContext?.length || 0,
            lastMessages: conversationContext?.slice(-3) || []
          })
          
          // Fetch relevant knowledge
          const knowledge = await fetchRelevantKnowledge(messageData.body)
          const knowledgeContext = formatKnowledgeContext(knowledge)
          
          // Generate AI response with context
          const aiResponse = await generateAIResponse(
            messageData.body, 
            cleanedFrom,
            knowledgeContext,
            conversationContext || []
          )
          
          responseMessage = aiResponse.response
          
          // Save AI response to conversation context
          const aiContextMessage = {
            role: 'assistant',
            content: responseMessage,
            timestamp: new Date().toISOString()
          }
          
          await adminSupabase.rpc('append_to_conversation', {
            p_organization_id: organizationId,
            p_phone_number: cleanedFrom,
            p_channel: channel,
            p_message: aiContextMessage
          })
          
          // Log any extracted information
          if (aiResponse.extractedInfo) {
            console.log('AI extracted information:', aiResponse.extractedInfo)
            // TODO: Update lead record with extracted info
          }
          
          if (aiResponse.bookingIntent) {
            console.log('AI detected booking intent')
            // TODO: Create task for staff follow-up
          }
          
        } catch (error) {
          console.error('AI response generation failed:', error)
          responseMessage = "Thanks for your message! Our team will get back to you shortly."
        }
        break
    }
    
    // Send response if we have one
    if (responseMessage) {
      const twiml = new twilio.twiml.MessagingResponse()
      twiml.message(responseMessage)
      
      // Log outgoing message to the appropriate table
      const outgoingLog = {
        message_id: `AI-${Date.now()}`, // Generate a unique ID for AI responses
        to: cleanedFrom,
        from_number: cleanedTo, // The business number
        message: responseMessage,
        status: 'sent',
        organization_id: organizationId
      }
      
      // Save to the appropriate logs table
      await adminSupabase.from(tableName).insert(outgoingLog)
      
      return new NextResponse(twiml.toString(), {
        headers: { 'Content-Type': 'text/xml' }
      })
    }
    
    // Return empty response if no message to send
    return new NextResponse('<Response></Response>', {
      headers: { 'Content-Type': 'text/xml' }
    })
    
  } catch (error) {
    console.error('Webhook error:', error)
    return new NextResponse('<Response></Response>', {
      headers: { 'Content-Type': 'text/xml' },
      status: 200
    })
  }
}

// Helper functions
async function handleUnsubscribe(phoneNumber: string) {
  const adminSupabase = createAdminClient()
  
  // Update lead/contact as unsubscribed
  await adminSupabase
    .from('leads')
    .update({ subscribed: false })
    .or(`phone.eq.${phoneNumber}`)
  
  await adminSupabase
    .from('contacts')
    .update({ subscribed: false })
    .eq('phone', phoneNumber)
}

async function handleResubscribe(phoneNumber: string) {
  const adminSupabase = createAdminClient()
  
  // Update lead/contact as subscribed
  await adminSupabase
    .from('leads')
    .update({ subscribed: true })
    .or(`phone.eq.${phoneNumber}`)
  
  await adminSupabase
    .from('contacts')
    .update({ subscribed: true })
    .eq('phone', phoneNumber)
}