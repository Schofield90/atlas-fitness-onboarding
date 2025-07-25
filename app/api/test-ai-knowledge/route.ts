import { NextRequest, NextResponse } from 'next/server'
import { fetchRelevantKnowledge } from '@/app/lib/knowledge'
import { generateAIResponse, formatKnowledgeContext } from '@/app/lib/ai/anthropic'

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json()

    // Fetch knowledge
    const knowledge = await fetchRelevantKnowledge(message)
    const knowledgeContext = formatKnowledgeContext(knowledge)
    
    // Generate AI response
    const aiResponse = await generateAIResponse(message, 'test-user', knowledgeContext)

    return NextResponse.json({
      userMessage: message,
      knowledgeFound: {
        count: knowledge.length,
        items: knowledge.map(k => ({
          type: k.type,
          content: k.content,
          metadata: k.metadata
        }))
      },
      knowledgeContext: knowledgeContext,
      aiResponse: aiResponse.message,
      debug: {
        contextLength: knowledgeContext.length,
        hasLocationInfo: knowledge.some(k => k.content.toLowerCase().includes('location')),
        hasPricingInfo: knowledge.some(k => k.content.toLowerCase().includes('£') || k.type === 'pricing'),
        hasHoursInfo: knowledge.some(k => k.content.toLowerCase().includes('hour') || k.content.toLowerCase().includes('open'))
      }
    })
  } catch (error: any) {
    return NextResponse.json({ 
      error: 'Test failed', 
      message: error.message 
    }, { status: 500 })
  }
}