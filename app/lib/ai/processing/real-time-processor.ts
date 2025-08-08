import { createClient } from '@/app/lib/supabase/server'
import { RealtimeChannel } from '@supabase/supabase-js'
import { AIMemorySystem } from '../consciousness/memory'
import { AttentionSystem } from '../consciousness/attention'
import { LearningSystem } from '../consciousness/learning'
import { OpenAI } from 'openai'

export interface ProcessedEvent {
  eventType: string
  tableName: string
  operation: string
  data: any
  embedding?: number[]
  insights?: any[]
  automations?: any[]
}

export class RealTimeProcessor {
  private memory: AIMemorySystem
  private attention: AttentionSystem
  private learning: LearningSystem
  private openai: OpenAI
  private channels: Map<string, RealtimeChannel> = new Map()
  
  constructor() {
    this.memory = new AIMemorySystem()
    this.attention = new AttentionSystem()
    this.learning = new LearningSystem()
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })
  }
  
  async initialize(organizationId: string): Promise<void> {
    await this.subscribeToAllEvents(organizationId)
  }
  
  async shutdown(): Promise<void> {
    // Unsubscribe from all channels
    for (const [_, channel] of this.channels) {
      await channel.unsubscribe()
    }
    this.channels.clear()
  }
  
  private async subscribeToAllEvents(organizationId: string): Promise<void> {
    const supabase = await createClient()
    
    // Define tables to monitor
    const tablesToMonitor = [
      'leads',
      'bookings',
      'payments',
      'payment_transactions',
      'email_logs',
      'sms_logs',
      'whatsapp_logs',
      'class_sessions',
      'staff',
      'workflows',
      'forms',
      'ai_insights'
    ]
    
    // Subscribe to each table
    for (const table of tablesToMonitor) {
      const channelName = `ai-processor-${table}-${organizationId}`
      
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: table,
            filter: `organization_id=eq.${organizationId}`
          },
          async (payload) => {
            await this.processEvent({
              eventType: 'database_change',
              tableName: table,
              operation: payload.eventType,
              data: payload
            })
          }
        )
        .subscribe()
      
      this.channels.set(channelName, channel)
    }
  }
  
  async processEvent(event: ProcessedEvent): Promise<void> {
    try {
      // 1. Generate embedding for the event
      const embedding = await this.generateEventEmbedding(event)
      event.embedding = embedding
      
      // 2. Update knowledge graph
      await this.updateKnowledgeGraph(event)
      
      // 3. Check for immediate insights
      const insights = await this.checkForInsights(event)
      event.insights = insights
      
      // 4. Trigger any automated actions
      const automations = await this.triggerAutomations(event, insights)
      event.automations = automations
      
      // 5. Update predictions
      await this.updatePredictions(event)
      
      // 6. Store in memory if significant
      if (this.isSignificantEvent(event)) {
        await this.storeEventMemory(event)
      }
      
    } catch (error) {
      console.error('Error processing event:', error)
    }
  }
  
  private async generateEventEmbedding(event: ProcessedEvent): Promise<number[]> {
    // Create a text representation of the event
    const eventText = this.createEventText(event)
    
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: eventText
      })
      
      return response.data[0].embedding
    } catch (error) {
      console.error('Error generating embedding:', error)
      return []
    }
  }
  
  private createEventText(event: ProcessedEvent): string {
    const { tableName, operation, data } = event
    
    // Create meaningful text based on event type
    switch (tableName) {
      case 'leads':
        if (operation === 'INSERT') {
          return `New lead created: ${data.new.name || 'Unknown'} from ${data.new.source || 'unknown source'}`
        } else if (operation === 'UPDATE') {
          return `Lead updated: ${data.new.name || 'Unknown'} status changed to ${data.new.status || 'unknown'}`
        }
        break
        
      case 'bookings':
        if (operation === 'INSERT') {
          return `New booking created for class ${data.new.class_session_id} by customer ${data.new.customer_id}`
        } else if (operation === 'UPDATE' && data.new.status !== data.old.status) {
          return `Booking status changed from ${data.old.status} to ${data.new.status}`
        }
        break
        
      case 'payment_transactions':
        if (operation === 'INSERT') {
          return `Payment received: ${data.new.amount_pennies / 100} ${data.new.currency || 'GBP'} from customer ${data.new.customer_id}`
        }
        break
        
      case 'email_logs':
        if (operation === 'INSERT') {
          return `Email sent to ${data.new.to_email} with subject: ${data.new.subject}`
        }
        break
        
      default:
        return `${operation} on ${tableName}: ${JSON.stringify(data.new || data.old).slice(0, 200)}`
    }
    
    return `${operation} on ${tableName}`
  }
  
  private async updateKnowledgeGraph(event: ProcessedEvent): Promise<void> {
    const supabase = await createClient()
    
    // Extract relationships from the event
    const relationships = await this.extractRelationships(event)
    
    for (const rel of relationships) {
      await supabase.from('ai_knowledge_graph').upsert({
        organization_id: rel.organizationId,
        from_node: rel.fromNode,
        from_type: rel.fromType,
        to_node: rel.toNode,
        to_type: rel.toType,
        relationship_type: rel.relationshipType,
        strength: rel.strength,
        evidence: { event: event.eventType, data: event.data },
        confidence: rel.confidence
      })
    }
  }
  
  private async extractRelationships(event: ProcessedEvent): Promise<any[]> {
    const relationships: any[] = []
    const { tableName, operation, data } = event
    
    if (!data.new) return relationships
    
    const organizationId = data.new.organization_id
    if (!organizationId) return relationships
    
    switch (tableName) {
      case 'bookings':
        if (data.new.customer_id && data.new.class_session_id) {
          relationships.push({
            organizationId,
            fromNode: data.new.customer_id,
            fromType: 'customer',
            toNode: data.new.class_session_id,
            toType: 'class_session',
            relationshipType: 'booked',
            strength: 1.0,
            confidence: 1.0
          })
        }
        break
        
      case 'payment_transactions':
        if (data.new.customer_id) {
          relationships.push({
            organizationId,
            fromNode: data.new.customer_id,
            fromType: 'customer',
            toNode: data.new.id,
            toType: 'payment',
            relationshipType: 'made_payment',
            strength: 1.0,
            confidence: 1.0
          })
        }
        break
        
      case 'email_logs':
        if (data.new.lead_id) {
          relationships.push({
            organizationId,
            fromNode: organizationId,
            fromType: 'organization',
            toNode: data.new.lead_id,
            toType: 'lead',
            relationshipType: 'sent_email',
            strength: 0.7,
            confidence: 0.9
          })
        }
        break
    }
    
    return relationships
  }
  
  private async checkForInsights(event: ProcessedEvent): Promise<any[]> {
    const insights: any[] = []
    const { tableName, operation, data } = event
    
    // Check for specific patterns
    if (tableName === 'bookings' && operation === 'UPDATE') {
      if (data.new.status === 'cancelled' && data.old.status !== 'cancelled') {
        insights.push({
          type: 'cancellation_detected',
          severity: 'medium',
          message: 'Booking cancelled',
          data: {
            bookingId: data.new.id,
            customerId: data.new.customer_id,
            reason: data.new.cancellation_reason
          }
        })
      }
    }
    
    // Check for anomalies
    if (tableName === 'payment_transactions' && operation === 'INSERT') {
      const isAnomaly = await this.checkPaymentAnomaly(data.new)
      if (isAnomaly) {
        insights.push({
          type: 'payment_anomaly',
          severity: 'high',
          message: 'Unusual payment detected',
          data: {
            paymentId: data.new.id,
            amount: data.new.amount_pennies / 100,
            customerId: data.new.customer_id
          }
        })
      }
    }
    
    // Check for opportunities
    if (tableName === 'leads' && operation === 'UPDATE') {
      if (data.new.engagement_score > 80) {
        insights.push({
          type: 'high_engagement_lead',
          severity: 'low',
          message: 'Lead showing high engagement',
          data: {
            leadId: data.new.id,
            score: data.new.engagement_score
          }
        })
      }
    }
    
    return insights
  }
  
  private async checkPaymentAnomaly(payment: any): Promise<boolean> {
    const supabase = await createClient()
    
    // Get historical payments for comparison
    const { data: historicalPayments } = await supabase
      .from('payment_transactions')
      .select('amount_pennies')
      .eq('customer_id', payment.customer_id)
      .eq('organization_id', payment.organization_id)
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (!historicalPayments || historicalPayments.length < 3) {
      return false
    }
    
    // Calculate average and check if current payment is anomalous
    const avg = historicalPayments.reduce((sum, p) => sum + p.amount_pennies, 0) / historicalPayments.length
    const deviation = Math.abs(payment.amount_pennies - avg) / avg
    
    return deviation > 2.0 // More than 200% deviation
  }
  
  private async triggerAutomations(event: ProcessedEvent, insights: any[]): Promise<any[]> {
    const automations: any[] = []
    const supabase = await createClient()
    
    // Check if any workflows should be triggered
    for (const insight of insights) {
      if (insight.type === 'cancellation_detected') {
        // Check for cancellation recovery workflows
        const { data: workflows } = await supabase
          .from('workflows')
          .select('*')
          .eq('organization_id', event.data.new.organization_id)
          .eq('trigger_type', 'booking_cancelled')
          .eq('status', 'active')
        
        if (workflows && workflows.length > 0) {
          automations.push({
            type: 'trigger_workflow',
            workflowId: workflows[0].id,
            trigger: 'booking_cancelled',
            data: insight.data
          })
        }
      }
    }
    
    return automations
  }
  
  private async updatePredictions(event: ProcessedEvent): Promise<void> {
    const { tableName, data } = event
    
    // Update churn predictions based on cancellations
    if (tableName === 'bookings' && data.new.status === 'cancelled') {
      await this.updateChurnPrediction(data.new.customer_id, data.new.organization_id)
    }
    
    // Update revenue predictions based on payments
    if (tableName === 'payment_transactions') {
      await this.updateRevenuePrediction(data.new.organization_id)
    }
  }
  
  private async updateChurnPrediction(customerId: string, organizationId: string): Promise<void> {
    const supabase = await createClient()
    
    // Get customer's recent activity
    const { data: recentBookings } = await supabase
      .from('bookings')
      .select('status')
      .eq('customer_id', customerId)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (!recentBookings) return
    
    // Calculate churn risk based on cancellation rate
    const cancellations = recentBookings.filter(b => b.status === 'cancelled').length
    const churnRisk = cancellations / recentBookings.length
    
    if (churnRisk > 0.5) {
      // Store high churn risk insight
      await supabase.from('ai_insights').insert({
        organization_id: organizationId,
        insight_type: 'churn_risk',
        entities_involved: { client_id: customerId },
        insight_content: `Customer has cancelled ${cancellations} out of last ${recentBookings.length} bookings`,
        confidence_score: churnRisk,
        supporting_evidence: { bookings: recentBookings },
        impact_prediction: { potential_revenue_loss: 100 }, // Calculate based on membership
        status: 'active',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      })
    }
  }
  
  private async updateRevenuePrediction(organizationId: string): Promise<void> {
    // Implementation for revenue prediction updates
  }
  
  private isSignificantEvent(event: ProcessedEvent): boolean {
    // Determine if event is significant enough to store in memory
    const significantTables = ['leads', 'bookings', 'payment_transactions', 'workflows']
    const significantOperations = ['INSERT', 'UPDATE']
    
    return (
      significantTables.includes(event.tableName) &&
      significantOperations.includes(event.operation) &&
      (event.insights?.length > 0 || event.automations?.length > 0)
    )
  }
  
  private async storeEventMemory(event: ProcessedEvent): Promise<void> {
    const { tableName, operation, data } = event
    
    if (!data.new?.organization_id) return
    
    const memoryContent = `${this.createEventText(event)}. Insights: ${
      event.insights?.map(i => i.message).join(', ') || 'none'
    }`
    
    await this.memory.storeMemory(
      data.new.organization_id,
      'event',
      tableName,
      memoryContent,
      {
        event,
        insights: event.insights,
        automations: event.automations
      },
      data.new.id
    )
  }
}