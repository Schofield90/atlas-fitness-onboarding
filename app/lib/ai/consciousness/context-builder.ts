import { createClient } from '@/app/lib/supabase/server'
import { AIMemorySystem } from './memory'
import { AttentionSystem } from './attention'
import { LearningSystem } from './learning'

export interface Context {
  query: string
  intent: Intent
  entities: Entity[]
  relevantData: any[]
  networkInsights: any[]
  temporalContext: TemporalContext
  businessContext: BusinessContext
  confidence: number
}

export interface Intent {
  type: string
  confidence: number
  parameters: any
}

export interface Entity {
  id: string
  type: string
  name: string
  relevance: number
  attributes: any
}

export interface TemporalContext {
  currentTime: Date
  timeframe?: {
    start: Date
    end: Date
  }
  trends: any[]
  seasonality: any
}

export interface BusinessContext {
  organizationId: string
  industry: string
  size: string
  metrics: any
  goals: any[]
}

export class ContextBuilder {
  private memory: AIMemorySystem
  private attention: AttentionSystem
  private learning: LearningSystem
  
  constructor() {
    this.memory = new AIMemorySystem()
    this.attention = new AttentionSystem()
    this.learning = new LearningSystem()
  }
  
  async buildContext(
    query: string,
    organizationId: string
  ): Promise<Context> {
    // 1. Understand intent
    const intent = await this.detectIntent(query)
    
    // 2. Extract entities
    const entities = await this.extractEntities(query, organizationId)
    
    // 3. Gather all relevant data
    const relevantData = await this.searchAcrossEverything(intent, entities, organizationId)
    
    // 4. Get network insights
    const networkInsights = await this.getNetworkInsights(intent, organizationId)
    
    // 5. Build temporal context
    const temporalContext = await this.buildTemporalContext(query, relevantData)
    
    // 6. Build business context
    const businessContext = await this.buildBusinessContext(organizationId)
    
    // 7. Calculate confidence
    const confidence = this.calculateConfidence(intent, entities, relevantData)
    
    return {
      query,
      intent,
      entities,
      relevantData,
      networkInsights,
      temporalContext,
      businessContext,
      confidence
    }
  }
  
  async searchAcrossEverything(
    intent: Intent,
    entities: Entity[],
    organizationId: string
  ): Promise<any[]> {
    const searches = await Promise.all([
      this.searchEmails(intent, entities, organizationId),
      this.searchInteractions(intent, entities, organizationId),
      this.searchAttendance(intent, entities, organizationId),
      this.searchPayments(intent, entities, organizationId),
      this.searchDocuments(intent, entities, organizationId),
      this.searchSOPs(intent, entities, organizationId),
      this.searchCampaigns(intent, entities, organizationId),
      this.searchBookings(intent, entities, organizationId),
      this.searchStaff(intent, entities, organizationId),
      this.searchMemories(intent, entities, organizationId)
    ])
    
    return this.mergeAndRank(searches.flat())
  }
  
  private async detectIntent(query: string): Promise<Intent> {
    const intents = {
      revenue_analysis: ['revenue', 'income', 'earnings', 'money', 'profit'],
      churn_analysis: ['cancel', 'leave', 'quit', 'churn', 'retention'],
      performance_analysis: ['performance', 'metrics', 'kpi', 'results'],
      member_analysis: ['member', 'client', 'customer', 'user'],
      class_analysis: ['class', 'session', 'booking', 'attendance'],
      prediction: ['will', 'predict', 'forecast', 'expect', 'likely'],
      comparison: ['compare', 'versus', 'difference', 'better', 'worse'],
      root_cause: ['why', 'cause', 'reason', 'because'],
      recommendation: ['should', 'recommend', 'suggest', 'advice']
    }
    
    const lowerQuery = query.toLowerCase()
    let detectedIntent = 'general_query'
    let maxScore = 0
    
    for (const [intent, keywords] of Object.entries(intents)) {
      const score = keywords.filter(k => lowerQuery.includes(k)).length
      if (score > maxScore) {
        maxScore = score
        detectedIntent = intent
      }
    }
    
    return {
      type: detectedIntent,
      confidence: maxScore > 0 ? Math.min(maxScore * 0.3, 1) : 0.5,
      parameters: this.extractIntentParameters(query, detectedIntent)
    }
  }
  
  private async extractEntities(query: string, organizationId: string): Promise<Entity[]> {
    const supabase = await createClient()
    const entities: Entity[] = []
    
    // Extract client/member names
    const { data: clients } = await supabase
      .from('leads')
      .select('id, name')
      .eq('organization_id', organizationId)
      .ilike('name', `%${query}%`)
      .limit(5)
    
    if (clients) {
      entities.push(...clients.map(c => ({
        id: c.id,
        type: 'client',
        name: c.name,
        relevance: 0.9,
        attributes: {}
      })))
    }
    
    // Extract class names
    const { data: classes } = await supabase
      .from('programs')
      .select('id, name')
      .eq('organization_id', organizationId)
      .ilike('name', `%${query}%`)
      .limit(5)
    
    if (classes) {
      entities.push(...classes.map(c => ({
        id: c.id,
        type: 'class',
        name: c.name,
        relevance: 0.8,
        attributes: {}
      })))
    }
    
    // Extract time periods
    const timeEntities = this.extractTimeEntities(query)
    entities.push(...timeEntities)
    
    // Extract metrics
    const metricEntities = this.extractMetricEntities(query)
    entities.push(...metricEntities)
    
    return entities
  }
  
  private async searchEmails(
    intent: Intent,
    entities: Entity[],
    organizationId: string
  ): Promise<any[]> {
    const supabase = await createClient()
    const results: any[] = []
    
    // Search emails related to entities
    for (const entity of entities.filter(e => e.type === 'client')) {
      const { data } = await supabase
        .from('email_logs')
        .select('*')
        .eq('organization_id', organizationId)
        .or(`to_email.ilike.%${entity.name}%,from_email.ilike.%${entity.name}%`)
        .order('created_at', { ascending: false })
        .limit(10)
      
      if (data) {
        results.push(...data.map(email => ({
          type: 'email',
          data: email,
          relevance: this.calculateRelevance(email, intent, entities)
        })))
      }
    }
    
    return results
  }
  
  private async searchInteractions(
    intent: Intent,
    entities: Entity[],
    organizationId: string
  ): Promise<any[]> {
    const supabase = await createClient()
    const results: any[] = []
    
    // Search WhatsApp and SMS interactions
    const tables = ['whatsapp_logs', 'sms_logs']
    
    for (const table of tables) {
      const { data } = await supabase
        .from(table)
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(20)
      
      if (data) {
        results.push(...data.map(log => ({
          type: table.replace('_logs', ''),
          data: log,
          relevance: this.calculateRelevance(log, intent, entities)
        })))
      }
    }
    
    return results
  }
  
  private async searchAttendance(
    intent: Intent,
    entities: Entity[],
    organizationId: string
  ): Promise<any[]> {
    const supabase = await createClient()
    const results: any[] = []
    
    // Search attendance records
    const { data } = await supabase
      .from('bookings')
      .select(`
        *,
        class_sessions (
          *,
          programs (*)
        )
      `)
      .eq('organization_id', organizationId)
      .in('status', ['attended', 'no_show'])
      .order('created_at', { ascending: false })
      .limit(50)
    
    if (data) {
      results.push(...data.map(booking => ({
        type: 'attendance',
        data: booking,
        relevance: this.calculateRelevance(booking, intent, entities)
      })))
    }
    
    return results
  }
  
  private async searchPayments(
    intent: Intent,
    entities: Entity[],
    organizationId: string
  ): Promise<any[]> {
    const supabase = await createClient()
    const results: any[] = []
    
    // Search payment transactions
    const { data } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(50)
    
    if (data) {
      results.push(...data.map(payment => ({
        type: 'payment',
        data: payment,
        relevance: this.calculateRelevance(payment, intent, entities)
      })))
    }
    
    return results
  }
  
  private async searchDocuments(
    intent: Intent,
    entities: Entity[],
    organizationId: string
  ): Promise<any[]> {
    const supabase = await createClient()
    const results: any[] = []
    
    // Search forms and documents
    const { data } = await supabase
      .from('forms')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(20)
    
    if (data) {
      results.push(...data.map(form => ({
        type: 'document',
        data: form,
        relevance: this.calculateRelevance(form, intent, entities)
      })))
    }
    
    return results
  }
  
  private async searchSOPs(
    intent: Intent,
    entities: Entity[],
    organizationId: string
  ): Promise<any[]> {
    const supabase = await createClient()
    const results: any[] = []
    
    // Search SOPs
    const { data } = await supabase
      .from('sops')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
    
    if (data) {
      results.push(...data.map(sop => ({
        type: 'sop',
        data: sop,
        relevance: this.calculateRelevance(sop, intent, entities)
      })))
    }
    
    return results
  }
  
  private async searchCampaigns(
    intent: Intent,
    entities: Entity[],
    organizationId: string
  ): Promise<any[]> {
    const supabase = await createClient()
    const results: any[] = []
    
    // Search campaigns and automations
    const { data } = await supabase
      .from('workflows')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(20)
    
    if (data) {
      results.push(...data.map(workflow => ({
        type: 'campaign',
        data: workflow,
        relevance: this.calculateRelevance(workflow, intent, entities)
      })))
    }
    
    return results
  }
  
  private async searchBookings(
    intent: Intent,
    entities: Entity[],
    organizationId: string
  ): Promise<any[]> {
    const supabase = await createClient()
    const results: any[] = []
    
    // Search bookings
    const { data } = await supabase
      .from('bookings')
      .select(`
        *,
        class_sessions (
          *,
          programs (*)
        )
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(50)
    
    if (data) {
      results.push(...data.map(booking => ({
        type: 'booking',
        data: booking,
        relevance: this.calculateRelevance(booking, intent, entities)
      })))
    }
    
    return results
  }
  
  private async searchStaff(
    intent: Intent,
    entities: Entity[],
    organizationId: string
  ): Promise<any[]> {
    const supabase = await createClient()
    const results: any[] = []
    
    // Search staff data
    const { data } = await supabase
      .from('staff')
      .select('*')
      .eq('organization_id', organizationId)
    
    if (data) {
      results.push(...data.map(staff => ({
        type: 'staff',
        data: staff,
        relevance: this.calculateRelevance(staff, intent, entities)
      })))
    }
    
    return results
  }
  
  private async searchMemories(
    intent: Intent,
    entities: Entity[],
    organizationId: string
  ): Promise<any[]> {
    // Search AI memories
    const queryParts = [intent.type]
    entities.forEach(e => queryParts.push(e.name))
    const query = queryParts.join(' ')
    
    const memories = await this.memory.searchMemories(organizationId, query, 20)
    
    return memories.map(m => ({
      type: 'memory',
      data: m.memory,
      relevance: m.relevanceScore
    }))
  }
  
  private async getNetworkInsights(
    intent: Intent,
    organizationId: string
  ): Promise<any[]> {
    const supabase = await createClient()
    
    // Get insights from federated patterns
    const { data } = await supabase
      .from('federated_patterns')
      .select('*')
      .contains('pattern_category', [intent.type])
      .gte('confidence_score', 0.8)
      .order('confidence_score', { ascending: false })
      .limit(5)
    
    return data || []
  }
  
  private async buildTemporalContext(
    query: string,
    relevantData: any[]
  ): Promise<TemporalContext> {
    const now = new Date()
    const timeframe = this.extractTimeframe(query)
    
    return {
      currentTime: now,
      timeframe,
      trends: await this.analyzeTrends(relevantData, timeframe),
      seasonality: await this.detectSeasonality(relevantData)
    }
  }
  
  private async buildBusinessContext(organizationId: string): Promise<BusinessContext> {
    const supabase = await createClient()
    
    // Get organization details
    const { data: org } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single()
    
    // Get current metrics
    const metrics = await this.getCurrentMetrics(organizationId)
    
    // Get goals
    const goals = await this.getOrganizationGoals(organizationId)
    
    return {
      organizationId,
      industry: org?.industry || 'fitness',
      size: org?.size || 'small',
      metrics,
      goals
    }
  }
  
  private calculateConfidence(
    intent: Intent,
    entities: Entity[],
    relevantData: any[]
  ): number {
    let confidence = intent.confidence
    
    // Boost confidence based on entity matches
    confidence += entities.length * 0.1
    
    // Boost confidence based on data availability
    confidence += Math.min(relevantData.length * 0.02, 0.3)
    
    return Math.min(confidence, 1.0)
  }
  
  private calculateRelevance(
    item: any,
    intent: Intent,
    entities: Entity[]
  ): number {
    let relevance = 0.5
    
    // Check entity matches
    for (const entity of entities) {
      if (JSON.stringify(item).includes(entity.id)) {
        relevance += 0.2
      }
    }
    
    // Check recency
    if (item.created_at) {
      const daysAgo = (Date.now() - new Date(item.created_at).getTime()) / (1000 * 60 * 60 * 24)
      if (daysAgo < 7) relevance += 0.2
      else if (daysAgo < 30) relevance += 0.1
    }
    
    return Math.min(relevance, 1.0)
  }
  
  private mergeAndRank(results: any[]): any[] {
    return results
      .filter(r => r.relevance > 0.3)
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 100) // Limit context size
  }
  
  private extractIntentParameters(query: string, intent: string): any {
    // Extract parameters specific to the intent type
    return {}
  }
  
  private extractTimeEntities(query: string): Entity[] {
    const entities: Entity[] = []
    const timePatterns = {
      'today': () => new Date(),
      'yesterday': () => new Date(Date.now() - 24 * 60 * 60 * 1000),
      'this week': () => ({ start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), end: new Date() }),
      'last week': () => ({ start: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), end: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }),
      'this month': () => ({ start: new Date(new Date().getFullYear(), new Date().getMonth(), 1), end: new Date() }),
      'last month': () => {
        const d = new Date()
        return { start: new Date(d.getFullYear(), d.getMonth() - 1, 1), end: new Date(d.getFullYear(), d.getMonth(), 0) }
      }
    }
    
    for (const [pattern, getTime] of Object.entries(timePatterns)) {
      if (query.toLowerCase().includes(pattern)) {
        entities.push({
          id: `time_${pattern.replace(' ', '_')}`,
          type: 'time_period',
          name: pattern,
          relevance: 1.0,
          attributes: getTime()
        })
      }
    }
    
    return entities
  }
  
  private extractMetricEntities(query: string): Entity[] {
    const entities: Entity[] = []
    const metrics = ['revenue', 'attendance', 'retention', 'conversion', 'churn', 'growth']
    
    for (const metric of metrics) {
      if (query.toLowerCase().includes(metric)) {
        entities.push({
          id: `metric_${metric}`,
          type: 'metric',
          name: metric,
          relevance: 0.9,
          attributes: { metric }
        })
      }
    }
    
    return entities
  }
  
  private extractTimeframe(query: string): any {
    // Extract timeframe from query
    const timeEntities = this.extractTimeEntities(query)
    const timePeriod = timeEntities.find(e => e.type === 'time_period')
    return timePeriod?.attributes
  }
  
  private async analyzeTrends(data: any[], timeframe: any): Promise<any[]> {
    // Analyze trends in the data
    return []
  }
  
  private async detectSeasonality(data: any[]): Promise<any> {
    // Detect seasonal patterns
    return {}
  }
  
  private async getCurrentMetrics(organizationId: string): Promise<any> {
    // Get current business metrics
    return {}
  }
  
  private async getOrganizationGoals(organizationId: string): Promise<any[]> {
    // Get organization goals
    return []
  }
}