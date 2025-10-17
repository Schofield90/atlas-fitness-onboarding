import { enhancedLeadProcessor } from './enhanced-lead-processor'
import { createAdminClient } from '@/app/lib/supabase/admin'

export interface MessageProcessingContext {
  leadId?: string
  organizationId: string
  phoneNumber: string
  messageContent: string
  messageType: 'sms' | 'whatsapp' | 'email'
  direction: 'inbound' | 'outbound'
  timestamp: string
}

export interface RealTimeProcessingResult {
  leadId?: string
  sentimentChange?: {
    from: string
    to: string
    confidence: number
  }
  urgencyAlert?: {
    level: number
    reason: string
    immediateActions: string[]
  }
  buyingSignalsDetected?: string[]
  riskFactors?: string[]
  recommendedResponse?: string
  staffNotification?: {
    priority: 'low' | 'medium' | 'high' | 'urgent'
    message: string
    suggestedActions: string[]
  }
  processingTimeMs: number
}

export class RealTimeProcessor {
  private supabase = createAdminClient()
  
  constructor() {}

  /**
   * Process incoming message in real-time for AI insights
   */
  async processMessage(context: MessageProcessingContext): Promise<RealTimeProcessingResult> {
    const startTime = Date.now()
    
    try {
      console.log('Real-time message processing started:', {
        phone: context.phoneNumber,
        messageType: context.messageType,
        direction: context.direction,
        hasLeadId: !!context.leadId
      })

      // Find or create lead if not provided
      let leadId = context.leadId
      if (!leadId) {
        leadId = await this.findOrCreateLeadFromMessage(context)
      }

      if (!leadId) {
        console.log('Could not identify or create lead for message processing')
        return this.createMinimalResult(startTime)
      }

      // Get current lead insights for comparison
      const currentInsights = await this.getCurrentLeadInsights(leadId)

      // Process the interaction with enhanced AI
      const analysis = await enhancedLeadProcessor.processInteraction(leadId, {
        content: context.messageContent,
        channel: context.messageType,
        direction: context.direction,
        timestamp: context.timestamp
      })

      // Detect changes and alerts
      const result = await this.analyzeChangesAndGenerateAlerts(
        leadId,
        analysis,
        currentInsights,
        context
      )

      result.processingTimeMs = Date.now() - startTime

      console.log('Real-time processing completed:', {
        leadId,
        processingTimeMs: result.processingTimeMs,
        urgencyAlert: !!result.urgencyAlert,
        sentimentChange: !!result.sentimentChange,
        staffNotification: result.staffNotification?.priority
      })

      return result

    } catch (error) {
      console.error('Real-time message processing failed:', error)
      return {
        processingTimeMs: Date.now() - startTime,
        riskFactors: ['AI processing failed'],
        staffNotification: {
          priority: 'medium',
          message: 'AI analysis failed for recent message - manual review recommended',
          suggestedActions: ['Review conversation manually', 'Check lead status']
        }
      }
    }
  }

  /**
   * Process message for hot leads only (performance optimization)
   */
  async processHotLeadMessage(context: MessageProcessingContext): Promise<RealTimeProcessingResult> {
    if (!context.leadId) {
      return this.createMinimalResult(Date.now())
    }

    // Check if lead is hot/warm before processing
    const { data: lead } = await this.supabase
      .from('leads')
      .select('lead_score, status')
      .eq('id', context.leadId)
      .single()

    if (!lead || lead.lead_score < 60) { // Only process leads with score 60+
      console.log('Skipping real-time processing for cold lead:', context.leadId)
      return this.createMinimalResult(Date.now())
    }

    return this.processMessage(context)
  }

  private async findOrCreateLeadFromMessage(context: MessageProcessingContext): Promise<string | null> {
    // Clean phone number for search
    const cleanPhone = context.phoneNumber.replace(/\D/g, '')
    const phoneVariations = [
      context.phoneNumber,
      cleanPhone,
      '+' + cleanPhone,
      cleanPhone.startsWith('44') ? '0' + cleanPhone.substring(2) : null
    ].filter(Boolean)

    // Try to find existing lead
    const { data: existingLead } = await this.supabase
      .from('leads')
      .select('id')
      .eq('organization_id', context.organizationId)
      .or(phoneVariations.map(phone => `phone.eq.${phone}`).join(','))
      .single()

    if (existingLead) {
      return existingLead.id
    }

    // Create new lead if this is an inbound message
    if (context.direction === 'inbound') {
      const { data: newLead } = await this.supabase
        .from('leads')
        .insert({
          organization_id: context.organizationId,
          phone: context.phoneNumber,
          source: context.messageType === 'whatsapp' ? 'whatsapp' : 'sms',
          status: 'new',
          name: `Lead ${context.phoneNumber}`,
          created_at: new Date().toISOString()
        })
        .select('id')
        .single()

      return newLead?.id || null
    }

    return null
  }

  private async getCurrentLeadInsights(leadId: string): Promise<any> {
    const { data: insights } = await this.supabase
      .from('lead_ai_insights')
      .select('*')
      .eq('lead_id', leadId)
      .gt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
      .order('created_at', { ascending: false })

    const insightsByType = (insights || []).reduce((acc, insight) => {
      acc[insight.insight_type] = insight
      return acc
    }, {})

    return insightsByType
  }

  private async analyzeChangesAndGenerateAlerts(
    leadId: string,
    newAnalysis: any,
    previousInsights: any,
    context: MessageProcessingContext
  ): Promise<RealTimeProcessingResult> {
    const result: RealTimeProcessingResult = { leadId, processingTimeMs: 0 }

    // Detect sentiment changes
    const previousSentiment = previousInsights.sentiment_analysis?.insight_data?.overall
    const newSentiment = newAnalysis.sentiment.overall

    if (previousSentiment && previousSentiment !== newSentiment) {
      result.sentimentChange = {
        from: previousSentiment,
        to: newSentiment,
        confidence: newAnalysis.sentiment.confidence
      }

      // Alert on negative sentiment change
      if (previousSentiment === 'positive' && newSentiment === 'negative') {
        result.staffNotification = {
          priority: 'high',
          message: `Lead sentiment changed from positive to negative after recent message`,
          suggestedActions: [
            'Review conversation immediately',
            'Consider personal follow-up call',
            'Address potential concerns'
          ]
        }
      }
    }

    // Check urgency level
    const urgencyLevel = newAnalysis.conversionLikelihood.urgencyLevel || 5
    
    if (urgencyLevel >= 8) {
      result.urgencyAlert = {
        level: urgencyLevel,
        reason: newAnalysis.conversionLikelihood.reasoning || 'High urgency detected',
        immediateActions: newAnalysis.nextBestActions?.map(action => action.action) || [
          'Follow up immediately',
          'Schedule consultation'
        ]
      }

      result.staffNotification = {
        priority: 'urgent',
        message: `🚨 HIGH URGENCY LEAD: ${context.phoneNumber} - Immediate attention required`,
        suggestedActions: [
          'Call within 30 minutes',
          'Send personalized message',
          'Check for booking availability'
        ]
      }
    }

    // Detect strong buying signals
    if (newAnalysis.buyingSignals.strength === 'high') {
      result.buyingSignalsDetected = newAnalysis.buyingSignals.signals

      if (!result.staffNotification || result.staffNotification.priority === 'low') {
        result.staffNotification = {
          priority: 'high',
          message: `Strong buying signals detected from ${context.phoneNumber}`,
          suggestedActions: [
            'Send pricing information',
            'Offer consultation booking',
            'Follow up within 2 hours'
          ]
        }
      }
    }

    // Check for risk factors
    if (newAnalysis.riskFactors && newAnalysis.riskFactors.length > 0) {
      result.riskFactors = newAnalysis.riskFactors

      // Alert on high-risk keywords
      const highRiskKeywords = ['cancel', 'expensive', 'think about it', 'maybe later', 'not sure']
      const messageHasRiskKeywords = highRiskKeywords.some(keyword => 
        context.messageContent.toLowerCase().includes(keyword)
      )

      if (messageHasRiskKeywords) {
        result.staffNotification = {
          priority: 'medium',
          message: `Risk factors detected in conversation with ${context.phoneNumber}`,
          suggestedActions: [
            'Address objections proactively',
            'Offer value demonstration',
            'Schedule personal consultation'
          ]
        }
      }
    }

    // Generate recommended response based on analysis
    if (context.direction === 'inbound') {
      result.recommendedResponse = await this.generateRecommendedResponse(
        newAnalysis,
        context,
        result
      )
    }

    // Log real-time processing event
    await this.logRealTimeEvent(leadId, context.organizationId, result, newAnalysis)

    return result
  }

  private async generateRecommendedResponse(
    analysis: any,
    context: MessageProcessingContext,
    alerts: RealTimeProcessingResult
  ): Promise<string> {
    // Simple rule-based response recommendations
    // In a full implementation, this could use AI to generate contextual responses

    if (alerts.urgencyAlert) {
      return "Thank you for your message! I can see you're very interested. Let me connect you with one of our specialists right away to help you get started."
    }

    if (analysis.buyingSignals.strength === 'high') {
      return "Great to hear from you! Based on your interest, I'd love to show you exactly how we can help. Would you like to book a quick 15-minute consultation?"
    }

    if (analysis.sentiment.overall === 'negative') {
      return "I understand your concerns. Let me address those personally - would you be available for a quick call to discuss your specific situation?"
    }

    if (analysis.conversionLikelihood.timeline === 'immediate') {
      return "Perfect timing! We have some availability this week for new members. Would you like me to reserve a spot for you?"
    }

    return "Thanks for your message! Our team will get back to you with personalized information shortly."
  }

  private async logRealTimeEvent(
    leadId: string,
    organizationId: string,
    result: RealTimeProcessingResult,
    analysis: any
  ): Promise<void> {
    try {
      await this.supabase
        .from('real_time_processing_logs')
        .insert({
          organization_id: organizationId,
          lead_id: leadId,
          processing_type: 'message_analysis',
          urgency_level: analysis.conversionLikelihood?.urgencyLevel || 5,
          sentiment: analysis.sentiment?.overall,
          buying_signals: analysis.buyingSignals?.strength,
          staff_notification_sent: !!result.staffNotification,
          processing_time_ms: result.processingTimeMs,
          alerts_generated: JSON.stringify({
            sentiment_change: !!result.sentimentChange,
            urgency_alert: !!result.urgencyAlert,
            buying_signals: !!result.buyingSignalsDetected,
            risk_factors: !!result.riskFactors
          }),
          created_at: new Date().toISOString()
        })
    } catch (error) {
      console.error('Failed to log real-time processing event:', error)
      // Don't throw - logging failure shouldn't break the main flow
    }
  }

  private createMinimalResult(startTime: number): RealTimeProcessingResult {
    return {
      processingTimeMs: Date.now() - startTime
    }
  }
}

// Export singleton instance
export const realTimeProcessor = new RealTimeProcessor()