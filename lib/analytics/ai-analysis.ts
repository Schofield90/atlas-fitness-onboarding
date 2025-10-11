/**
 * AI-Powered Analytics Analysis Service
 * Uses Claude Sonnet 4.5 to analyze landing page performance and generate insights
 */

import Anthropic from '@anthropic-ai/sdk';
import { ClarityAnalytics } from './clarity-integration';

export interface AnalysisIssue {
  type: string;
  severity: 'high' | 'medium' | 'low';
  description: string;
  recommendation: string;
  expectedImpact: string;
  priority: number; // 1-10, higher is more important
}

export interface AIInsights {
  issues: AnalysisIssue[];
  summary: string;
  overallScore: number; // 0-100 health score
  priorityRecommendations: AnalysisIssue[]; // Top 3 by impact
}

export interface PageContext {
  pageName: string;
  pageUrl: string;
  industry: string; // 'fitness', 'gym', 'wellness'
  pageType: 'landing' | 'sales' | 'lead-gen';
  targetAction: string; // 'sign-up', 'book-trial', 'contact'
}

export class AIAnalysisService {
  private anthropic: Anthropic;

  constructor(apiKey: string) {
    this.anthropic = new Anthropic({ apiKey });
  }

  /**
   * Analyze landing page performance with Claude Sonnet 4.5
   */
  async analyzePage(
    analytics: ClarityAnalytics,
    context: PageContext
  ): Promise<AIInsights> {
    const prompt = this.buildAnalysisPrompt(analytics, context);

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514', // Claude Sonnet 4.5
        max_tokens: 4000,
        temperature: 1, // Default for Claude Sonnet 4.5
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      const insights = this.parseClaudeResponse(content.text);

      return {
        ...insights,
        overallScore: this.calculateOverallScore(analytics, insights),
        priorityRecommendations: this.getPriorityRecommendations(insights.issues),
      };
    } catch (error) {
      console.error('AI analysis error:', error);
      throw new Error('Failed to generate AI insights');
    }
  }

  /**
   * Build comprehensive analysis prompt for Claude
   */
  private buildAnalysisPrompt(
    analytics: ClarityAnalytics,
    context: PageContext
  ): string {
    return `You are an expert conversion rate optimization (CRO) specialist for ${context.industry} businesses. Analyze this landing page performance data and provide actionable insights.

**Page Context:**
- Page Name: ${context.pageName}
- Page URL: ${context.pageUrl}
- Industry: ${context.industry}
- Page Type: ${context.pageType}
- Target Action: ${context.targetAction}

**Performance Metrics:**
- Total Sessions: ${analytics.sessions.toLocaleString()}
- Average Session Duration: ${Math.floor(analytics.avgDuration / 60)}m ${analytics.avgDuration % 60}s
- Average Scroll Depth: ${analytics.scrollDepth.toFixed(1)}%
- Conversion Rate: ${analytics.conversionRate.toFixed(2)}%
- Bounce Rate: ${analytics.bounceRate.toFixed(1)}%
- Top Exit Percentage: ${analytics.topExitPercentage.toFixed(1)}%

**Analysis Instructions:**

1. **Identify Issues**: Find 3-5 critical issues affecting conversions. Consider:
   - Low conversion rate (fitness industry average: 2-5%)
   - Poor scroll depth (target: >60% for key content)
   - High bounce rate (target: <50%)
   - Short session duration (target: >2 min for landing pages)
   - Early exit patterns

2. **Severity Classification**:
   - HIGH: Issues causing >5% conversion loss
   - MEDIUM: Issues causing 2-5% conversion loss
   - LOW: Issues causing <2% conversion loss

3. **Recommendations**: For each issue, provide:
   - Specific, actionable fix (not generic advice)
   - Expected conversion impact as a range (e.g., "+5-8%")
   - Implementation difficulty (easy/medium/hard)
   - Priority score (1-10)

4. **Industry Best Practices**: Compare against fitness/gym industry benchmarks:
   - Gym landing pages typically convert at 3-7%
   - Scroll depth should reach 65%+ for pricing/CTA sections
   - Session duration: 2-4 minutes indicates good engagement

5. **Executive Summary**: 2-3 sentences explaining overall performance and #1 priority

**Output Format** (JSON only, no markdown):
{
  "issues": [
    {
      "type": "descriptive_name",
      "severity": "high|medium|low",
      "description": "What's wrong and why it matters",
      "recommendation": "Specific action to take",
      "expectedImpact": "+X-Y% conversion increase or metric improvement",
      "priority": 1-10
    }
  ],
  "summary": "Executive summary of findings and top priority"
}

Return ONLY valid JSON. No markdown formatting, no code blocks, just the raw JSON object.`;
  }

  /**
   * Parse Claude's JSON response
   */
  private parseClaudeResponse(text: string): { issues: AnalysisIssue[]; summary: string } {
    try {
      // Remove markdown code blocks if present
      let cleanText = text.trim();
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/```\n?/g, '');
      }

      const parsed = JSON.parse(cleanText);

      if (!parsed.issues || !Array.isArray(parsed.issues)) {
        throw new Error('Invalid response structure: missing issues array');
      }

      if (!parsed.summary) {
        throw new Error('Invalid response structure: missing summary');
      }

      return parsed;
    } catch (error) {
      console.error('Failed to parse Claude response:', text);
      throw new Error('Failed to parse AI insights');
    }
  }

  /**
   * Calculate overall health score (0-100)
   */
  private calculateOverallScore(
    analytics: ClarityAnalytics,
    insights: { issues: AnalysisIssue[] }
  ): number {
    let score = 100;

    // Deduct points based on metrics vs benchmarks
    const conversionBenchmark = 4; // 4% for fitness
    const scrollBenchmark = 60; // 60% scroll depth
    const bounceBenchmark = 50; // 50% bounce rate
    const durationBenchmark = 120; // 2 minutes

    // Conversion rate impact (-30 points max)
    if (analytics.conversionRate < conversionBenchmark) {
      score -= ((conversionBenchmark - analytics.conversionRate) / conversionBenchmark) * 30;
    }

    // Scroll depth impact (-25 points max)
    if (analytics.scrollDepth < scrollBenchmark) {
      score -= ((scrollBenchmark - analytics.scrollDepth) / scrollBenchmark) * 25;
    }

    // Bounce rate impact (-25 points max)
    if (analytics.bounceRate > bounceBenchmark) {
      score -= ((analytics.bounceRate - bounceBenchmark) / 50) * 25;
    }

    // Session duration impact (-20 points max)
    if (analytics.avgDuration < durationBenchmark) {
      score -= ((durationBenchmark - analytics.avgDuration) / durationBenchmark) * 20;
    }

    // Deduct based on issue severity
    insights.issues.forEach((issue) => {
      if (issue.severity === 'high') score -= 5;
      if (issue.severity === 'medium') score -= 3;
      if (issue.severity === 'low') score -= 1;
    });

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Get top 3 priority recommendations
   */
  private getPriorityRecommendations(issues: AnalysisIssue[]): AnalysisIssue[] {
    return issues
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 3);
  }

  /**
   * Generate comparison prompt for A/B testing insights
   */
  async comparePageVersions(
    versionA: ClarityAnalytics,
    versionB: ClarityAnalytics,
    context: PageContext
  ): Promise<string> {
    const prompt = `Compare these two landing page versions and determine which performs better:

**Version A Metrics:**
- Conversion Rate: ${versionA.conversionRate.toFixed(2)}%
- Scroll Depth: ${versionA.scrollDepth.toFixed(1)}%
- Bounce Rate: ${versionA.bounceRate.toFixed(1)}%
- Avg Duration: ${versionA.avgDuration}s

**Version B Metrics:**
- Conversion Rate: ${versionB.conversionRate.toFixed(2)}%
- Scroll Depth: ${versionB.scrollDepth.toFixed(1)}%
- Bounce Rate: ${versionB.bounceRate.toFixed(1)}%
- Avg Duration: ${versionB.avgDuration}s

Which version wins and why? Provide a clear recommendation.`;

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      temperature: 1,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    return content.type === 'text' ? content.text : '';
  }
}

/**
 * Factory function to create AI analysis service
 */
export function createAIAnalysisService(): AIAnalysisService {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is required');
  }

  return new AIAnalysisService(apiKey);
}
