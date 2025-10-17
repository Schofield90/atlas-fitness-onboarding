import { createClient } from '@/app/lib/supabase/server'

export interface LeadScoringFactors {
  sourceQualityScore: number
  engagementScore: number
  behavioralScore: number
  communicationScore: number
  completenessScore: number
  timeDecayScore: number
  aiAnalysisScore: number
  totalScore: number
}

export interface LeadActivity {
  id?: string
  leadId: string
  organizationId: string
  activityType: string
  activityValue: number
  metadata?: Record<string, any>
}

export interface ScoringConfiguration {
  sourceWeights: Record<string, number>
  activityWeights: Record<string, number>
  timeDecaySettings: {
    maxAge: number // days
    decayRate: number
  }
  automationTriggers: {
    hotThreshold: number
    warmThreshold: number
    coldThreshold: number
  }
}

export class LeadScoringService {
  private supabase = createClient()

  /**
   * Calculate lead score using multiple factors
   */
  async calculateLeadScore(leadId: string): Promise<LeadScoringFactors> {
    const supabase = await this.supabase
    
    // Get lead data
    const { data: lead } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single()

    if (!lead) {
      throw new Error('Lead not found')
    }

    const factors: LeadScoringFactors = {
      sourceQualityScore: await this.calculateSourceScore(lead.source),
      engagementScore: await this.calculateEngagementScore(leadId),
      behavioralScore: await this.calculateBehavioralScore(leadId),
      communicationScore: await this.calculateCommunicationScore(leadId),
      completenessScore: await this.calculateCompletenessScore(lead),
      timeDecayScore: await this.calculateTimeDecayScore(lead.created_at),
      aiAnalysisScore: await this.getAIAnalysisScore(leadId),
      totalScore: 0
    }

    // Calculate total score
    factors.totalScore = Math.min(100, Math.max(0, 
      factors.sourceQualityScore +
      factors.engagementScore +
      factors.behavioralScore +
      factors.communicationScore +
      factors.completenessScore +
      factors.timeDecayScore +
      factors.aiAnalysisScore
    ))

    return factors
  }

  /**
   * Update lead score and save scoring factors
   */
  async updateLeadScore(leadId: string, triggeredBy: string = 'manual', changeReason?: string): Promise<number> {
    const supabase = await this.supabase
    
    // Calculate new scoring factors
    const factors = await this.calculateLeadScore(leadId)
    
    // Get current score for comparison
    const { data: currentLead } = await supabase
      .from('leads')
      .select('lead_score, organization_id')
      .eq('id', leadId)
      .single()
    
    if (!currentLead) {
      throw new Error('Lead not found')
    }

    const oldScore = currentLead.lead_score || 0

    // Update lead score
    await supabase
      .from('leads')
      .update({ 
        lead_score: factors.totalScore,
        updated_at: new Date().toISOString()
      })
      .eq('id', leadId)

    // Save scoring factors
    await supabase
      .from('lead_scoring_factors')
      .upsert({
        organization_id: currentLead.organization_id,
        lead_id: leadId,
        source_quality_score: factors.sourceQualityScore,
        engagement_score: factors.engagementScore,
        behavioral_score: factors.behavioralScore,
        communication_score: factors.communicationScore,
        completeness_score: factors.completenessScore,
        time_decay_score: factors.timeDecayScore,
        ai_analysis_score: factors.aiAnalysisScore,
        total_score: factors.totalScore
      }, {
        onConflict: 'organization_id,lead_id'
      })

    // Record score history if changed
    if (oldScore !== factors.totalScore) {
      await supabase
        .from('lead_score_history')
        .insert({
          organization_id: currentLead.organization_id,
          lead_id: leadId,
          previous_score: oldScore,
          new_score: factors.totalScore,
          score_change: factors.totalScore - oldScore,
          triggered_by: triggeredBy,
          change_reason: changeReason
        })

      // Trigger automations if score changed significantly
      await this.triggerScoreAutomations(leadId, oldScore, factors.totalScore, changeReason)
    }

    return factors.totalScore
  }

  /**
   * Record lead activity and update score
   */
  async recordActivity(activity: LeadActivity): Promise<void> {
    const supabase = await this.supabase
    
    // Record the activity
    await supabase
      .from('lead_activities')
      .insert({
        organization_id: activity.organizationId,
        lead_id: activity.leadId,
        activity_type: activity.activityType,
        activity_value: activity.activityValue,
        activity_metadata: activity.metadata || {}
      })

    // Update lead score based on new activity
    await this.updateLeadScore(
      activity.leadId, 
      'activity', 
      `New activity: ${activity.activityType}`
    )
  }

  /**
   * Batch record multiple activities
   */
  async recordActivities(activities: LeadActivity[]): Promise<void> {
    const supabase = await this.supabase
    
    // Insert activities
    await supabase
      .from('lead_activities')
      .insert(activities.map(activity => ({
        organization_id: activity.organizationId,
        lead_id: activity.leadId,
        activity_type: activity.activityType,
        activity_value: activity.activityValue,
        activity_metadata: activity.metadata || {}
      })))

    // Update scores for affected leads
    const uniqueLeadIds = [...new Set(activities.map(a => a.leadId))]
    
    for (const leadId of uniqueLeadIds) {
      await this.updateLeadScore(leadId, 'batch_activity', 'Batch activity update')
    }
  }

  /**
   * Get lead temperature based on score
   */
  getLeadTemperature(score: number): string {
    if (score >= 80) return 'hot'
    if (score >= 60) return 'warm'
    if (score >= 40) return 'lukewarm'
    return 'cold'
  }

  /**
   * Get scoring configuration for organization
   */
  async getScoringConfiguration(organizationId: string): Promise<ScoringConfiguration> {
    const supabase = await this.supabase
    
    const { data: config } = await supabase
      .from('organization_settings')
      .select('lead_scoring_config')
      .eq('organization_id', organizationId)
      .single()

    if (config?.lead_scoring_config) {
      return config.lead_scoring_config
    }

    // Return default configuration
    return {
      sourceWeights: {
        'referral': 20,
        'website': 15,
        'facebook': 12,
        'instagram': 12,
        'google': 10,
        'cold_call': 5,
        'manual': 8
      },
      activityWeights: {
        'email_open': 1,
        'email_click': 2,
        'form_submission': 5,
        'website_visit': 2,
        'page_view': 1,
        'download': 3,
        'video_watch': 4,
        'call_answer': 8,
        'call_missed': -1,
        'sms_reply': 6,
        'whatsapp_reply': 6,
        'booking_attempt': 10,
        'social_engagement': 2
      },
      timeDecaySettings: {
        maxAge: 90, // 90 days
        decayRate: 0.1 // 10% decay per week
      },
      automationTriggers: {
        hotThreshold: 80,
        warmThreshold: 60,
        coldThreshold: 40
      }
    }
  }

  /**
   * Update scoring configuration for organization
   */
  async updateScoringConfiguration(organizationId: string, config: Partial<ScoringConfiguration>): Promise<void> {
    const supabase = await this.supabase
    
    const currentConfig = await this.getScoringConfiguration(organizationId)
    const newConfig = { ...currentConfig, ...config }

    await supabase
      .from('organization_settings')
      .upsert({
        organization_id: organizationId,
        lead_scoring_config: newConfig
      }, {
        onConflict: 'organization_id'
      })
  }

  // Private methods for individual score calculations

  private async calculateSourceScore(source: string): Promise<number> {
    const weights = {
      'referral': 20,
      'website': 15,
      'facebook': 12,
      'instagram': 12,
      'google': 10,
      'cold_call': 5,
      'manual': 8
    }

    return weights[source as keyof typeof weights] || 8
  }

  private async calculateEngagementScore(leadId: string): Promise<number> {
    const supabase = await this.supabase
    
    const { data: interactions } = await supabase
      .from('interactions')
      .select('type, direction')
      .eq('lead_id', leadId)

    if (!interactions) return 0

    const score = Math.min(25, interactions.length * 3)
    return score
  }

  private async calculateBehavioralScore(leadId: string): Promise<number> {
    const supabase = await this.supabase
    
    const { data: activities } = await supabase
      .from('lead_activities')
      .select('activity_type, activity_value')
      .eq('lead_id', leadId)

    if (!activities) return 0

    const totalValue = activities.reduce((sum, activity) => 
      sum + (activity.activity_value || 1), 0
    )

    return Math.min(20, totalValue)
  }

  private async calculateCommunicationScore(leadId: string): Promise<number> {
    const supabase = await this.supabase
    
    const { data: inboundMessages } = await supabase
      .from('interactions')
      .select('created_at')
      .eq('lead_id', leadId)
      .eq('direction', 'inbound')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: true })

    if (!inboundMessages || inboundMessages.length < 2) return 0

    // Calculate average response time
    let totalResponseTime = 0
    for (let i = 1; i < inboundMessages.length; i++) {
      const prev = new Date(inboundMessages[i - 1].created_at)
      const curr = new Date(inboundMessages[i].created_at)
      totalResponseTime += (curr.getTime() - prev.getTime()) / (1000 * 60 * 60) // hours
    }

    const avgResponseTime = totalResponseTime / (inboundMessages.length - 1)

    if (avgResponseTime <= 1) return 15      // Within 1 hour
    if (avgResponseTime <= 4) return 12      // Within 4 hours
    if (avgResponseTime <= 24) return 8      // Within 24 hours
    return 4                                 // Longer than 24 hours
  }

  private async calculateCompletenessScore(lead: any): Promise<number> {
    let score = 0
    
    if (lead.name && lead.name.length > 0) score += 2
    if (lead.email && lead.email.length > 0) score += 2
    if (lead.phone && lead.phone.length > 0) score += 2
    
    // Check metadata completeness
    const metadata = lead.metadata || {}
    const metadataFields = Object.keys(metadata).length
    if (metadataFields > 2) score += 4
    else if (metadataFields > 0) score += 2

    return Math.min(10, score)
  }

  private async calculateTimeDecayScore(createdAt: string): Promise<number> {
    const now = new Date()
    const created = new Date(createdAt)
    const daysOld = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)

    if (daysOld <= 1) return 10
    if (daysOld <= 3) return 8
    if (daysOld <= 7) return 6
    if (daysOld <= 14) return 4
    if (daysOld <= 30) return 2
    return 1
  }

  private async getAIAnalysisScore(leadId: string): Promise<number> {
    const supabase = await this.supabase
    
    const { data: factors } = await supabase
      .from('lead_scoring_factors')
      .select('ai_analysis_score')
      .eq('lead_id', leadId)
      .single()

    return factors?.ai_analysis_score || 0
  }

  private async triggerScoreAutomations(
    leadId: string, 
    oldScore: number, 
    newScore: number, 
    changeReason?: string
  ): Promise<void> {
    // Call the scoring triggers API
    try {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/automations/scoring-triggers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId,
          previousScore: oldScore,
          newScore,
          changeReason,
          triggerAutomations: true
        })
      })
    } catch (error) {
      console.error('Failed to trigger score automations:', error)
    }
  }
}

// Utility functions for common scoring operations

/**
 * Bulk update scores for multiple leads
 */
export async function bulkUpdateLeadScores(
  leadIds: string[], 
  triggeredBy: string = 'bulk_update'
): Promise<{ success: string[]; failed: string[] }> {
  const scoringService = new LeadScoringService()
  const results = { success: [], failed: [] }

  for (const leadId of leadIds) {
    try {
      await scoringService.updateLeadScore(leadId, triggeredBy, 'Bulk score update')
      results.success.push(leadId)
    } catch (error) {
      console.error(`Failed to update score for lead ${leadId}:`, error)
      results.failed.push(leadId)
    }
  }

  return results
}

/**
 * Get leads by temperature/score range
 */
export async function getLeadsByTemperature(
  organizationId: string, 
  temperature: 'hot' | 'warm' | 'lukewarm' | 'cold'
): Promise<any[]> {
  const supabase = await createClient()
  
  let minScore = 0
  let maxScore = 100

  switch (temperature) {
    case 'hot':
      minScore = 80
      break
    case 'warm':
      minScore = 60
      maxScore = 79
      break
    case 'lukewarm':
      minScore = 40
      maxScore = 59
      break
    case 'cold':
      maxScore = 39
      break
  }

  const { data: leads } = await supabase
    .from('leads')
    .select('*')
    .eq('organization_id', organizationId)
    .gte('lead_score', minScore)
    .lte('lead_score', maxScore)
    .order('lead_score', { ascending: false })

  return leads || []
}

/**
 * Get scoring analytics for organization
 */
export async function getScoringAnalytics(organizationId: string): Promise<{
  averageScore: number
  scoreDistribution: Record<string, number>
  recentTrends: any[]
  topActivities: any[]
}> {
  const supabase = await createClient()
  
  // Get all leads with scores
  const { data: leads } = await supabase
    .from('leads')
    .select('lead_score, created_at')
    .eq('organization_id', organizationId)

  // Get recent score changes
  const { data: recentChanges } = await supabase
    .from('lead_score_history')
    .select('*')
    .eq('organization_id', organizationId)
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false })
    .limit(100)

  // Get activity statistics
  const { data: activities } = await supabase
    .from('lead_activities')
    .select('activity_type')
    .eq('organization_id', organizationId)
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

  // Calculate analytics
  const scores = leads?.map(l => l.lead_score || 0) || []
  const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0

  const scoreDistribution = {
    hot: scores.filter(s => s >= 80).length,
    warm: scores.filter(s => s >= 60 && s < 80).length,
    lukewarm: scores.filter(s => s >= 40 && s < 60).length,
    cold: scores.filter(s => s < 40).length
  }

  const activityCounts = activities?.reduce((acc, activity) => {
    acc[activity.activity_type] = (acc[activity.activity_type] || 0) + 1
    return acc
  }, {} as Record<string, number>) || {}

  const topActivities = Object.entries(activityCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([type, count]) => ({ type, count }))

  return {
    averageScore: Math.round(averageScore),
    scoreDistribution,
    recentTrends: recentChanges || [],
    topActivities
  }
}