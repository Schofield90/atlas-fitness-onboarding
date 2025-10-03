import Anthropic from '@anthropic-ai/sdk'

let anthropicInstance: Anthropic | null = null

export function getAnthropic(): Anthropic | null {
  // Only initialize in actual server runtime, not during build
  if (typeof window !== 'undefined') {
    return null
  }
  
  if (!anthropicInstance && process.env.ANTHROPIC_API_KEY) {
    try {
      anthropicInstance = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      })
    } catch (error) {
      console.error('Failed to initialize Anthropic:', error)
      return null
    }
  }
  
  return anthropicInstance
}

export function requireAnthropic(): Anthropic {
  const anthropic = getAnthropic()
  if (!anthropic) {
    throw new Error('Anthropic is not configured. Please set ANTHROPIC_API_KEY environment variable.')
  }
  return anthropic
}