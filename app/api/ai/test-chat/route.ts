import { NextRequest, NextResponse } from 'next/server'
import { generateAIResponse, formatKnowledgeContext } from '@/app/lib/ai/anthropic'
import { fetchRelevantKnowledge } from '@/app/lib/knowledge'

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json()

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // Fetch relevant knowledge for context
    const knowledge = await fetchRelevantKnowledge(message)
    const knowledgeContext = formatKnowledgeContext(knowledge)
    
    // Generate AI response
    const aiResponse = await generateAIResponse(
      message, 
      'test-user', // Test phone number
      knowledgeContext
    )

    return NextResponse.json({
      response: aiResponse.response,
      bookingIntent: aiResponse.bookingIntent,
      extractedInfo: aiResponse.extractedInfo
    })
  } catch (error: any) {
    console.error('Test chat error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate response' },
      { status: 500 }
    )
  }
}