import { AIMemorySystem } from './memory'
import { AttentionSystem } from './attention'
import { ReasoningEngine } from './reasoning'
import { LearningSystem } from './learning'
import { ContextBuilder } from './context-builder'
import { OpenAI } from 'openai'

export interface AIResponse {
  answer: string
  confidence: number
  reasoning?: string
  evidence?: any[]
  recommendations?: string[]
  visualizations?: any[]
  actions?: any[]
}

export class SuperAIBrain {
  private memory: AIMemorySystem
  private attention: AttentionSystem
  private reasoning: ReasoningEngine
  private learning: LearningSystem
  private contextBuilder: ContextBuilder
  private openai: OpenAI
  
  constructor() {
    this.memory = new AIMemorySystem()
    this.attention = new AttentionSystem()
    this.reasoning = new ReasoningEngine()
    this.learning = new LearningSystem()
    this.contextBuilder = new ContextBuilder()
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })
  }
  
  async process(query: string, organizationId: string): Promise<AIResponse> {
    try {
      // 1. Build comprehensive context
      const context = await this.contextBuilder.buildContext(query, organizationId)
      
      // 2. Check what needs attention
      const attentionSignals = await this.attention.getRealtimeAlerts(organizationId)
      const focusAreas = await this.attention.determineAttention(organizationId, attentionSignals)
      
      // 3. Apply reasoning
      const reasoningResult = await this.reasoning.reason(query, context, organizationId)
      
      // 4. Generate response
      const response = await this.generateResponse(query, context, reasoningResult, focusAreas)
      
      // 5. Store interaction in memory
      await this.storeInteraction(organizationId, query, response, context)
      
      // 6. Learn from patterns
      if (context.networkInsights.length > 0) {
        await this.learning.getRelevantPatterns(organizationId, context)
      }
      
      return response
    } catch (error) {
      console.error('AI Brain error:', error)
      return {
        answer: 'I encountered an error while processing your request. Please try again.',
        confidence: 0,
        error: error.message
      }
    }
  }
  
  async analyzeBusinessMetric(
    organizationId: string,
    metric: string,
    timeframe?: { start: Date; end: Date }
  ): Promise<AIResponse> {
    const query = `Analyze ${metric} ${timeframe ? `from ${timeframe.start} to ${timeframe.end}` : ''}`
    
    // Build specific context for metric analysis
    const context = await this.contextBuilder.buildContext(query, organizationId)
    
    // Perform multi-step analysis
    const analysis = await this.reasoning.multiStepAnalysis(organizationId, query)
    
    // Find root causes if metric is declining
    let causalAnalysis = null
    if (analysis.conclusion.includes('decline') || analysis.conclusion.includes('decrease')) {
      causalAnalysis = await this.reasoning.causalInference(
        organizationId,
        `${metric} decline`,
        timeframe
      )
    }
    
    return {
      answer: analysis.conclusion,
      confidence: analysis.confidence,
      reasoning: this.explainReasoning(analysis.steps),
      evidence: analysis.evidence,
      recommendations: [
        ...analysis.recommendations || [],
        ...causalAnalysis?.recommendations || []
      ],
      visualizations: await this.generateVisualizations(metric, context)
    }
  }
  
  async predictOutcome(
    organizationId: string,
    scenario: string
  ): Promise<AIResponse> {
    // Get relevant patterns for prediction
    const patterns = await this.learning.getRelevantPatterns(organizationId, { type: 'prediction', scenario })
    
    // Apply patterns to predict
    const prediction = await this.learning.predictBasedOnPatterns(organizationId, { scenario })
    
    // Reason about the prediction
    const reasoning = await this.reasoning.reason(
      `Predict outcome of: ${scenario}`,
      { patterns, scenario },
      organizationId
    )
    
    return {
      answer: `Based on historical patterns and current data, ${prediction.prediction}`,
      confidence: prediction.confidence,
      reasoning: reasoning.conclusion,
      evidence: patterns.map(p => ({
        pattern: p.pattern,
        confidence: p.confidence,
        basedOn: p.sampleSize
      })),
      recommendations: reasoning.recommendations
    }
  }
  
  async getProactiveInsights(organizationId: string): Promise<AIResponse[]> {
    const insights: AIResponse[] = []
    
    // Get attention signals
    const signals = await this.attention.getRealtimeAlerts(organizationId)
    
    // Process each high-priority signal
    for (const signal of signals.filter(s => s.type === 'urgent' || s.type === 'important')) {
      const insight = await this.processSignalToInsight(signal, organizationId)
      if (insight) {
        insights.push(insight)
      }
    }
    
    // Add predictive insights
    const predictions = await this.generatePredictiveInsights(organizationId)
    insights.push(...predictions)
    
    return insights
  }
  
  async learnFromFeedback(
    organizationId: string,
    responseId: string,
    feedback: 'helpful' | 'not_helpful',
    details?: string
  ): Promise<void> {
    // Retrieve the original interaction
    const interaction = await this.getInteraction(responseId)
    
    if (interaction) {
      // Learn from the feedback
      await this.learning.improveFromFeedback(
        organizationId,
        feedback === 'helpful' ? 'positive' : 'negative',
        {
          query: interaction.query,
          response: interaction.response,
          context: interaction.context,
          feedback_details: details
        }
      )
    }
  }
  
  private async generateResponse(
    query: string,
    context: any,
    reasoning: any,
    focusAreas: any[]
  ): Promise<AIResponse> {
    const prompt = `
      You are an AI business intelligence system for a gym/fitness business.
      
      Query: ${query}
      
      Context Summary:
      - ${context.relevantData.length} relevant data points found
      - ${context.entities.length} entities identified
      - ${context.networkInsights.length} industry insights available
      - Current focus areas: ${focusAreas.map(f => f.reason).join(', ')}
      
      Reasoning Result:
      ${JSON.stringify(reasoning, null, 2)}
      
      Provide a comprehensive response that:
      1. Directly answers the query
      2. Includes specific numbers and examples from the data
      3. Provides actionable recommendations
      4. Acknowledges any limitations or uncertainties
      
      Format the response in a conversational but professional tone.
    `
    
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are a highly intelligent AI assistant for gym and fitness businesses. Provide data-driven insights and actionable recommendations.'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 1000
    })
    
    const answer = response.choices[0].message.content || ''
    
    return {
      answer,
      confidence: reasoning.confidence,
      reasoning: this.explainReasoning(reasoning.steps),
      evidence: reasoning.evidence,
      recommendations: reasoning.recommendations,
      visualizations: await this.generateVisualizations(query, context),
      actions: this.suggestActions(reasoning, focusAreas)
    }
  }
  
  private explainReasoning(steps: any[]): string {
    return steps.map(s => `${s.step}. ${s.reasoning}`).join('\n')
  }
  
  private async generateVisualizations(query: string, context: any): Promise<any[]> {
    // Generate appropriate visualizations based on the query type
    const visualizations: any[] = []
    
    if (query.includes('trend') || query.includes('over time')) {
      visualizations.push({
        type: 'line_chart',
        data: this.prepareTimeSeriesData(context.relevantData),
        title: 'Trend Analysis'
      })
    }
    
    if (query.includes('compare') || query.includes('versus')) {
      visualizations.push({
        type: 'bar_chart',
        data: this.prepareComparisonData(context.relevantData),
        title: 'Comparison'
      })
    }
    
    if (query.includes('breakdown') || query.includes('distribution')) {
      visualizations.push({
        type: 'pie_chart',
        data: this.prepareDistributionData(context.relevantData),
        title: 'Distribution'
      })
    }
    
    return visualizations
  }
  
  private suggestActions(reasoning: any, focusAreas: any[]): any[] {
    const actions: any[] = []
    
    // Add actions based on reasoning recommendations
    if (reasoning.recommendations) {
      for (const rec of reasoning.recommendations) {
        actions.push({
          type: 'recommendation',
          priority: 'high',
          action: rec,
          automatable: this.isAutomatable(rec)
        })
      }
    }
    
    // Add actions based on focus areas
    for (const focus of focusAreas.slice(0, 3)) {
      actions.push({
        type: 'attention_required',
        priority: 'urgent',
        action: `Review ${focus.entityType} ${focus.entityId}: ${focus.reason}`,
        entityId: focus.entityId,
        entityType: focus.entityType
      })
    }
    
    return actions
  }
  
  private isAutomatable(recommendation: string): boolean {
    const automatableKeywords = ['send', 'email', 'message', 'schedule', 'create', 'update']
    return automatableKeywords.some(k => recommendation.toLowerCase().includes(k))
  }
  
  private async storeInteraction(
    organizationId: string,
    query: string,
    response: AIResponse,
    context: any
  ): Promise<void> {
    await this.memory.storeMemory(
      organizationId,
      'interaction',
      'ai_query',
      `Query: ${query}\nResponse: ${response.answer}`,
      {
        query,
        response,
        context_summary: {
          entities: context.entities.length,
          data_points: context.relevantData.length,
          confidence: context.confidence
        },
        timestamp: new Date()
      }
    )
  }
  
  private async processSignalToInsight(signal: any, organizationId: string): Promise<AIResponse | null> {
    if (signal.type === 'urgent' && signal.source === 'churn_detection') {
      const clientId = signal.data.entityId
      const analysis = await this.analyzeBusinessMetric(
        organizationId,
        `client ${clientId} churn risk`
      )
      
      return {
        ...analysis,
        answer: `⚠️ High Churn Risk Alert: ${signal.data.risk}\n\n${analysis.answer}`,
        actions: [
          {
            type: 'urgent',
            priority: 'immediate',
            action: 'Contact client within 24 hours',
            entityId: clientId,
            entityType: 'client'
          }
        ]
      }
    }
    
    return null
  }
  
  private async generatePredictiveInsights(organizationId: string): Promise<AIResponse[]> {
    const insights: AIResponse[] = []
    
    // Revenue prediction
    const revenuePrediction = await this.predictOutcome(
      organizationId,
      'revenue for next month based on current trends'
    )
    insights.push(revenuePrediction)
    
    // Capacity optimization
    const capacityAnalysis = await this.analyzeBusinessMetric(
      organizationId,
      'class capacity utilization'
    )
    if (capacityAnalysis.confidence > 0.7) {
      insights.push(capacityAnalysis)
    }
    
    return insights
  }
  
  private async getInteraction(responseId: string): Promise<any> {
    // Retrieve stored interaction
    return null
  }
  
  private prepareTimeSeriesData(data: any[]): any {
    // Prepare data for time series visualization
    return {}
  }
  
  private prepareComparisonData(data: any[]): any {
    // Prepare data for comparison visualization
    return {}
  }
  
  private prepareDistributionData(data: any[]): any {
    // Prepare data for distribution visualization
    return {}
  }
}

// Export singleton instance
export const superAI = new SuperAIBrain()