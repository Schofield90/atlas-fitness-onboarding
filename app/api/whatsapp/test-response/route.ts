import { NextRequest, NextResponse } from 'next/server'
import { generateAIResponse, formatKnowledgeContext } from '@/app/lib/ai/anthropic'
import { fetchRelevantKnowledge } from '@/app/lib/knowledge'

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json()
    
    // Fetch knowledge
    const knowledge = await fetchRelevantKnowledge(message)
    const knowledgeContext = formatKnowledgeContext(knowledge)
    
    // Log what we're sending to AI
    console.log('Test Response Debug:', {
      message,
      knowledgeFound: knowledge.length,
      knowledgeContext: knowledgeContext.substring(0, 500) + '...',
      hasGymLocations: knowledgeContext.includes('Harrogate') || knowledgeContext.includes('York')
    })
    
    // Generate AI response
    const aiResponse = await generateAIResponse(message, '+1234567890', knowledgeContext)
    
    return NextResponse.json({
      success: true,
      userMessage: message,
      aiResponse: aiResponse.message,
      debug: {
        knowledgeItemsFound: knowledge.length,
        knowledgeContainsRealData: knowledgeContext.includes('Claro Court') || knowledgeContext.includes('Auster Road'),
        firstKnowledgeItem: knowledge[0]?.content || 'No knowledge found'
      }
    })
  } catch (error) {
    console.error('Test response error:', error)
    return NextResponse.json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}