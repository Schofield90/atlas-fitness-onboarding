import OpenAI from 'openai'

// Create OpenAI instance lazily to avoid build-time initialization
let openaiInstance: OpenAI | null = null

export function getOpenAIClient(): OpenAI {
  if (!openaiInstance) {
    openaiInstance = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }
  return openaiInstance
}

export default { 
  get chat() {
    return getOpenAIClient().chat
  }
}