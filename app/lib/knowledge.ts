import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export const KNOWLEDGE_TYPES = {
  SOP: 'sop',
  CALL: 'call',
  FAQ: 'faq',
  STYLE: 'style',
  PRICING: 'pricing',
  SCHEDULE: 'schedule',
  SERVICES: 'services',
  POLICIES: 'policies',
  QUIZ: 'quiz',
  TRAINING: 'training'
} as const

export type KnowledgeType = typeof KNOWLEDGE_TYPES[keyof typeof KNOWLEDGE_TYPES]

export interface Knowledge {
  id: string
  type: KnowledgeType
  content: string
  metadata?: any
  created_at: string
  updated_at: string
}

// Fetch all SOPs and quiz content for AI context
export async function fetchCoreKnowledge(): Promise<Knowledge[]> {
  const { data, error } = await supabase
    .from('knowledge')
    .select('*')
    .in('type', [KNOWLEDGE_TYPES.SOP, KNOWLEDGE_TYPES.FAQ, KNOWLEDGE_TYPES.QUIZ])
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching core knowledge:', error)
    return []
  }

  return data || []
}

// Fetch context-specific knowledge based on keywords
export async function fetchRelevantKnowledge(message: string): Promise<Knowledge[]> {
  const messageLower = message.toLowerCase()
  
  // First, get ALL knowledge to ensure nothing is missed
  const { data: allKnowledge, error } = await supabase
    .from('knowledge')
    .select('*')
    .order('created_at', { ascending: false })

  if (error || !allKnowledge) {
    console.error('Error fetching knowledge:', error)
    return []
  }

  // Score each knowledge item by relevance
  const scoredKnowledge = allKnowledge.map(item => {
    let score = 0
    const contentLower = item.content.toLowerCase()
    
    // Always include SOPs and FAQs
    if (item.type === 'sop' || item.type === 'faq') score += 10
    
    // Check for keyword matches
    const keywords = messageLower.split(' ').filter(word => word.length > 2)
    keywords.forEach(keyword => {
      if (contentLower.includes(keyword)) score += 5
    })
    
    // Specific topic matching
    if (messageLower.includes('location') || messageLower.includes('where')) {
      if (contentLower.includes('location') || contentLower.includes('address') || contentLower.includes('situated')) {
        score += 20
      }
    }
    
    if (messageLower.includes('price') || messageLower.includes('cost') || messageLower.includes('much')) {
      if (item.type === 'pricing' || contentLower.includes('£') || contentLower.includes('price')) {
        score += 20
      }
    }
    
    if (messageLower.includes('hour') || messageLower.includes('open') || messageLower.includes('time')) {
      if (contentLower.includes('hour') || contentLower.includes('open') || contentLower.includes('time')) {
        score += 20
      }
    }
    
    return { ...item, score }
  })
  
  // Sort by score and return top results + all high-priority items
  const sorted = scoredKnowledge
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
  
  // Always include all SOPs and FAQs even if score is 0
  const essentials = allKnowledge.filter(item => 
    (item.type === 'sop' || item.type === 'faq') && 
    !sorted.find(s => s.id === item.id)
  )
  
  return [...sorted, ...essentials]
}

// Save new knowledge from training
export async function saveKnowledge(
  type: KnowledgeType,
  content: string,
  metadata?: any
): Promise<Knowledge | null> {
  const { data, error } = await supabase
    .from('knowledge')
    .insert([{ type, content, metadata }])
    .select()
    .single()

  if (error) {
    console.error('Error saving knowledge:', error)
    return null
  }

  return data
}

// Get interactive quiz questions
export async function getQuizQuestions(): Promise<any[]> {
  const { data, error } = await supabase
    .from('knowledge')
    .select('*')
    .eq('type', KNOWLEDGE_TYPES.QUIZ)
    .order('metadata->order', { ascending: true })

  if (error) {
    console.error('Error fetching quiz questions:', error)
    return []
  }

  return data?.map(item => {
    try {
      return JSON.parse(item.content)
    } catch {
      return null
    }
  }).filter(Boolean) || []
}