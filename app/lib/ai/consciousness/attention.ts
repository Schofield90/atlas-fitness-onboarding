import { createClient } from '@/app/lib/supabase/server'

export interface AttentionFocus {
  entityId: string
  entityType: string
  priority: number
  reason: string
  context: any
  expiresAt?: Date
}

export interface AttentionSignal {
  type: 'urgent' | 'important' | 'notable' | 'routine'
  source: string
  strength: number
  data: any
}

export class AttentionSystem {
  private currentFocus: Map<string, AttentionFocus> = new Map()
  
  async determineAttention(
    organizationId: string,
    signals: AttentionSignal[]
  ): Promise<AttentionFocus[]> {
    // Analyze signals to determine what needs attention
    const priorities = await this.calculatePriorities(organizationId, signals)
    
    // Update current focus areas
    this.updateFocus(priorities)
    
    // Return top priority items
    return Array.from(this.currentFocus.values())
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 10)
  }
  
  async getRealtimeAlerts(organizationId: string): Promise<AttentionSignal[]> {
    const supabase = await createClient()
    const signals: AttentionSignal[] = []
    
    // Check for urgent patterns
    const urgentPatterns = await this.checkUrgentPatterns(organizationId)
    signals.push(...urgentPatterns)
    
    // Check for anomalies
    const anomalies = await this.detectAnomalies(organizationId)
    signals.push(...anomalies)
    
    // Check for opportunities
    const opportunities = await this.identifyOpportunities(organizationId)
    signals.push(...opportunities)
    
    return signals
  }
  
  async focusOn(entityId: string, entityType: string, reason: string): Promise<void> {
    this.currentFocus.set(`${entityType}:${entityId}`, {
      entityId,
      entityType,
      priority: 1.0,
      reason,
      context: {},
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    })
  }
  
  async defocus(entityId: string, entityType: string): Promise<void> {
    this.currentFocus.delete(`${entityType}:${entityId}`)
  }
  
  private async calculatePriorities(
    organizationId: string,
    signals: AttentionSignal[]
  ): Promise<AttentionFocus[]> {
    const priorities: AttentionFocus[] = []
    
    for (const signal of signals) {
      const priority = await this.calculateSignalPriority(signal)
      
      if (priority > 0.5) {
        priorities.push({
          entityId: signal.data.entityId,
          entityType: signal.data.entityType,
          priority,
          reason: this.generateReason(signal),
          context: signal.data
        })
      }
    }
    
    return priorities
  }
  
  private async calculateSignalPriority(signal: AttentionSignal): Promise<number> {
    const typeWeights = {
      urgent: 1.0,
      important: 0.8,
      notable: 0.6,
      routine: 0.4
    }
    
    const baseScore = typeWeights[signal.type] * signal.strength
    
    // Adjust based on business impact
    const impactMultiplier = signal.data.revenue_impact ? 1.5 : 1.0
    
    return Math.min(baseScore * impactMultiplier, 1.0)
  }
  
  private async checkUrgentPatterns(organizationId: string): Promise<AttentionSignal[]> {
    const supabase = await createClient()
    const signals: AttentionSignal[] = []
    
    // Check for churn signals
    const { data: churnRisks } = await supabase
      .from('ai_insights')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('insight_type', 'churn_risk')
      .gte('confidence_score', 0.8)
      .eq('status', 'active')
    
    if (churnRisks) {
      for (const risk of churnRisks) {
        signals.push({
          type: 'urgent',
          source: 'churn_detection',
          strength: risk.confidence_score,
          data: {
            entityId: risk.entities_involved.client_id,
            entityType: 'client',
            risk: risk.insight_content,
            impact: risk.impact_prediction
          }
        })
      }
    }
    
    // Check for revenue anomalies
    const revenueAnomalies = await this.checkRevenueAnomalies(organizationId)
    signals.push(...revenueAnomalies)
    
    return signals
  }
  
  private async detectAnomalies(organizationId: string): Promise<AttentionSignal[]> {
    const supabase = await createClient()
    const signals: AttentionSignal[] = []
    
    // Detect attendance anomalies
    const { data: attendanceData } = await supabase.rpc('detect_attendance_anomalies', {
      org_id: organizationId,
      lookback_days: 7
    })
    
    if (attendanceData) {
      for (const anomaly of attendanceData) {
        signals.push({
          type: 'important',
          source: 'attendance_monitoring',
          strength: anomaly.deviation_score,
          data: {
            entityId: anomaly.class_id,
            entityType: 'class',
            pattern: anomaly.pattern,
            impact: anomaly.estimated_impact
          }
        })
      }
    }
    
    return signals
  }
  
  private async identifyOpportunities(organizationId: string): Promise<AttentionSignal[]> {
    const supabase = await createClient()
    const signals: AttentionSignal[] = []
    
    // Identify upsell opportunities
    const { data: upsellTargets } = await supabase.rpc('identify_upsell_opportunities', {
      org_id: organizationId
    })
    
    if (upsellTargets) {
      for (const target of upsellTargets) {
        signals.push({
          type: 'notable',
          source: 'opportunity_detection',
          strength: target.probability,
          data: {
            entityId: target.client_id,
            entityType: 'client',
            opportunity: target.opportunity_type,
            value: target.potential_value
          }
        })
      }
    }
    
    return signals
  }
  
  private async checkRevenueAnomalies(organizationId: string): Promise<AttentionSignal[]> {
    // Implementation for revenue anomaly detection
    return []
  }
  
  private updateFocus(priorities: AttentionFocus[]): void {
    // Clear expired focus items
    const now = new Date()
    for (const [key, focus] of this.currentFocus.entries()) {
      if (focus.expiresAt && focus.expiresAt < now) {
        this.currentFocus.delete(key)
      }
    }
    
    // Add new priorities
    for (const priority of priorities) {
      const key = `${priority.entityType}:${priority.entityId}`
      const existing = this.currentFocus.get(key)
      
      if (!existing || existing.priority < priority.priority) {
        this.currentFocus.set(key, priority)
      }
    }
  }
  
  private generateReason(signal: AttentionSignal): string {
    const reasons: Record<string, string> = {
      churn_detection: 'High risk of cancellation detected',
      attendance_monitoring: 'Unusual attendance pattern',
      opportunity_detection: 'Potential upsell opportunity',
      revenue_monitoring: 'Revenue anomaly detected'
    }
    
    return reasons[signal.source] || 'Requires attention'
  }
}