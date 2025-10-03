import { NextRequest, NextResponse } from 'next/server'
import { aiClient } from '@/app/lib/ai/providers/openai-client'
import { AIModelManager } from '@/app/lib/ai/config/ai-models'

export async function GET(request: NextRequest) {
  try {
    // Update model availability
    await AIModelManager.updateModelAvailability()
    
    // Check if GPT-5 is available
    const isGPT5Available = await aiClient.isGPT5Available()
    
    // Get current model info
    const currentModel = aiClient.getCurrentModel()
    const chatModel = AIModelManager.getBestChatModel()
    const embeddingModel = AIModelManager.getBestEmbeddingModel()
    
    return NextResponse.json({
      status: 'success',
      currentModel,
      models: {
        chat: {
          id: chatModel.id,
          name: chatModel.name,
          provider: chatModel.provider,
          maxTokens: chatModel.maxTokens
        },
        embedding: {
          id: embeddingModel.id,
          name: embeddingModel.name,
          provider: embeddingModel.provider
        }
      },
      gpt5: {
        available: isGPT5Available,
        message: isGPT5Available 
          ? '🎉 GPT-5 is available and active!' 
          : 'GPT-5 not yet available. Using GPT-4 Turbo.'
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Model status error:', error)
    return NextResponse.json(
      { error: 'Failed to get model status' },
      { status: 500 }
    )
  }
}