// AI Model Configuration - Centralized model management
// Automatically uses the latest available OpenAI model

export interface AIModel {
  id: string
  name: string
  provider: 'openai' | 'anthropic'
  type: 'chat' | 'embedding'
  maxTokens?: number
  available: boolean
}

export class AIModelManager {
  private static models: AIModel[] = [
    // GPT-5 (Ready for when it releases)
    {
      id: 'gpt-5',
      name: 'GPT-5',
      provider: 'openai',
      type: 'chat',
      maxTokens: 128000,
      available: false // Will be set to true when GPT-5 is released
    },
    {
      id: 'gpt-5-turbo',
      name: 'GPT-5 Turbo',
      provider: 'openai',
      type: 'chat',
      maxTokens: 128000,
      available: false
    },
    // GPT-4 Models (Current best)
    {
      id: 'gpt-4-turbo-preview',
      name: 'GPT-4 Turbo',
      provider: 'openai',
      type: 'chat',
      maxTokens: 128000,
      available: true
    },
    {
      id: 'gpt-4',
      name: 'GPT-4',
      provider: 'openai',
      type: 'chat',
      maxTokens: 8192,
      available: true
    },
    {
      id: 'gpt-4-32k',
      name: 'GPT-4 32K',
      provider: 'openai',
      type: 'chat',
      maxTokens: 32768,
      available: true
    },
    // GPT-3.5 (Fallback)
    {
      id: 'gpt-3.5-turbo',
      name: 'GPT-3.5 Turbo',
      provider: 'openai',
      type: 'chat',
      maxTokens: 16385,
      available: true
    },
    // Embedding Models
    {
      id: 'text-embedding-3-large',
      name: 'Text Embedding 3 Large',
      provider: 'openai',
      type: 'embedding',
      available: true
    },
    {
      id: 'text-embedding-3-small',
      name: 'Text Embedding 3 Small',
      provider: 'openai',
      type: 'embedding',
      available: true
    },
    // Anthropic Models (Backup only)
    {
      id: 'claude-3-opus-20240229',
      name: 'Claude 3 Opus',
      provider: 'anthropic',
      type: 'chat',
      maxTokens: 200000,
      available: true
    },
    {
      id: 'claude-3-sonnet-20240229',
      name: 'Claude 3 Sonnet',
      provider: 'anthropic',
      type: 'chat',
      maxTokens: 200000,
      available: true
    }
  ]
  
  /**
   * Get the best available chat model (prefers OpenAI, newest first)
   */
  static getBestChatModel(): AIModel {
    // First try to get GPT-5 if available
    const gpt5Models = this.models.filter(m => 
      m.type === 'chat' && 
      m.provider === 'openai' && 
      m.available &&
      m.id.startsWith('gpt-5')
    )
    
    if (gpt5Models.length > 0) {
      console.log('🚀 Using GPT-5 - Latest model available!')
      return gpt5Models[0]
    }
    
    // Fall back to GPT-4
    const gpt4Models = this.models.filter(m => 
      m.type === 'chat' && 
      m.provider === 'openai' && 
      m.available &&
      m.id.startsWith('gpt-4')
    )
    
    if (gpt4Models.length > 0) {
      return gpt4Models[0]
    }
    
    // Last resort - GPT-3.5
    const gpt35 = this.models.find(m => m.id === 'gpt-3.5-turbo' && m.available)
    if (gpt35) return gpt35
    
    throw new Error('No OpenAI chat models available')
  }
  
  /**
   * Get the best available embedding model
   */
  static getBestEmbeddingModel(): AIModel {
    const embeddingModels = this.models.filter(m => 
      m.type === 'embedding' && 
      m.provider === 'openai' && 
      m.available
    )
    
    // Prefer large model for better quality
    const largeModel = embeddingModels.find(m => m.id.includes('large'))
    if (largeModel) return largeModel
    
    // Fall back to small model
    const smallModel = embeddingModels.find(m => m.id.includes('small'))
    if (smallModel) return smallModel
    
    throw new Error('No OpenAI embedding models available')
  }
  
  /**
   * Get a fallback model (Anthropic) if OpenAI fails
   */
  static getFallbackChatModel(): AIModel | null {
    const anthropicModels = this.models.filter(m => 
      m.type === 'chat' && 
      m.provider === 'anthropic' && 
      m.available
    )
    
    return anthropicModels[0] || null
  }
  
  /**
   * Check if a specific model is available
   */
  static async checkModelAvailability(modelId: string): Promise<boolean> {
    try {
      // In production, this would make an API call to check
      // For now, we check our static configuration
      const model = this.models.find(m => m.id === modelId)
      return model?.available || false
    } catch (error) {
      return false
    }
  }
  
  /**
   * Update model availability (called periodically to check for new models)
   */
  static async updateModelAvailability(): Promise<void> {
    // Check if GPT-5 is available
    const gpt5Available = await this.checkModelAvailability('gpt-5')
    if (gpt5Available) {
      const gpt5Model = this.models.find(m => m.id === 'gpt-5')
      if (gpt5Model) {
        gpt5Model.available = true
        console.log('🎉 GPT-5 is now available! Switching to GPT-5.')
      }
    }
    
    // Check other models
    for (const model of this.models) {
      if (model.provider === 'openai') {
        model.available = await this.checkModelAvailability(model.id)
      }
    }
  }
  
  /**
   * Get model by ID
   */
  static getModel(modelId: string): AIModel | undefined {
    return this.models.find(m => m.id === modelId)
  }
}