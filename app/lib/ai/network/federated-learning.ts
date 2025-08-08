import { createClient } from '@/app/lib/supabase/server'
import crypto from 'crypto'

export interface LocalPattern {
  type: string
  category: string
  pattern: any
  metrics: PatternMetrics
  context: any
}

export interface PatternMetrics {
  sampleSize: number
  successRate: number
  confidence: number
  performance: any
}

export interface NetworkInsight {
  patternId: string
  type: string
  category: string
  insight: string
  confidence: number
  basedOnOrgs: number
  applicability: number
}

export class FederatedLearningSystem {
  async contributePattern(
    organizationId: string,
    pattern: LocalPattern
  ): Promise<void> {
    // Anonymize the pattern before sharing
    const anonymized = await this.anonymizePattern(pattern, organizationId)
    
    // Only share if we have statistical significance
    if (anonymized.metrics.sampleSize >= 50 && anonymized.metrics.confidence >= 0.7) {
      await this.shareWithNetwork(anonymized)
    }
  }
  
  async getNetworkInsights(
    organizationId: string,
    context: any
  ): Promise<NetworkInsight[]> {
    const supabase = await createClient()
    
    // Get organization profile for matching
    const orgProfile = await this.getOrganizationProfile(organizationId)
    
    // Find similar organizations
    const similarOrgs = await this.findSimilarOrganizations(orgProfile)
    
    // Get relevant patterns from the network
    const patterns = await this.getRelevantPatterns({
      businessType: orgProfile.type,
      businessSize: orgProfile.size,
      queryContext: context,
      minSampleSize: 100,
      confidenceThreshold: 0.8
    })
    
    // Convert patterns to insights
    return this.patternsToInsights(patterns, context, similarOrgs.length)
  }
  
  async analyzeNetworkTrends(category: string): Promise<any[]> {
    const supabase = await createClient()
    
    // Get aggregated patterns for the category
    const { data: patterns } = await supabase
      .from('federated_patterns')
      .select('*')
      .eq('pattern_category', category)
      .gte('confidence_score', 0.75)
      .gte('sample_size', 500)
      .order('confidence_score', { ascending: false })
      .limit(20)
    
    if (!patterns) return []
    
    // Analyze trends across patterns
    return this.extractTrends(patterns)
  }
  
  private async anonymizePattern(
    pattern: LocalPattern,
    organizationId: string
  ): Promise<any> {
    // Remove any personally identifiable information
    const anonymized = JSON.parse(JSON.stringify(pattern))
    
    // Remove specific IDs
    this.removeIds(anonymized)
    
    // Generalize specific values
    this.generalizeValues(anonymized)
    
    // Add noise to metrics for differential privacy
    this.addNoiseToMetrics(anonymized.metrics)
    
    // Hash the organization to track contribution without revealing identity
    anonymized.contributorHash = this.hashOrganization(organizationId)
    
    return anonymized
  }
  
  private removeIds(obj: any): void {
    if (typeof obj !== 'object' || obj === null) return
    
    for (const key in obj) {
      if (key.includes('id') || key.includes('Id') || key === 'email' || key === 'phone' || key === 'name') {
        delete obj[key]
      } else if (typeof obj[key] === 'object') {
        this.removeIds(obj[key])
      }
    }
  }
  
  private generalizeValues(obj: any): void {
    if (typeof obj !== 'object' || obj === null) return
    
    for (const key in obj) {
      if (typeof obj[key] === 'number' && key.includes('amount')) {
        // Round monetary amounts to nearest 10
        obj[key] = Math.round(obj[key] / 10) * 10
      } else if (typeof obj[key] === 'string' && key.includes('time')) {
        // Generalize times to hour
        obj[key] = obj[key].replace(/:\d{2}:\d{2}/, ':00:00')
      } else if (typeof obj[key] === 'object') {
        this.generalizeValues(obj[key])
      }
    }
  }
  
  private addNoiseToMetrics(metrics: PatternMetrics): void {
    // Add Laplacian noise for differential privacy
    const epsilon = 0.1 // Privacy parameter
    
    metrics.sampleSize = Math.max(50, Math.round(
      metrics.sampleSize + this.laplacianNoise(10 / epsilon)
    ))
    
    metrics.successRate = Math.max(0, Math.min(1,
      metrics.successRate + this.laplacianNoise(0.05 / epsilon)
    ))
    
    metrics.confidence = Math.max(0, Math.min(1,
      metrics.confidence + this.laplacianNoise(0.05 / epsilon)
    ))
  }
  
  private laplacianNoise(scale: number): number {
    // Generate Laplacian noise for differential privacy
    const u = Math.random() - 0.5
    return -scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u))
  }
  
  private hashOrganization(organizationId: string): string {
    // Create a one-way hash of the organization ID
    return crypto.createHash('sha256').update(organizationId).digest('hex').slice(0, 16)
  }
  
  private async shareWithNetwork(anonymizedPattern: any): Promise<void> {
    const supabase = await createClient()
    
    // Check if similar pattern already exists
    const existingPattern = await this.findExistingPattern(anonymizedPattern)
    
    if (existingPattern) {
      // Update existing pattern with new data
      await this.updatePattern(existingPattern, anonymizedPattern)
    } else {
      // Create new pattern
      await supabase.from('federated_patterns').insert({
        pattern_type: anonymizedPattern.type,
        pattern_category: anonymizedPattern.category,
        pattern_data: anonymizedPattern.pattern,
        sample_size: anonymizedPattern.metrics.sampleSize,
        confidence_score: anonymizedPattern.metrics.confidence,
        performance_metrics: anonymizedPattern.metrics.performance,
        contributing_orgs: 1,
        applicable_contexts: this.extractContexts(anonymizedPattern)
      })
    }
  }
  
  private async findExistingPattern(pattern: any): Promise<any> {
    const supabase = await createClient()
    
    // Use pattern similarity to find existing patterns
    const { data } = await supabase
      .from('federated_patterns')
      .select('*')
      .eq('pattern_type', pattern.type)
      .eq('pattern_category', pattern.category)
      .limit(10)
    
    if (!data || data.length === 0) return null
    
    // Find most similar pattern
    let mostSimilar = null
    let maxSimilarity = 0
    
    for (const existing of data) {
      const similarity = this.calculatePatternSimilarity(
        existing.pattern_data,
        pattern.pattern
      )
      
      if (similarity > maxSimilarity && similarity > 0.8) {
        maxSimilarity = similarity
        mostSimilar = existing
      }
    }
    
    return mostSimilar
  }
  
  private calculatePatternSimilarity(pattern1: any, pattern2: any): number {
    // Simple similarity calculation - in production, use more sophisticated methods
    const str1 = JSON.stringify(pattern1)
    const str2 = JSON.stringify(pattern2)
    
    if (str1 === str2) return 1.0
    
    // Calculate Jaccard similarity of keys
    const keys1 = new Set(Object.keys(this.flattenObject(pattern1)))
    const keys2 = new Set(Object.keys(this.flattenObject(pattern2)))
    
    const intersection = new Set([...keys1].filter(x => keys2.has(x)))
    const union = new Set([...keys1, ...keys2])
    
    return intersection.size / union.size
  }
  
  private flattenObject(obj: any, prefix = ''): any {
    const flattened: any = {}
    
    for (const key in obj) {
      const newKey = prefix ? `${prefix}.${key}` : key
      
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        Object.assign(flattened, this.flattenObject(obj[key], newKey))
      } else {
        flattened[newKey] = obj[key]
      }
    }
    
    return flattened
  }
  
  private async updatePattern(existing: any, newPattern: any): Promise<void> {
    const supabase = await createClient()
    
    // Merge pattern data
    const mergedMetrics = this.mergeMetrics(
      existing.performance_metrics,
      newPattern.metrics.performance,
      existing.sample_size,
      newPattern.metrics.sampleSize
    )
    
    // Update pattern
    await supabase
      .from('federated_patterns')
      .update({
        sample_size: existing.sample_size + newPattern.metrics.sampleSize,
        confidence_score: this.updateConfidence(
          existing.confidence_score,
          newPattern.metrics.confidence,
          existing.sample_size,
          newPattern.metrics.sampleSize
        ),
        performance_metrics: mergedMetrics,
        contributing_orgs: existing.contributing_orgs + 1,
        last_updated: new Date()
      })
      .eq('id', existing.id)
  }
  
  private mergeMetrics(
    existing: any,
    newMetrics: any,
    existingSize: number,
    newSize: number
  ): any {
    const merged: any = {}
    const totalSize = existingSize + newSize
    
    // Weighted average for numeric metrics
    for (const key in existing) {
      if (typeof existing[key] === 'number' && typeof newMetrics[key] === 'number') {
        merged[key] = (existing[key] * existingSize + newMetrics[key] * newSize) / totalSize
      } else {
        merged[key] = existing[key]
      }
    }
    
    return merged
  }
  
  private updateConfidence(
    existingConf: number,
    newConf: number,
    existingSize: number,
    newSize: number
  ): number {
    const totalSize = existingSize + newSize
    return (existingConf * existingSize + newConf * newSize) / totalSize
  }
  
  private extractContexts(pattern: any): string[] {
    const contexts: string[] = []
    
    // Extract relevant contexts from pattern
    if (pattern.type) contexts.push(pattern.type)
    if (pattern.category) contexts.push(pattern.category)
    if (pattern.context?.businessType) contexts.push(pattern.context.businessType)
    if (pattern.context?.timeframe) contexts.push('temporal')
    if (pattern.pattern?.metric) contexts.push(pattern.pattern.metric)
    
    return [...new Set(contexts)]
  }
  
  private async getOrganizationProfile(organizationId: string): Promise<any> {
    const supabase = await createClient()
    
    const { data: org } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single()
    
    if (!org) return { type: 'fitness', size: 'small' }
    
    // Get additional metrics to determine size
    const { count: memberCount } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
    
    const size = memberCount < 100 ? 'small' : memberCount < 500 ? 'medium' : 'large'
    
    return {
      type: org.industry || 'fitness',
      size,
      features: {
        hasBookings: true,
        hasPayments: true,
        hasAutomations: true
      }
    }
  }
  
  private async findSimilarOrganizations(profile: any): Promise<any[]> {
    // In a real implementation, this would find orgs with similar profiles
    // For now, return a mock list
    return [
      { similarity: 0.9, size: profile.size, type: profile.type },
      { similarity: 0.85, size: profile.size, type: profile.type },
      { similarity: 0.8, size: profile.size, type: profile.type }
    ]
  }
  
  private async getRelevantPatterns(criteria: any): Promise<any[]> {
    const supabase = await createClient()
    
    const { data: patterns } = await supabase
      .from('federated_patterns')
      .select('*')
      .contains('applicable_contexts', [criteria.businessType])
      .gte('confidence_score', criteria.confidenceThreshold)
      .gte('sample_size', criteria.minSampleSize)
      .order('confidence_score', { ascending: false })
      .limit(10)
    
    return patterns || []
  }
  
  private patternsToInsights(
    patterns: any[],
    context: any,
    similarOrgCount: number
  ): NetworkInsight[] {
    return patterns.map(pattern => ({
      patternId: pattern.id,
      type: pattern.pattern_type,
      category: pattern.pattern_category,
      insight: this.generateInsightText(pattern),
      confidence: pattern.confidence_score,
      basedOnOrgs: pattern.contributing_orgs,
      applicability: this.calculateApplicability(pattern, context, similarOrgCount)
    }))
  }
  
  private generateInsightText(pattern: any): string {
    const data = pattern.pattern_data
    
    switch (pattern.pattern_type) {
      case 'churn_pattern':
        return `${Math.round(pattern.performance_metrics.accuracy * 100)}% of similar gyms see churn when ${data.trigger}. Prevention success rate: ${Math.round(pattern.performance_metrics.prevention_rate * 100)}%`
        
      case 'revenue_optimization':
        return `Gyms implementing ${data.strategy} see average revenue increase of ${data.average_increase}% within ${data.timeframe}`
        
      case 'engagement_pattern':
        return `${data.action} leads to ${data.outcome} in ${Math.round(data.success_rate * 100)}% of cases across ${pattern.contributing_orgs} gyms`
        
      default:
        return `Pattern observed across ${pattern.contributing_orgs} similar businesses with ${Math.round(pattern.confidence_score * 100)}% confidence`
    }
  }
  
  private calculateApplicability(
    pattern: any,
    context: any,
    similarOrgCount: number
  ): number {
    let score = 0.5
    
    // Boost score based on similar org participation
    score += Math.min(pattern.contributing_orgs / 100, 0.3)
    
    // Boost based on context match
    const contexts = pattern.applicable_contexts || []
    const contextMatches = contexts.filter((c: string) => 
      JSON.stringify(context).toLowerCase().includes(c.toLowerCase())
    ).length
    
    score += Math.min(contextMatches * 0.1, 0.2)
    
    return Math.min(score, 1.0)
  }
  
  private extractTrends(patterns: any[]): any[] {
    const trends: any[] = []
    
    // Group patterns by type
    const grouped = patterns.reduce((acc, pattern) => {
      const type = pattern.pattern_type
      if (!acc[type]) acc[type] = []
      acc[type].push(pattern)
      return acc
    }, {} as Record<string, any[]>)
    
    // Extract trends from each group
    for (const [type, typePatterns] of Object.entries(grouped)) {
      if (typePatterns.length >= 3) {
        trends.push({
          type,
          trend: this.identifyTrend(typePatterns),
          confidence: this.calculateTrendConfidence(typePatterns),
          basedOn: typePatterns.length
        })
      }
    }
    
    return trends
  }
  
  private identifyTrend(patterns: any[]): string {
    // Simple trend identification - in production, use time series analysis
    const recentPatterns = patterns.filter(p => {
      const age = Date.now() - new Date(p.last_updated).getTime()
      return age < 30 * 24 * 60 * 60 * 1000 // Last 30 days
    })
    
    if (recentPatterns.length > patterns.length * 0.6) {
      return 'increasing'
    } else if (recentPatterns.length < patterns.length * 0.3) {
      return 'decreasing'
    } else {
      return 'stable'
    }
  }
  
  private calculateTrendConfidence(patterns: any[]): number {
    // Calculate confidence based on sample size and consistency
    const avgConfidence = patterns.reduce((sum, p) => sum + p.confidence_score, 0) / patterns.length
    const sizeBonus = Math.min(patterns.length / 20, 0.2)
    
    return Math.min(avgConfidence + sizeBonus, 1.0)
  }
}