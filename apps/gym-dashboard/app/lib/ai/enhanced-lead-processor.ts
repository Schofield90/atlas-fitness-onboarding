import { getOpenAIClient } from '@/gym-coach-platform/lib/ai/openai-client'
import { getAnthropic } from '@/app/lib/ai/anthropic-server'
import { createAdminClient } from '@/app/lib/supabase/admin'

export interface LeadAnalysisResult {
  leadId: string
  buyingSignals: {
    signals: string[]
    strength: 'low' | 'medium' | 'high'
    confidence: number
    explanation: string
  }
  sentiment: {
    overall: 'positive' | 'neutral' | 'negative'
    confidence: number
    indicators: string[]
    emotionalState: string[]
  }
  conversionLikelihood: {
    percentage: number
    confidence: number
    reasoning: string
    timeline: 'immediate' | 'short_term' | 'long_term' | 'unlikely'
    urgencyLevel: number // 1-10
  }
  interests: string[]
  objections: string[]
  painPoints: string[]
  motivations: string[]
  bestContactTime: 'morning' | 'afternoon' | 'evening' | 'any'
  communicationStyle: 'formal' | 'casual' | 'direct' | 'relationship_focused'
  recommendations: string[]
  nextBestActions: {
    action: string
    priority: 'high' | 'medium' | 'low'
    timeframe: string
    reasoning: string
  }[]
  riskFactors: string[]
  opportunities: string[]
}

export interface ProcessingOptions {
  forceRefresh?: boolean
  useClaudeForAnalysis?: boolean
  includeHistoricalData?: boolean
  realTimeProcessing?: boolean
}

export class EnhancedLeadProcessor {
  private supabase = createAdminClient()
  
  constructor() {}

  /**
   * Process a single lead with comprehensive AI analysis
   */
  async processLead(
    leadId: string, 
    options: ProcessingOptions = {}
  ): Promise<LeadAnalysisResult> {
    console.log('Starting enhanced lead processing for:', leadId)

    try {
      // Get lead data with all related information
      const leadData = await this.getComprehensiveLeadData(leadId)
      
      if (!leadData) {
        throw new Error(`Lead ${leadId} not found`)
      }

      // Check for recent analysis unless forcing refresh
      if (!options.forceRefresh) {
        const cachedResult = await this.getCachedAnalysis(leadId)
        if (cachedResult) {
          console.log('Returning cached analysis for lead:', leadId)
          return cachedResult
        }
      }

      // Perform AI analysis
      const analysis = await this.performAIAnalysis(leadData, options)

      // Save results to database
      await this.saveAnalysisResults(leadId, analysis, leadData.organizationId)

      // Update lead scoring
      await this.updateLeadScoring(leadId, analysis)

      // Create activity record
      await this.recordAnalysisActivity(leadId, leadData.organizationId, analysis)

      console.log('Enhanced lead processing completed for:', leadId)
      return analysis

    } catch (error) {
      console.error('Enhanced lead processing failed:', error)
      throw error
    }
  }

  /**
   * Process multiple leads in bulk
   */
  async processBulkLeads(
    leadIds: string[], 
    options: ProcessingOptions = {}
  ): Promise<{ successful: string[], failed: { leadId: string, error: string }[] }> {
    const results = { successful: [], failed: [] }

    for (const leadId of leadIds) {
      try {
        await this.processLead(leadId, options)
        results.successful.push(leadId)
      } catch (error) {
        results.failed.push({
          leadId,
          error: error.message
        })
      }
    }

    return results
  }

  /**
   * Real-time processing for new interactions
   */
  async processInteraction(
    leadId: string,
    interactionData: any,
    options: ProcessingOptions = { realTimeProcessing: true }
  ): Promise<LeadAnalysisResult> {
    console.log('Processing real-time interaction for lead:', leadId)

    // For real-time processing, we use a lighter but faster analysis
    const leadData = await this.getComprehensiveLeadData(leadId)
    if (!leadData) {
      throw new Error(`Lead ${leadId} not found`)
    }

    // Use Claude for faster conversational analysis in real-time
    const analysis = await this.performRealTimeAnalysis(leadData, interactionData)
    
    // Save only critical insights for real-time to avoid DB overhead
    await this.saveCriticalInsights(leadId, analysis, leadData.organizationId)
    
    // Update lead temperature if significant change detected
    await this.updateLeadTemperatureIfNeeded(leadId, analysis)

    return analysis
  }

  private async getComprehensiveLeadData(leadId: string) {
    const { data: lead, error: leadError } = await this.supabase
      .from('leads')
      .select(`
        *,
        lead_tags (tag_name),
        lead_scoring_factors (*),
        lead_ai_insights (*),
        lead_activities (*)
      `)
      .eq('id', leadId)
      .single()

    if (leadError) {
      console.error('Error fetching lead data:', leadError)
      return null
    }

    // Get recent interactions
    const { data: interactions } = await this.supabase
      .from('interactions')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
      .limit(50)

    // Get conversation context if available
    const { data: conversationContext } = await this.supabase
      .rpc('get_conversation_context', {
        p_organization_id: lead.organization_id,
        p_phone_number: lead.phone,
        p_channel: 'whatsapp'
      })

    return {
      ...lead,
      interactions: interactions || [],
      conversationContext: conversationContext || []
    }
  }

  private async getCachedAnalysis(leadId: string): Promise<LeadAnalysisResult | null> {
    const { data: insights } = await this.supabase
      .from('lead_ai_insights')
      .select('*')
      .eq('lead_id', leadId)
      .gt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // 24 hours
      .order('created_at', { ascending: false })

    if (!insights || insights.length === 0) {
      return null
    }

    // Reconstruct analysis from cached insights
    return this.reconstructAnalysisFromInsights(insights)
  }

  private async performAIAnalysis(
    leadData: any,
    options: ProcessingOptions
  ): Promise<LeadAnalysisResult> {
    const conversationContext = this.buildConversationContext(leadData)
    const leadContext = this.buildLeadContext(leadData)

    try {
      // Use Claude for deep conversational analysis
      const claudeAnalysis = await this.analyzeWithClaude(leadContext, conversationContext)
      
      // Use GPT-4 for structured data extraction and scoring
      const openaiAnalysis = await this.analyzeWithOpenAI(leadContext, conversationContext)

      // Combine and enhance both analyses
      return this.combineAnalyses(claudeAnalysis, openaiAnalysis, leadData)

    } catch (claudeError) {
      console.warn('Claude analysis failed, falling back to OpenAI:', claudeError)
      
      // Fallback to OpenAI only
      const openaiAnalysis = await this.analyzeWithOpenAI(leadContext, conversationContext)
      return this.enhanceOpenAIAnalysis(openaiAnalysis, leadData)
    }
  }

  private async performRealTimeAnalysis(
    leadData: any,
    interactionData: any
  ): Promise<LeadAnalysisResult> {
    const recentContext = this.buildRecentInteractionContext(leadData, interactionData)
    
    // Use Claude for fast real-time analysis
    try {
      const anthropic = getAnthropic()
      if (!anthropic) {
        throw new Error('Claude not available')
      }

      const prompt = this.buildRealTimePrompt(recentContext)
      
      const response = await anthropic.messages.create({
        model: 'claude-3-haiku-20240307', // Faster model for real-time
        max_tokens: 1000,
        temperature: 0.3,
        messages: [{ role: 'user', content: prompt }]
      })

      const analysisText = response.content[0].type === 'text' 
        ? response.content[0].text 
        : ''

      return this.parseRealTimeAnalysis(analysisText, leadData)

    } catch (error) {
      console.warn('Real-time Claude analysis failed, using simplified analysis:', error)
      return this.createSimplifiedAnalysis(leadData, interactionData)
    }
  }

  private async analyzeWithClaude(
    leadContext: string,
    conversationContext: string
  ): Promise<any> {
    const anthropic = getAnthropic()
    if (!anthropic) {
      throw new Error('Claude not configured')
    }

    const prompt = `You are an expert sales psychologist analyzing leads for a fitness business. Analyze this lead's complete profile and conversation history to provide deep insights.

${leadContext}

${conversationContext}

Please provide a comprehensive JSON analysis with the following structure:
{
  "buyingSignals": {
    "signals": ["specific signals found"],
    "strength": "low|medium|high",
    "confidence": 0.0-1.0,
    "explanation": "detailed explanation"
  },
  "sentiment": {
    "overall": "positive|neutral|negative",
    "confidence": 0.0-1.0,
    "indicators": ["specific sentiment indicators"],
    "emotionalState": ["emotional states detected"]
  },
  "conversionLikelihood": {
    "percentage": 0-100,
    "confidence": 0.0-1.0,
    "reasoning": "detailed reasoning",
    "timeline": "immediate|short_term|long_term|unlikely",
    "urgencyLevel": 1-10
  },
  "interests": ["fitness interests and preferences"],
  "objections": ["potential objections or concerns"],
  "painPoints": ["identified pain points"],
  "motivations": ["key motivating factors"],
  "bestContactTime": "morning|afternoon|evening|any",
  "communicationStyle": "formal|casual|direct|relationship_focused",
  "recommendations": ["specific action recommendations"],
  "nextBestActions": [
    {
      "action": "specific action",
      "priority": "high|medium|low",
      "timeframe": "when to do it",
      "reasoning": "why this action"
    }
  ],
  "riskFactors": ["factors that might prevent conversion"],
  "opportunities": ["opportunities to explore"]
}`

    const response = await anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 2000,
      temperature: 0.3,
      messages: [{ role: 'user', content: prompt }]
    })

    const analysisText = response.content[0].type === 'text' 
      ? response.content[0].text 
      : ''

    try {
      return JSON.parse(analysisText)
    } catch (parseError) {
      console.error('Failed to parse Claude analysis:', parseError)
      throw new Error('Invalid Claude analysis format')
    }
  }

  private async analyzeWithOpenAI(
    leadContext: string,
    conversationContext: string
  ): Promise<any> {
    const openai = getOpenAIClient()

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are an expert sales AI analyzing leads for a fitness business. Provide structured analysis focusing on conversion probability and next best actions.`
        },
        {
          role: 'user',
          content: `${leadContext}\n\n${conversationContext}\n\nProvide JSON analysis with buying signals, sentiment, conversion likelihood, and recommendations.`
        }
      ],
      temperature: 0.3,
      max_tokens: 1500
    })

    try {
      return JSON.parse(completion.choices[0].message.content || '{}')
    } catch (parseError) {
      console.error('Failed to parse OpenAI analysis:', parseError)
      throw new Error('Invalid OpenAI analysis format')
    }
  }

  private combineAnalyses(
    claudeAnalysis: any,
    openaiAnalysis: any,
    leadData: any
  ): LeadAnalysisResult {
    // Combine the best of both analyses
    return {
      leadId: leadData.id,
      buyingSignals: {
        signals: [...(claudeAnalysis.buyingSignals?.signals || []), ...(openaiAnalysis.buyingSignals?.signals || [])],
        strength: this.consolidateStrength(claudeAnalysis.buyingSignals?.strength, openaiAnalysis.buyingSignals?.strength),
        confidence: this.averageConfidence(claudeAnalysis.buyingSignals?.confidence, openaiAnalysis.buyingSignals?.confidence),
        explanation: claudeAnalysis.buyingSignals?.explanation || openaiAnalysis.buyingSignals?.explanation || ''
      },
      sentiment: {
        overall: claudeAnalysis.sentiment?.overall || openaiAnalysis.sentiment?.overall || 'neutral',
        confidence: this.averageConfidence(claudeAnalysis.sentiment?.confidence, openaiAnalysis.sentiment?.confidence),
        indicators: [...(claudeAnalysis.sentiment?.indicators || []), ...(openaiAnalysis.sentiment?.indicators || [])],
        emotionalState: claudeAnalysis.sentiment?.emotionalState || []
      },
      conversionLikelihood: {
        percentage: this.averagePercentage(claudeAnalysis.conversionLikelihood?.percentage, openaiAnalysis.conversionLikelihood?.percentage),
        confidence: this.averageConfidence(claudeAnalysis.conversionLikelihood?.confidence, openaiAnalysis.conversionLikelihood?.confidence),
        reasoning: claudeAnalysis.conversionLikelihood?.reasoning || openaiAnalysis.conversionLikelihood?.reasoning || '',
        timeline: claudeAnalysis.conversionLikelihood?.timeline || openaiAnalysis.conversionLikelihood?.timeline || 'long_term',
        urgencyLevel: claudeAnalysis.conversionLikelihood?.urgencyLevel || 5
      },
      interests: [...(claudeAnalysis.interests || []), ...(openaiAnalysis.interests || [])],
      objections: [...(claudeAnalysis.objections || []), ...(openaiAnalysis.objections || [])],
      painPoints: claudeAnalysis.painPoints || [],
      motivations: claudeAnalysis.motivations || [],
      bestContactTime: claudeAnalysis.bestContactTime || openaiAnalysis.bestContactTime || 'any',
      communicationStyle: claudeAnalysis.communicationStyle || openaiAnalysis.communicationStyle || 'casual',
      recommendations: [...(claudeAnalysis.recommendations || []), ...(openaiAnalysis.recommendations || [])],
      nextBestActions: claudeAnalysis.nextBestActions || [],
      riskFactors: claudeAnalysis.riskFactors || [],
      opportunities: claudeAnalysis.opportunities || []
    }
  }

  private buildConversationContext(leadData: any): string {
    const interactions = leadData.interactions || []
    const conversationContext = leadData.conversationContext || []

    let context = 'Recent Conversations:\n'
    
    // Add structured interaction data
    interactions.slice(0, 20).forEach((interaction, index) => {
      context += `${index + 1}. [${interaction.created_at}] ${interaction.direction === 'inbound' ? 'Lead' : 'Staff'}: ${interaction.content}\n`
    })

    // Add conversation context if available
    if (conversationContext.length > 0) {
      context += '\nConversation Flow:\n'
      conversationContext.slice(-10).forEach((msg, index) => {
        context += `${index + 1}. [${msg.timestamp}] ${msg.role === 'user' ? 'Lead' : 'AI'}: ${msg.content}\n`
      })
    }

    return context
  }

  private buildLeadContext(leadData: any): string {
    return `
Lead Profile:
- ID: ${leadData.id}
- Name: ${leadData.name || 'Not provided'}
- Email: ${leadData.email || 'Not provided'}
- Phone: ${leadData.phone || 'Not provided'}
- Source: ${leadData.source}
- Status: ${leadData.status}
- Current Score: ${leadData.lead_score || 0}
- Created: ${new Date(leadData.created_at).toLocaleDateString()}
- Tags: ${leadData.lead_tags?.map(t => t.tag_name).join(', ') || 'None'}

Lead Activities:
${leadData.lead_activities?.map(activity => 
  `- ${activity.activity_type}: ${activity.activity_value} (${new Date(activity.created_at).toLocaleDateString()})`
).join('\n') || 'No activities recorded'}

Previous AI Insights:
${leadData.lead_ai_insights?.map(insight => 
  `- ${insight.insight_type}: Confidence ${insight.confidence_score} (${new Date(insight.created_at).toLocaleDateString()})`
).join('\n') || 'No previous insights'}

Additional Context:
${JSON.stringify(leadData.metadata || {}, null, 2)}
    `
  }

  private buildRecentInteractionContext(leadData: any, interactionData: any): string {
    return `
Lead: ${leadData.name || leadData.phone}
Recent Interaction: ${interactionData.content || interactionData.message}
Channel: ${interactionData.channel || 'unknown'}
Time: ${new Date().toISOString()}

Current Lead Score: ${leadData.lead_score || 0}
Previous Sentiment: ${leadData.lead_ai_insights?.find(i => i.insight_type === 'sentiment_analysis')?.insight_data?.overall || 'unknown'}
    `
  }

  private buildRealTimePrompt(context: string): string {
    return `Analyze this fitness lead's latest interaction for immediate insights. Focus on urgency, sentiment changes, and next actions needed.

${context}

Provide quick analysis in JSON format with:
- sentiment change
- urgency level (1-10)  
- immediate actions needed
- buying signals detected
- risk alerts

Keep response concise for real-time processing.`
  }

  private async saveAnalysisResults(
    leadId: string,
    analysis: LeadAnalysisResult,
    organizationId: string
  ): Promise<void> {
    const insights = [
      {
        organization_id: organizationId,
        lead_id: leadId,
        insight_type: 'buying_signals',
        confidence_score: analysis.buyingSignals.confidence,
        insight_data: analysis.buyingSignals,
        ai_model_version: 'claude-3-sonnet + gpt-4',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hour cache
      },
      {
        organization_id: organizationId,
        lead_id: leadId,
        insight_type: 'sentiment_analysis',
        confidence_score: analysis.sentiment.confidence,
        insight_data: analysis.sentiment,
        ai_model_version: 'claude-3-sonnet + gpt-4',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      },
      {
        organization_id: organizationId,
        lead_id: leadId,
        insight_type: 'conversion_likelihood',
        confidence_score: analysis.conversionLikelihood.confidence,
        insight_data: analysis.conversionLikelihood,
        ai_model_version: 'claude-3-sonnet + gpt-4',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      },
      {
        organization_id: organizationId,
        lead_id: leadId,
        insight_type: 'best_contact_time',
        confidence_score: 0.8,
        insight_data: {
          bestContactTime: analysis.bestContactTime,
          communicationStyle: analysis.communicationStyle,
          recommendations: analysis.recommendations
        },
        ai_model_version: 'claude-3-sonnet + gpt-4',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
      },
      {
        organization_id: organizationId,
        lead_id: leadId,
        insight_type: 'interests',
        confidence_score: 0.8,
        insight_data: {
          interests: analysis.interests,
          painPoints: analysis.painPoints,
          motivations: analysis.motivations,
          objections: analysis.objections
        },
        ai_model_version: 'claude-3-sonnet + gpt-4',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      }
    ]

    const { error } = await this.supabase
      .from('lead_ai_insights')
      .insert(insights)

    if (error) {
      console.error('Error saving AI insights:', error)
      throw error
    }
  }

  private async saveCriticalInsights(
    leadId: string,
    analysis: LeadAnalysisResult,
    organizationId: string
  ): Promise<void> {
    // Save only the most critical insights for real-time processing
    const criticalInsights = [
      {
        organization_id: organizationId,
        lead_id: leadId,
        insight_type: 'sentiment_analysis',
        confidence_score: analysis.sentiment.confidence,
        insight_data: analysis.sentiment,
        ai_model_version: 'claude-3-haiku-realtime',
        expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() // 2 hours for real-time
      }
    ]

    await this.supabase.from('lead_ai_insights').insert(criticalInsights)
  }

  private async updateLeadScoring(leadId: string, analysis: LeadAnalysisResult): Promise<void> {
    const aiScore = this.calculateEnhancedAIScore(analysis)

    await this.supabase.rpc('update_lead_score_with_history', {
      lead_id: leadId,
      triggered_by: 'enhanced_ai_analysis',
      change_reason: `Enhanced AI analysis completed. Conversion likelihood: ${analysis.conversionLikelihood.percentage}%`
    })

    // Update AI analysis score specifically
    await this.supabase
      .from('lead_scoring_factors')
      .upsert({
        lead_id: leadId,
        ai_analysis_score: aiScore,
        scoring_metadata: {
          enhanced_ai_analysis: analysis,
          last_enhanced_update: new Date().toISOString(),
          ai_confidence: analysis.conversionLikelihood.confidence
        }
      }, { onConflict: 'lead_id' })
  }

  private async recordAnalysisActivity(
    leadId: string,
    organizationId: string,
    analysis: LeadAnalysisResult
  ): Promise<void> {
    await this.supabase
      .from('lead_activities')
      .insert({
        organization_id: organizationId,
        lead_id: leadId,
        activity_type: 'ai_analysis_completed',
        activity_value: analysis.conversionLikelihood.percentage / 10, // Convert to 1-10 scale
        activity_metadata: {
          analysis_summary: {
            sentiment: analysis.sentiment.overall,
            buying_signals: analysis.buyingSignals.strength,
            urgency: analysis.conversionLikelihood.urgencyLevel,
            timeline: analysis.conversionLikelihood.timeline
          }
        }
      })
  }

  private calculateEnhancedAIScore(analysis: LeadAnalysisResult): number {
    let score = 0

    // Buying signals (0-8 points)
    switch (analysis.buyingSignals.strength) {
      case 'high': score += 8; break
      case 'medium': score += 5; break
      case 'low': score += 2; break
    }

    // Sentiment (0-4 points)
    switch (analysis.sentiment.overall) {
      case 'positive': score += 4; break
      case 'neutral': score += 2; break
      case 'negative': score += 0; break
    }

    // Conversion likelihood (0-6 points)
    score += Math.round((analysis.conversionLikelihood.percentage / 100) * 6)

    // Urgency bonus (0-2 points)
    if (analysis.conversionLikelihood.urgencyLevel >= 8) score += 2
    else if (analysis.conversionLikelihood.urgencyLevel >= 6) score += 1

    // Apply confidence modifier
    const avgConfidence = (
      analysis.buyingSignals.confidence + 
      analysis.sentiment.confidence + 
      analysis.conversionLikelihood.confidence
    ) / 3

    score = Math.round(score * avgConfidence)

    return Math.min(20, Math.max(0, score))
  }

  // Utility methods
  private consolidateStrength(strength1: string, strength2: string): 'low' | 'medium' | 'high' {
    const strengthValues = { low: 1, medium: 2, high: 3 }
    const avg = (strengthValues[strength1] + strengthValues[strength2]) / 2
    
    if (avg >= 2.5) return 'high'
    if (avg >= 1.5) return 'medium'
    return 'low'
  }

  private averageConfidence(conf1: number, conf2: number): number {
    return Math.round(((conf1 || 0.5) + (conf2 || 0.5)) / 2 * 100) / 100
  }

  private averagePercentage(pct1: number, pct2: number): number {
    return Math.round(((pct1 || 50) + (pct2 || 50)) / 2)
  }

  private reconstructAnalysisFromInsights(insights: any[]): LeadAnalysisResult {
    const buyingSignals = insights.find(i => i.insight_type === 'buying_signals')?.insight_data || {}
    const sentiment = insights.find(i => i.insight_type === 'sentiment_analysis')?.insight_data || {}
    const conversion = insights.find(i => i.insight_type === 'conversion_likelihood')?.insight_data || {}
    const contactTime = insights.find(i => i.insight_type === 'best_contact_time')?.insight_data || {}
    const interests = insights.find(i => i.insight_type === 'interests')?.insight_data || {}

    return {
      leadId: insights[0]?.lead_id || '',
      buyingSignals,
      sentiment,
      conversionLikelihood: conversion,
      interests: interests.interests || [],
      objections: interests.objections || [],
      painPoints: interests.painPoints || [],
      motivations: interests.motivations || [],
      bestContactTime: contactTime.bestContactTime || 'any',
      communicationStyle: contactTime.communicationStyle || 'casual',
      recommendations: contactTime.recommendations || [],
      nextBestActions: [],
      riskFactors: [],
      opportunities: []
    }
  }

  private parseRealTimeAnalysis(analysisText: string, leadData: any): LeadAnalysisResult {
    try {
      const parsed = JSON.parse(analysisText)
      return this.createAnalysisFromParsed(parsed, leadData.id)
    } catch (error) {
      return this.createSimplifiedAnalysis(leadData, null)
    }
  }

  private createAnalysisFromParsed(parsed: any, leadId: string): LeadAnalysisResult {
    return {
      leadId,
      buyingSignals: parsed.buyingSignals || { signals: [], strength: 'low', confidence: 0.5, explanation: '' },
      sentiment: parsed.sentiment || { overall: 'neutral', confidence: 0.5, indicators: [], emotionalState: [] },
      conversionLikelihood: parsed.conversionLikelihood || { percentage: 50, confidence: 0.5, reasoning: '', timeline: 'long_term', urgencyLevel: 5 },
      interests: parsed.interests || [],
      objections: parsed.objections || [],
      painPoints: parsed.painPoints || [],
      motivations: parsed.motivations || [],
      bestContactTime: parsed.bestContactTime || 'any',
      communicationStyle: parsed.communicationStyle || 'casual',
      recommendations: parsed.recommendations || [],
      nextBestActions: parsed.nextBestActions || [],
      riskFactors: parsed.riskFactors || [],
      opportunities: parsed.opportunities || []
    }
  }

  private createSimplifiedAnalysis(leadData: any, interactionData: any): LeadAnalysisResult {
    return {
      leadId: leadData.id,
      buyingSignals: { signals: [], strength: 'low', confidence: 0.3, explanation: 'Simplified analysis' },
      sentiment: { overall: 'neutral', confidence: 0.3, indicators: [], emotionalState: [] },
      conversionLikelihood: { percentage: 40, confidence: 0.3, reasoning: 'Fallback analysis', timeline: 'long_term', urgencyLevel: 3 },
      interests: [],
      objections: [],
      painPoints: [],
      motivations: [],
      bestContactTime: 'any',
      communicationStyle: 'casual',
      recommendations: ['Follow up with personalized message'],
      nextBestActions: [],
      riskFactors: [],
      opportunities: []
    }
  }

  private enhanceOpenAIAnalysis(openaiAnalysis: any, leadData: any): LeadAnalysisResult {
    return this.createAnalysisFromParsed(openaiAnalysis, leadData.id)
  }

  private async updateLeadTemperatureIfNeeded(leadId: string, analysis: LeadAnalysisResult): Promise<void> {
    if (analysis.conversionLikelihood.urgencyLevel >= 8) {
      await this.supabase
        .from('leads')
        .update({ 
          status: 'hot',
          updated_at: new Date().toISOString()
        })
        .eq('id', leadId)
    }
  }
}

// Export singleton instance
export const enhancedLeadProcessor = new EnhancedLeadProcessor()