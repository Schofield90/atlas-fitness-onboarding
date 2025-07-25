import Anthropic from '@anthropic-ai/sdk'

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
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
  knowledgeContext: string
): Promise<AIResponse> {
  try {
    const systemPrompt = `You are a professional gym business WhatsApp sales assistant. Your role is to engage with potential and existing gym members, answer their questions, and guide them towards booking a trial or membership.

CONTEXT AND KNOWLEDGE:
${knowledgeContext}

KEY BEHAVIORS:
1. Be friendly, enthusiastic, and encouraging about fitness
2. Keep responses concise (under 300 characters ideal for WhatsApp)
3. Always aim to book trials, tours, or collect contact details
4. Use the knowledge provided to answer accurately
5. If unsure, offer to have someone call them back
6. Create urgency with limited-time offers when appropriate
7. Use emojis sparingly for friendliness 💪

RESPONSE RULES:
- Maximum 2-3 sentences per response
- End with a question or clear call-to-action
- If they show interest, immediately offer booking times
- Extract and note any contact information shared

BOOKING TRIGGERS:
If the user expresses any of these, try to book them:
- Interest in joining
- Asking about trials
- Requesting a tour
- Wanting to start fitness journey
- Asking about specific classes

Remember: You're chatting via WhatsApp, so keep it conversational and mobile-friendly.`

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 300,
      temperature: 0.7,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userMessage,
        },
      ],
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
    return 'No specific knowledge available. Use general gym industry knowledge.'
  }

  const grouped = knowledgeRecords.reduce((acc, record) => {
    if (!acc[record.type]) {
      acc[record.type] = []
    }
    acc[record.type].push(record.content)
    return acc
  }, {} as Record<string, string[]>)

  let context = ''
  
  // Format each type of knowledge
  Object.entries(grouped).forEach(([type, contents]) => {
    const typeLabel = type.toUpperCase().replace('_', ' ')
    context += `\n${typeLabel}:\n`
    contents.forEach((content, index) => {
      context += `${index + 1}. ${content}\n`
    })
  })

  return context
}