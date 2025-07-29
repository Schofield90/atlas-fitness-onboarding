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
    // Check if this is a status callback (not an actual message)
    const messageStatus = params.get('MessageStatus') || params.get('SmsStatus')
    if (messageStatus && !params.get('Body')) {
      console.log('Ignoring status callback:', messageStatus)
      return new NextResponse('', { status: 200 })
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

    // Skip processing if there's no actual message content
    if (!messageData.body || !messageData.from) {
      console.log('Skipping webhook - no message body or from number')
      return new NextResponse('', { status: 200 })
    }

    // Determine if it's WhatsApp or SMS
    const isWhatsApp = messageData.from.startsWith('whatsapp:')
    const cleanedFrom = messageData.from.replace('whatsapp:', '')

    console.log(`Received ${isWhatsApp ? 'WhatsApp' : 'SMS'} message:`, {
      from: cleanedFrom,
      body: messageData.body
    })

    // Store the incoming message - use admin client to bypass RLS
    const { createAdminClient } = await import('@/app/lib/supabase/admin')
    const adminSupabase = createAdminClient()
    const tableName = isWhatsApp ? 'whatsapp_logs' : 'sms_logs'
    
    const logData = {
      message_id: messageData.messageSid,
      to: messageData.to,
      from_number: cleanedFrom,
      message: messageData.body,
      status: 'received',
      has_media: parseInt(messageData.numMedia) > 0,
      ...(isWhatsApp && messageData.mediaUrl && { media_urls: [messageData.mediaUrl] })
    }
    
    console.log(`Saving incoming ${isWhatsApp ? 'WhatsApp' : 'SMS'} to ${tableName}:`, logData)
    
    const { error: insertError } = await adminSupabase.from(tableName).insert(logData)
    
    if (insertError) {
      console.error(`Failed to save incoming message to ${tableName}:`, insertError)
    } else {
      console.log(`Successfully saved incoming message to ${tableName}`)
    }

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
        // Check if this is a training message from your personal number
        if (cleanedFrom === '+447490253471' && messageData.body.toLowerCase().startsWith('train:')) {
          responseMessage = await handleTrainingMessage(messageData.body, cleanedFrom)
          break
        }
        
        // Use AI to generate response
        try {
          // First, fetch ALL knowledge to ensure we have data
          const { fetchCoreKnowledge } = await import('@/app/lib/knowledge')
          const coreKnowledge = await fetchCoreKnowledge()
          console.log('Core knowledge check:', {
            coreItemsCount: coreKnowledge.length,
            hasCoreData: coreKnowledge.length > 0
          })
          
          // Fetch relevant knowledge for context
          const knowledge = await fetchRelevantKnowledge(messageData.body)
          const knowledgeContext = formatKnowledgeContext(knowledge)
          
          // Comprehensive knowledge debugging
          console.log('Knowledge fetching debug:', {
            messageQuery: messageData.body,
            knowledgeItemsCount: knowledge.length,
            knowledgeTypes: knowledge.map(k => k.type),
            contextLength: knowledgeContext.length,
            hasRealData: knowledgeContext.includes('Harrogate') || knowledgeContext.includes('York') || knowledgeContext.includes('Claro Court'),
            knowledgePreview: knowledge.slice(0, 5).map(k => ({
              type: k.type,
              content: k.content.substring(0, 100) + '...'
            }))
          })
          
          // Log full context if it's a location question
          if (messageData.body.toLowerCase().includes('where') || messageData.body.toLowerCase().includes('location')) {
            const locationKnowledge = knowledge.filter(k => 
              k.content.toLowerCase().includes('location') || 
              k.content.toLowerCase().includes('address') ||
              k.content.toLowerCase().includes('street') ||
              k.content.toLowerCase().includes('harrogate') ||
              k.content.toLowerCase().includes('york')
            )
            console.log('Location-specific knowledge found:', {
              count: locationKnowledge.length,
              items: locationKnowledge.map(k => ({
                type: k.type,
                content: k.content
              }))
            })
            
            // Log the exact context being sent to AI
            console.log('Context snippet for location:', knowledgeContext.substring(0, 500))
          }
          
          let aiResponse = null
          
          // If no knowledge found, log a warning
          if (knowledge.length === 0) {
            console.warn('WARNING: No knowledge found for query:', messageData.body)
            console.warn('Using fallback - checking if core knowledge exists...')
            if (coreKnowledge.length > 0) {
              console.log('Using core knowledge as fallback')
              const fallbackContext = formatKnowledgeContext(coreKnowledge)
              aiResponse = await generateAIResponse(messageData.body, cleanedFrom, fallbackContext)
              responseMessage = aiResponse.message
            } else {
              throw new Error('No knowledge data available in database')
            }
          } else {
            // Generate AI response with found knowledge
            aiResponse = await generateAIResponse(messageData.body, cleanedFrom, knowledgeContext)
            responseMessage = aiResponse.message
            
            console.log('AI Response generated:', {
              userMessage: messageData.body,
              aiResponse: responseMessage,
              usedRealData: responseMessage.includes('Harrogate') || responseMessage.includes('York') || responseMessage.includes('Claro Court')
            })
          }
          
          // Log if booking intent detected
          if (aiResponse && aiResponse.shouldBookAppointment) {
            console.log('Booking intent detected for:', cleanedFrom)
            // TODO: Implement booking flow
          }
          
          // Save extracted info if any
          if (aiResponse && aiResponse.extractedInfo?.email) {
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

// Handle training messages from your personal WhatsApp
async function handleTrainingMessage(message: string, fromNumber: string): Promise<string> {
  const supabase = await createClient()
  
  try {
    // Remove 'train:' prefix and parse the message
    const trainingContent = message.substring(6).trim()
    
    // Format 1: train: Q: <question> A: <preferred answer>
    const format1Match = trainingContent.match(/Q:\s*(.+?)\s*A:\s*(.+)/i)
    
    // Format 2: train: <current response> -> <preferred response>
    const format2Match = trainingContent.match(/(.+?)\s*->\s*(.+)/)
    
    // Format 3: train: bad: <bad response> good: <good response> for: <user message>
    const format3Match = trainingContent.match(/bad:\s*(.+?)\s*good:\s*(.+?)\s*for:\s*(.+)/i)
    
    let userMessage = ''
    let aiResponse = ''
    let preferredResponse = ''
    let category = 'tone' // default category
    
    if (format1Match) {
      // Q&A format
      userMessage = format1Match[1].trim()
      preferredResponse = format1Match[2].trim()
      aiResponse = 'Current AI response not provided'
      category = 'accuracy'
    } else if (format3Match) {
      // Bad/Good format
      aiResponse = format3Match[1].trim()
      preferredResponse = format3Match[2].trim()
      userMessage = format3Match[3].trim()
      category = 'tone'
    } else if (format2Match) {
      // Simple arrow format (need to fetch last user message)
      aiResponse = format2Match[1].trim()
      preferredResponse = format2Match[2].trim()
      
      // Try to get the last message from this conversation
      const { data: lastLog } = await supabase
        .from('whatsapp_logs')
        .select('message')
        .eq('from_number', fromNumber.replace('+', ''))
        .neq('message', message)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      
      userMessage = lastLog?.message || 'Previous user message'
    } else {
      return `❌ Invalid training format. Use one of:
1) train: Q: <question> A: <answer>
2) train: <current> -> <preferred>
3) train: bad: <bad> good: <good> for: <question>`
    }
    
    // Detect category based on content
    if (preferredResponse.length > aiResponse.length * 1.5) {
      category = 'length'
    } else if (preferredResponse.includes('£') || preferredResponse.includes('price')) {
      category = 'accuracy'
    } else if (preferredResponse.includes('book') || preferredResponse.includes('trial')) {
      category = 'sales_approach'
    }
    
    // Save to ai_feedback table
    const { data, error } = await supabase
      .from('ai_feedback')
      .insert({
        user_message: userMessage,
        ai_response: aiResponse,
        preferred_response: preferredResponse,
        feedback_category: category,
        context_notes: `Trained via WhatsApp by ${fromNumber}`,
        is_active: true
      })
      .select()
    
    if (error) {
      console.error('Error saving training:', error)
      return '❌ Failed to save training. Please try again.'
    }
    
    return `✅ Training saved!
📝 User: "${userMessage}"
❌ Old: "${aiResponse.substring(0, 50)}..."
✅ New: "${preferredResponse.substring(0, 50)}..."
🏷️ Category: ${category}

Your AI will now use this example.`
    
  } catch (error) {
    console.error('Training error:', error)
    return '❌ Error processing training. Please check format and try again.'
  }
}