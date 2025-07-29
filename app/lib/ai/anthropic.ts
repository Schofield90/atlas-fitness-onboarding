import Anthropic from '@anthropic-ai/sdk'
import { fetchActiveFeedback, formatFeedbackExamples } from './feedback'

// Debug: Check if API key is loaded
console.log('Anthropic API Key status:', {
  exists: !!process.env.ANTHROPIC_API_KEY,
  length: process.env.ANTHROPIC_API_KEY?.length || 0,
  prefix: process.env.ANTHROPIC_API_KEY?.substring(0, 10) || 'NOT_SET'
})

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

export interface AIResponse {
  message: string
  shouldBookAppointment?: boolean
  extractedInfo?: {
    name?: string
    email?: string
    phone?: string
    preferredTime?: string
  }
}

export async function generateAIResponse(
  userMessage: string,
  phoneNumber: string,
  knowledgeContext: string,
  conversationHistory?: Array<{ role: 'user' | 'assistant'; message: string; timestamp?: string }>
): Promise<AIResponse> {
  try {
    // Fetch training feedback examples
    const feedbackExamples = await fetchActiveFeedback()
    const feedbackContext = formatFeedbackExamples(feedbackExamples)
    const systemPrompt = `You are a professional gym business WhatsApp sales assistant for Atlas Fitness. Your role is to engage with potential and existing gym members, answer their questions, and guide them towards booking a trial or membership.

IMPORTANT: The following is REAL GYM DATA that you MUST use in your responses:

${knowledgeContext}
${feedbackContext}

CRITICAL RULES - YOU MUST FOLLOW THESE:
1. ALWAYS use the EXACT information provided above - this is the REAL gym data
2. When asked about location, use the EXACT addresses from the knowledge above
3. When asked about prices, use the EXACT prices from the knowledge above
4. When asked about hours, use the EXACT hours from the knowledge above
5. NEVER use placeholder data like "123 Fitness Street" - use the REAL data above
6. If specific info isn't in the knowledge above, say "Let me get that exact information for you" and offer to have someone call them

FOR LOCATION QUESTIONS:
- Check the knowledge for addresses containing "Harrogate", "York", "Claro Court", "Auster Road"
- Use the FULL address including postcodes
- Mention both locations if relevant

KEY BEHAVIORS:
1. Be friendly, enthusiastic, and encouraging about fitness
2. Keep responses concise (under 300 characters ideal for WhatsApp)
3. Always aim to book trials, tours, or collect contact details
4. Create urgency with limited-time offers when appropriate
5. Use emojis sparingly for friendliness 💪

CONVERSATION MEMORY RULES:
1. REMEMBER what the customer has already told you
2. NEVER ask for information they've already provided
3. BUILD on previous messages - don't start fresh each time
4. If they answered a question, acknowledge it and move forward
5. Track the conversation flow and progress naturally

RESPONSE FORMAT:
- Maximum 2-3 sentences per response
- End with a question or clear call-to-action
- Be conversational and mobile-friendly

DOUBLE-CHECK: Before responding, verify you're using REAL data from the knowledge section above, not generic placeholders.`

    console.log('AI Request details:', {
      modelUsed: 'claude-3-5-sonnet-20241022',
      systemPromptLength: systemPrompt.length,
      userMessageLength: userMessage.length,
      knowledgeContextLength: knowledgeContext.length
    })

    // Build messages array with conversation history
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = []
    
    // Add conversation history if provided
    if (conversationHistory && conversationHistory.length > 0) {
      // Include last 10 messages for context (5 exchanges)
      const recentHistory = conversationHistory.slice(-10)
      recentHistory.forEach(msg => {
        messages.push({
          role: msg.role,
          content: msg.message
        })
      })
    }
    
    // Add current message
    messages.push({
      role: 'user',
      content: userMessage
    })
    
    console.log('AI conversation context:', {
      historyLength: conversationHistory?.length || 0,
      messagesIncluded: messages.length,
      currentMessage: userMessage
    })

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 300,
      temperature: 0.7,
      system: systemPrompt,
      messages: messages,
    })

    const aiMessage = response.content[0].type === 'text' 
      ? response.content[0].text 
      : 'I can help you with your fitness journey! What would you like to know?'

    // Check if we should trigger booking flow
    const bookingKeywords = ['book', 'trial', 'tour', 'visit', 'appointment', 'come in', 'sign up', 'join']
    const shouldBook = bookingKeywords.some(keyword => 
      userMessage.toLowerCase().includes(keyword) || 
      aiMessage.toLowerCase().includes(keyword)
    )

    // Extract any contact information
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/
    const extractedEmail = userMessage.match(emailRegex)?.[0]

    return {
      message: aiMessage,
      shouldBookAppointment: shouldBook,
      extractedInfo: {
        email: extractedEmail,
        phone: phoneNumber,
      },
    }
  } catch (error) {
    console.error('Error generating AI response:', error)
    
    // Log more details about the error
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack,
        // If it's an Anthropic API error, it might have more details
        details: (error as any).response?.data || (error as any).details || 'No additional details'
      })
    }
    
    // Fallback response
    return {
      message: "Thanks for your message! I'm having a technical moment. Please text 'HELP' or call us at 01234 567890. We'd love to help you start your fitness journey! 💪",
      shouldBookAppointment: false,
    }
  }
}

// Generate knowledge context from database records
export function formatKnowledgeContext(knowledgeRecords: any[]): string {
  if (!knowledgeRecords || knowledgeRecords.length === 0) {
    console.warn('WARNING: No knowledge records provided to AI')
    return 'No specific knowledge available. Use general gym industry knowledge.'
  }

  console.log('Formatting knowledge context from', knowledgeRecords.length, 'records')

  // Priority order for knowledge types
  const priorityOrder = ['sop', 'faq', 'pricing', 'services', 'schedule', 'policies', 'style']
  
  // Group and sort by priority
  const grouped = knowledgeRecords.reduce((acc, record) => {
    if (!acc[record.type]) {
      acc[record.type] = []
    }
    acc[record.type].push(record.content)
    return acc
  }, {} as Record<string, string[]>)

  let context = 'IMPORTANT GYM INFORMATION (USE THIS DATA IN YOUR RESPONSES):\n\n'
  
  // Add knowledge in priority order
  priorityOrder.forEach(type => {
    if (grouped[type] && grouped[type].length > 0) {
      const typeLabel = type.toUpperCase().replace('_', ' ')
      context += `=== ${typeLabel} ===\n`
      const contentArray = grouped[type] as string[]
      contentArray.forEach((content: string, index: number) => {
        context += `${index + 1}. ${content}\n`
      })
      context += '\n'
    }
  })

  // Add any remaining types not in priority order
  Object.entries(grouped).forEach(([type, contents]) => {
    if (!priorityOrder.includes(type)) {
      const typeLabel = type.toUpperCase().replace('_', ' ')
      context += `=== ${typeLabel} ===\n`
      const contentArray = contents as string[]
      contentArray.forEach((content: string, index: number) => {
        context += `${index + 1}. ${content}\n`
      })
      context += '\n'
    }
  })

  // Log what information we're providing to the AI
  console.log('Knowledge context summary:', {
    totalLength: context.length,
    typesIncluded: Object.keys(grouped),
    hasLocationInfo: context.includes('Harrogate') || context.includes('York') || context.includes('Claro Court'),
    hasPricingInfo: context.includes('£') || context.includes('price'),
    preview: context.substring(0, 200) + '...'
  })

  return context
}