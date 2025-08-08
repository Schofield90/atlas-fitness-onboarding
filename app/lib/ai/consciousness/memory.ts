import { createClient } from '@/app/lib/supabase/server'
import { OpenAI } from 'openai'

export interface Memory {
  id: string
  organizationId: string
  memoryType: string
  entityType: string
  entityId?: string
  content: string
  embedding?: number[]
  metadata?: any
  importanceScore: number
  accessFrequency: number
  lastAccessed?: Date
  createdAt: Date
}

export interface MemorySearchResult {
  memory: Memory
  similarity: number
  relevanceScore: number
}

export class AIMemorySystem {
  private openai: OpenAI
  
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })
  }
  
  async storeMemory(
    organizationId: string,
    memoryType: string,
    entityType: string,
    content: string,
    metadata?: any,
    entityId?: string
  ): Promise<Memory> {
    const supabase = await createClient()
    
    // Generate embedding for the content
    const embedding = await this.generateEmbedding(content)
    
    // Calculate importance score based on content and type
    const importanceScore = await this.calculateImportance(memoryType, content, metadata)
    
    const { data, error } = await supabase
      .from('ai_memory')
      .insert({
        organization_id: organizationId,
        memory_type: memoryType,
        entity_type: entityType,
        entity_id: entityId,
        content: content,
        embedding: embedding,
        metadata: metadata,
        importance_score: importanceScore,
        access_frequency: 0
      })
      .select()
      .single()
    
    if (error) throw error
    
    return this.transformMemory(data)
  }
  
  async searchMemories(
    organizationId: string,
    query: string,
    limit: number = 10,
    threshold: number = 0.7
  ): Promise<MemorySearchResult[]> {
    const supabase = await createClient()
    
    // Generate embedding for the search query
    const queryEmbedding = await this.generateEmbedding(query)
    
    // Use pgvector similarity search
    const { data, error } = await supabase.rpc('search_memories', {
      query_embedding: queryEmbedding,
      org_id: organizationId,
      match_threshold: threshold,
      match_count: limit
    })
    
    if (error) throw error
    
    // Update access frequency for retrieved memories
    const memoryIds = data.map((d: any) => d.id)
    await this.updateAccessFrequency(memoryIds)
    
    return data.map((item: any) => ({
      memory: this.transformMemory(item),
      similarity: item.similarity,
      relevanceScore: this.calculateRelevanceScore(item)
    }))
  }
  
  async getRelatedMemories(
    organizationId: string,
    memoryId: string,
    limit: number = 5
  ): Promise<MemorySearchResult[]> {
    const supabase = await createClient()
    
    // Get the original memory
    const { data: memory, error: memoryError } = await supabase
      .from('ai_memory')
      .select('*')
      .eq('id', memoryId)
      .single()
    
    if (memoryError) throw memoryError
    
    // Find similar memories
    const { data, error } = await supabase.rpc('find_similar_memories', {
      memory_embedding: memory.embedding,
      org_id: organizationId,
      memory_id: memoryId,
      match_count: limit
    })
    
    if (error) throw error
    
    return data.map((item: any) => ({
      memory: this.transformMemory(item),
      similarity: item.similarity,
      relevanceScore: this.calculateRelevanceScore(item)
    }))
  }
  
  async consolidateMemories(organizationId: string): Promise<void> {
    const supabase = await createClient()
    
    // Find duplicate or highly similar memories
    const { data: duplicates, error } = await supabase.rpc('find_duplicate_memories', {
      org_id: organizationId,
      similarity_threshold: 0.95
    })
    
    if (error) throw error
    
    // Merge duplicates into consolidated memories
    for (const group of duplicates) {
      await this.mergeDuplicateMemories(group)
    }
    
    // Archive old, infrequently accessed memories
    await this.archiveOldMemories(organizationId)
  }
  
  async forgetMemory(memoryId: string): Promise<void> {
    const supabase = await createClient()
    
    const { error } = await supabase
      .from('ai_memory')
      .delete()
      .eq('id', memoryId)
    
    if (error) throw error
  }
  
  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text
      })
      
      return response.data[0].embedding
    } catch (error) {
      console.error('Error generating embedding:', error)
      throw error
    }
  }
  
  private async calculateImportance(
    memoryType: string,
    content: string,
    metadata?: any
  ): Promise<number> {
    // Base importance by type
    const typeScores: Record<string, number> = {
      'payment': 0.8,
      'cancellation': 0.9,
      'complaint': 0.95,
      'attendance': 0.6,
      'interaction': 0.7,
      'document': 0.75,
      'insight': 0.85
    }
    
    let score = typeScores[memoryType] || 0.5
    
    // Adjust based on content characteristics
    if (content.length > 500) score += 0.1
    if (metadata?.revenue_impact) score += 0.2
    if (metadata?.customer_lifetime_value > 1000) score += 0.15
    
    return Math.min(score, 1.0)
  }
  
  private calculateRelevanceScore(item: any): number {
    // Combine similarity with importance and recency
    const recencyScore = this.getRecencyScore(new Date(item.created_at))
    return (item.similarity * 0.5) + (item.importance_score * 0.3) + (recencyScore * 0.2)
  }
  
  private getRecencyScore(date: Date): number {
    const daysAgo = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)
    if (daysAgo < 7) return 1.0
    if (daysAgo < 30) return 0.8
    if (daysAgo < 90) return 0.6
    if (daysAgo < 365) return 0.4
    return 0.2
  }
  
  private async updateAccessFrequency(memoryIds: string[]): Promise<void> {
    const supabase = await createClient()
    
    await supabase.rpc('increment_memory_access', {
      memory_ids: memoryIds
    })
  }
  
  private async mergeDuplicateMemories(group: any[]): Promise<void> {
    // Implement memory consolidation logic
    // Keep the most comprehensive version, merge metadata
  }
  
  private async archiveOldMemories(organizationId: string): Promise<void> {
    const supabase = await createClient()
    
    // Archive memories older than 1 year with low access frequency
    await supabase
      .from('ai_memory')
      .update({ memory_type: 'archived' })
      .eq('organization_id', organizationId)
      .lt('last_accessed', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString())
      .lt('access_frequency', 5)
  }
  
  private transformMemory(data: any): Memory {
    return {
      id: data.id,
      organizationId: data.organization_id,
      memoryType: data.memory_type,
      entityType: data.entity_type,
      entityId: data.entity_id,
      content: data.content,
      embedding: data.embedding,
      metadata: data.metadata,
      importanceScore: data.importance_score,
      accessFrequency: data.access_frequency,
      lastAccessed: data.last_accessed ? new Date(data.last_accessed) : undefined,
      createdAt: new Date(data.created_at)
    }
  }
}