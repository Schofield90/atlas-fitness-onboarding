import { supabase } from './supabase'

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
  // Keywords to search for
  const keywords = message.toLowerCase().split(' ').filter(word => word.length > 3)
  
  // Always include core types
  const coreTypes = [KNOWLEDGE_TYPES.SOP, KNOWLEDGE_TYPES.FAQ, KNOWLEDGE_TYPES.STYLE]
  
  // Add specific types based on keywords
  const typeMapping: Record<string, KnowledgeType[]> = {
    'price': [KNOWLEDGE_TYPES.PRICING],
    'cost': [KNOWLEDGE_TYPES.PRICING],
    'membership': [KNOWLEDGE_TYPES.PRICING, KNOWLEDGE_TYPES.POLICIES],
    'class': [KNOWLEDGE_TYPES.SERVICES, KNOWLEDGE_TYPES.SCHEDULE],
    'schedule': [KNOWLEDGE_TYPES.SCHEDULE],
    'time': [KNOWLEDGE_TYPES.SCHEDULE],
    'open': [KNOWLEDGE_TYPES.SCHEDULE],
    'hour': [KNOWLEDGE_TYPES.SCHEDULE],
    'cancel': [KNOWLEDGE_TYPES.POLICIES],
    'freeze': [KNOWLEDGE_TYPES.POLICIES],
    'guest': [KNOWLEDGE_TYPES.POLICIES],
    'trainer': [KNOWLEDGE_TYPES.SERVICES],
    'pt': [KNOWLEDGE_TYPES.SERVICES],
    'facility': [KNOWLEDGE_TYPES.SERVICES],
    'equipment': [KNOWLEDGE_TYPES.SERVICES]
  }

  const relevantTypes = new Set(coreTypes)
  
  // Add types based on keywords found
  keywords.forEach(keyword => {
    Object.entries(typeMapping).forEach(([key, types]) => {
      if (keyword.includes(key)) {
        types.forEach(type => relevantTypes.add(type))
      }
    })
  })

  const { data, error } = await supabase
    .from('knowledge')
    .select('*')
    .in('type', Array.from(relevantTypes))
    .order('type', { ascending: true })

  if (error) {
    console.error('Error fetching relevant knowledge:', error)
    return []
  }

  return data || []
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