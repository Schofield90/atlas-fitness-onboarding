import { createClient } from '@/app/lib/supabase/server'

export interface AIFeedback {
  id: string
  user_message: string
  ai_response: string
  preferred_response: string
  feedback_category: string
  context_notes?: string
  is_active: boolean
}

export async function fetchActiveFeedback(): Promise<AIFeedback[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('ai_feedback')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Error fetching AI feedback:', error)
    return []
  }
  
  return data || []
}

export function formatFeedbackExamples(feedbacks: AIFeedback[]): string {
  if (!feedbacks || feedbacks.length === 0) {
    return ''
  }
  
  let examples = '\n\nIMPORTANT RESPONSE EXAMPLES - Learn from these preferred responses:\n\n'
  
  // Group by category
  const grouped = feedbacks.reduce((acc, feedback) => {
    if (!acc[feedback.feedback_category]) {
      acc[feedback.feedback_category] = []
    }
    acc[feedback.feedback_category].push(feedback)
    return acc
  }, {} as Record<string, AIFeedback[]>)
  
  // Format each category
  Object.entries(grouped).forEach(([category, items]) => {
    examples += `${category.toUpperCase().replace('_', ' ')} EXAMPLES:\n`
    items.slice(0, 3).forEach((item, index) => { // Limit to 3 examples per category
      examples += `\nExample ${index + 1}:\n`
      examples += `User: "${item.user_message}"\n`
      examples += `DON'T respond like: "${item.ai_response}"\n`
      examples += `DO respond like: "${item.preferred_response}"\n`
      if (item.context_notes) {
        examples += `Note: ${item.context_notes}\n`
      }
    })
    examples += '\n'
  })
  
  return examples
}