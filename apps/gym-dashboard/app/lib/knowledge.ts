import { createClient } from '@/app/lib/supabase/server'

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
  const supabase = await createClient()
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
  const supabase = await createClient()
  
  console.log('Fetching knowledge for message:', message)
  
  // First, get ALL knowledge to ensure nothing is missed
  const { data: allKnowledge, error } = await supabase
    .from('knowledge')
    .select('*')
    .order('created_at', { ascending: false })

  if (error || !allKnowledge) {
    console.error('Error fetching knowledge:', error)
    return []
  }

  console.log(`Found ${allKnowledge.length} total knowledge items`)

  // Score each knowledge item by relevance
  const scoredKnowledge = allKnowledge.map(item => {
    let score = 0
    const contentLower = item.content.toLowerCase()
    
    // Always include SOPs, FAQs, and basic info with high priority
    if (item.type === 'sop' || item.type === 'faq') score += 20
    if (item.type === 'services' || item.type === 'pricing' || item.type === 'schedule') score += 15
    
    // Check for keyword matches
    const keywords = messageLower.split(' ').filter(word => word.length > 2)
    keywords.forEach(keyword => {
      if (contentLower.includes(keyword)) score += 5
    })
    
    // Specific topic matching with higher scores
    if (messageLower.includes('location') || messageLower.includes('where') || messageLower.includes('address')) {
      if (contentLower.includes('location') || contentLower.includes('address') || 
          contentLower.includes('situated') || contentLower.includes('harrogate') || 
          contentLower.includes('york') || contentLower.includes('find us')) {
        score += 50 // High score for location queries
      }
    }
    
    if (messageLower.includes('price') || messageLower.includes('cost') || messageLower.includes('much') || messageLower.includes('£')) {
      if (item.type === 'pricing' || contentLower.includes('£') || contentLower.includes('price') || contentLower.includes('membership')) {
        score += 40
      }
    }
    
    if (messageLower.includes('hour') || messageLower.includes('open') || messageLower.includes('time') || messageLower.includes('when')) {
      if (contentLower.includes('hour') || contentLower.includes('open') || contentLower.includes('time') || item.type === 'schedule') {
        score += 30
      }
    }
    
    // Boost score for exact location names
    if (messageLower.includes('harrogate') && contentLower.includes('harrogate')) score += 30
    if (messageLower.includes('york') && contentLower.includes('york')) score += 30
    
    return { ...item, score }
  })
  
  // Sort by score
  const sorted = scoredKnowledge.sort((a, b) => b.score - a.score)
  
  // Log top scoring items
  console.log('Top scoring knowledge items:', sorted.slice(0, 5).map(item => ({
    type: item.type,
    score: item.score,
    preview: item.content.substring(0, 50) + '...'
  })))
  
  // Return all items with score > 0, but limit to top 20 to avoid context overflow
  const relevant = sorted.filter(item => item.score > 0).slice(0, 20)
  
  // Always include at least some core knowledge even if no matches
  if (relevant.length < 5) {
    const essentials = allKnowledge
      .filter(item => item.type === 'faq' || item.type === 'sop')
      .slice(0, 5)
    
    // Merge without duplicates
    essentials.forEach(essential => {
      if (!relevant.find(r => r.id === essential.id)) {
        relevant.push(essential)
      }
    })
  }
  
  console.log(`Returning ${relevant.length} relevant knowledge items`)
  return relevant
}

// Save new knowledge from training
export async function saveKnowledge(
  type: KnowledgeType,
  content: string,
  metadata?: any
): Promise<Knowledge | null> {
  const supabase = await createClient()
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
  const supabase = await createClient()
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