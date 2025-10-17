/**
 * AI-Powered Landing Page Analytics Analyzer
 * Uses Claude Sonnet 4.5 to analyze landing page performance
 */

import Anthropic from '@anthropic-ai/sdk';

export interface LandingPageMetrics {
  // Traffic
  totalSessions: number;
  uniqueVisitors: number;
  returningVisitors: number;

  // Engagement
  avgSessionDuration: number; // seconds
  avgScrollDepth: number; // percentage
  bounceRate: number; // percentage
  exitRate: number; // percentage

  // Interactions
  totalClicks: number;
  totalRageClicks: number;
  avgClicksPerSession: number;

  // Conversions
  totalConversions: number;
  conversionRate: number; // percentage
  totalConversionValue: number;

  // Device breakdown
  desktopSessions: number;
  mobileSessions: number;
  tabletSessions: number;

  // Top elements
  topClickedElements: Array<{ selector: string; clicks: number; text?: string }>;
  topExitElements: Array<{ selector: string; exits: number }>;

  // Form performance
  formStarts: number;
  formCompletions: number;
  formAbandonmentRate: number;
}

export interface PageContext {
  pageName: string;
  pageUrl: string;
  industry: string;
  pageType: 'landing' | 'sales' | 'lead-gen' | 'product';
  targetAction: string;
}

export interface AnalysisIssue {
  type: string;
  severity: 'high' | 'medium' | 'low';
  description: string;
  recommendation: string;
  expectedImpact: string;
  priority: number; // 1-10
  affectedElements?: string[];
}

export interface BehavioralInsight {
  pattern: string;
  description: string;
  userImpact: string;
  recommendation: string;
}

export interface AIAnalysisResult {
  issues: AnalysisIssue[];
  summary: string;
  overallScore: number; // 0-100
  priorityRecommendations: AnalysisIssue[];
  behavioralInsights: BehavioralInsight[];
  elementPerformance: Array<{
    selector: string;
    ctr: number;
    effectiveness: 'high' | 'medium' | 'low';
    recommendation: string;
  }>;
  segmentAnalysis: {
    desktop: { conversionRate: number; recommendation: string };
    mobile: { conversionRate: number; recommendation: string };
    tablet: { conversionRate: number; recommendation: string };
  };
}

export class AILandingPageAnalyzer {
  private anthropic: Anthropic;

  constructor(apiKey: string) {
    this.anthropic = new Anthropic({ apiKey });
  }

  /**
   * Analyze landing page performance with Claude Sonnet 4.5
   */
  async analyzePage(
    metrics: LandingPageMetrics,
    context: PageContext
  ): Promise<AIAnalysisResult> {
    const prompt = this.buildAnalysisPrompt(metrics, context);

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 6000,
        temperature: 1,
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

      const analysis = this.parseAnalysisResponse(content.text);

      return {
        ...analysis,
        overallScore: this.calculateOverallScore(metrics, analysis),
        priorityRecommendations: this.getPriorityRecommendations(analysis.issues),
        elementPerformance: this.analyzeElementPerformance(metrics),
        segmentAnalysis: this.analyzeSegments(metrics),
      };
    } catch (error) {
      console.error('AI analysis error:', error);
      throw new Error('Failed to generate AI analysis');
    }
  }

  /**
   * Build comprehensive analysis prompt
   */
  private buildAnalysisPrompt(metrics: LandingPageMetrics, context: PageContext): string {
    const deviceDistribution = this.getDeviceDistribution(metrics);
    const engagementQuality = this.getEngagementQuality(metrics);
    const frustrationIndicators = this.getFrustrationIndicators(metrics);

    return `You are an expert conversion rate optimization (CRO) specialist and landing page analyst. Analyze this landing page's performance data and provide deep, actionable insights.

**Page Context:**
- Page Name: ${context.pageName}
- URL: ${context.pageUrl}
- Industry: ${context.industry}
- Page Type: ${context.pageType}
- Target Action: ${context.targetAction}

**Traffic & Engagement Metrics:**
- Total Sessions: ${metrics.totalSessions.toLocaleString()}
- Unique Visitors: ${metrics.uniqueVisitors.toLocaleString()}
- Returning Visitors: ${metrics.returningVisitors.toLocaleString()} (${((metrics.returningVisitors / metrics.uniqueVisitors) * 100).toFixed(1)}%)
- Avg Session Duration: ${Math.floor(metrics.avgSessionDuration / 60)}m ${metrics.avgSessionDuration % 60}s
- Avg Scroll Depth: ${metrics.avgScrollDepth.toFixed(1)}%
- Bounce Rate: ${metrics.bounceRate.toFixed(1)}%
- Exit Rate: ${metrics.exitRate.toFixed(1)}%

**Interaction Metrics:**
- Total Clicks: ${metrics.totalClicks.toLocaleString()}
- Avg Clicks per Session: ${metrics.avgClicksPerSession.toFixed(1)}
- Rage Clicks: ${metrics.totalRageClicks} (${((metrics.totalRageClicks / metrics.totalClicks) * 100).toFixed(1)}% of clicks)

**Conversion Metrics:**
- Total Conversions: ${metrics.totalConversions.toLocaleString()}
- Conversion Rate: ${metrics.conversionRate.toFixed(2)}%
- Total Conversion Value: $${metrics.totalConversionValue.toFixed(2)}
- Revenue per Visitor: $${(metrics.totalConversionValue / metrics.uniqueVisitors).toFixed(2)}

**Device Distribution:**
${deviceDistribution}

**Form Performance:**
- Form Starts: ${metrics.formStarts}
- Form Completions: ${metrics.formCompletions}
- Form Abandonment Rate: ${metrics.formAbandonmentRate.toFixed(1)}%

**Top Clicked Elements:**
${metrics.topClickedElements.map((el, i) => `${i + 1}. ${el.selector} (${el.clicks} clicks)${el.text ? ` - "${el.text}"` : ''}`).join('\n')}

**High Exit Elements (Users leaving from):**
${metrics.topExitElements.map((el, i) => `${i + 1}. ${el.selector} (${el.exits} exits)`).join('\n')}

**Engagement Quality Analysis:**
${engagementQuality}

**Frustration Indicators:**
${frustrationIndicators}

**Industry Benchmarks (${context.industry}):**
- Conversion Rate: 2-5% (good: 5-8%, excellent: 8%+)
- Scroll Depth: 60%+ to reach key content
- Session Duration: 90-180 seconds indicates good engagement
- Bounce Rate: <50% is good, <35% is excellent
- Form Abandonment: <30% is good, <20% is excellent

**Analysis Instructions:**

1. **Critical Issues** (Identify 3-5 issues causing conversion loss):
   - Analyze scroll depth vs. CTA placement
   - Identify rage click patterns (user frustration points)
   - Examine form abandonment vs. completion rates
   - Review device-specific performance gaps
   - Check engagement vs. conversion correlation

2. **Behavioral Patterns** (User journey insights):
   - Common navigation paths from click data
   - Drop-off points in the funnel
   - Element interaction patterns (what works, what doesn't)
   - Device-specific behavior differences

3. **Element Effectiveness** (Based on click and exit data):
   - Which CTAs are performing well vs. poorly
   - Elements causing confusion (rage clicks nearby)
   - Elements where users exit (content gaps or friction)

4. **Actionable Recommendations**:
   - Specific fixes with expected impact (e.g., "+3-5% conversion")
   - Prioritize by: Impact × Ease of Implementation
   - Include mobile-specific recommendations if mobile underperforms
   - Form optimization suggestions if abandonment is high

5. **Quick Wins** (High-impact, low-effort changes):
   - Element repositioning
   - Copy improvements
   - Visual hierarchy adjustments
   - Friction reduction

**Output Format (JSON only, no markdown):**
{
  "issues": [
    {
      "type": "descriptive_name",
      "severity": "high|medium|low",
      "description": "Detailed explanation of the problem and its impact",
      "recommendation": "Specific, actionable fix with implementation details",
      "expectedImpact": "+X-Y% conversion increase or specific metric improvement",
      "priority": 1-10,
      "affectedElements": ["selector1", "selector2"]
    }
  ],
  "summary": "2-3 sentence executive summary: current performance, main issue, top priority action",
  "behavioralInsights": [
    {
      "pattern": "Pattern name",
      "description": "What users are doing",
      "userImpact": "How this affects their experience",
      "recommendation": "How to optimize for this behavior"
    }
  ]
}

Return ONLY valid JSON. No markdown formatting, no code blocks, just the raw JSON object.`;
  }

  /**
   * Parse Claude's JSON response
   */
  private parseAnalysisResponse(text: string): {
    issues: AnalysisIssue[];
    summary: string;
    behavioralInsights: BehavioralInsight[];
  } {
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
        throw new Error('Invalid response: missing issues array');
      }

      if (!parsed.summary) {
        throw new Error('Invalid response: missing summary');
      }

      return {
        issues: parsed.issues,
        summary: parsed.summary,
        behavioralInsights: parsed.behavioralInsights || [],
      };
    } catch (error) {
      console.error('Failed to parse Claude response:', text);
      throw new Error('Failed to parse AI analysis');
    }
  }

  /**
   * Calculate overall health score (0-100)
   */
  private calculateOverallScore(
    metrics: LandingPageMetrics,
    analysis: { issues: AnalysisIssue[] }
  ): number {
    let score = 100;

    // Benchmark targets
    const conversionTarget = 4; // 4% baseline
    const scrollTarget = 60; // 60% scroll depth
    const bounceTarget = 50; // 50% bounce rate
    const durationTarget = 120; // 2 minutes
    const rageClickThreshold = 0.05; // 5% of clicks

    // Conversion rate impact (-35 points max)
    if (metrics.conversionRate < conversionTarget) {
      const gap = (conversionTarget - metrics.conversionRate) / conversionTarget;
      score -= gap * 35;
    }

    // Scroll depth impact (-20 points max)
    if (metrics.avgScrollDepth < scrollTarget) {
      const gap = (scrollTarget - metrics.avgScrollDepth) / scrollTarget;
      score -= gap * 20;
    }

    // Bounce rate impact (-20 points max)
    if (metrics.bounceRate > bounceTarget) {
      const excess = (metrics.bounceRate - bounceTarget) / 50;
      score -= Math.min(excess * 20, 20);
    }

    // Session duration impact (-15 points max)
    if (metrics.avgSessionDuration < durationTarget) {
      const gap = (durationTarget - metrics.avgSessionDuration) / durationTarget;
      score -= gap * 15;
    }

    // Rage click impact (-10 points max)
    const rageClickRate = metrics.totalClicks > 0 ? metrics.totalRageClicks / metrics.totalClicks : 0;
    if (rageClickRate > rageClickThreshold) {
      score -= Math.min((rageClickRate / rageClickThreshold) * 10, 10);
    }

    // Issue severity deductions
    analysis.issues.forEach((issue) => {
      if (issue.severity === 'high') score -= 3;
      if (issue.severity === 'medium') score -= 2;
      if (issue.severity === 'low') score -= 1;
    });

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Get top 3 priority recommendations
   */
  private getPriorityRecommendations(issues: AnalysisIssue[]): AnalysisIssue[] {
    return issues.sort((a, b) => b.priority - a.priority).slice(0, 3);
  }

  /**
   * Analyze element performance from metrics
   */
  private analyzeElementPerformance(
    metrics: LandingPageMetrics
  ): Array<{ selector: string; ctr: number; effectiveness: 'high' | 'medium' | 'low'; recommendation: string }> {
    return metrics.topClickedElements.map((el) => {
      const ctr = (el.clicks / metrics.totalSessions) * 100;
      let effectiveness: 'high' | 'medium' | 'low' = 'low';
      let recommendation = '';

      if (ctr > 15) {
        effectiveness = 'high';
        recommendation = 'This element performs well. Consider A/B testing variations to optimize further.';
      } else if (ctr > 5) {
        effectiveness = 'medium';
        recommendation = 'Moderate performance. Test stronger CTAs, better positioning, or visual prominence.';
      } else {
        effectiveness = 'low';
        recommendation = 'Low engagement. Review placement, copy, design, and ensure it\'s above the fold.';
      }

      return { selector: el.selector, ctr, effectiveness, recommendation };
    });
  }

  /**
   * Analyze device-specific performance
   */
  private analyzeSegments(metrics: LandingPageMetrics) {
    const desktopConvRate =
      metrics.desktopSessions > 0
        ? ((metrics.totalConversions * (metrics.desktopSessions / metrics.totalSessions)) /
            metrics.desktopSessions) *
          100
        : 0;

    const mobileConvRate =
      metrics.mobileSessions > 0
        ? ((metrics.totalConversions * (metrics.mobileSessions / metrics.totalSessions)) / metrics.mobileSessions) *
          100
        : 0;

    const tabletConvRate =
      metrics.tabletSessions > 0
        ? ((metrics.totalConversions * (metrics.tabletSessions / metrics.totalSessions)) / metrics.tabletSessions) *
          100
        : 0;

    return {
      desktop: {
        conversionRate: desktopConvRate,
        recommendation:
          desktopConvRate < 3
            ? 'Desktop conversion is below target. Check form layouts, CTAs, and trust signals.'
            : 'Desktop performance is good.',
      },
      mobile: {
        conversionRate: mobileConvRate,
        recommendation:
          mobileConvRate < desktopConvRate * 0.7
            ? 'Mobile significantly underperforms desktop. Optimize for smaller screens, simplify forms, larger tap targets.'
            : 'Mobile performance is acceptable.',
      },
      tablet: {
        conversionRate: tabletConvRate,
        recommendation:
          tabletConvRate < 2
            ? 'Tablet conversion needs improvement. Review responsive design and touch interactions.'
            : 'Tablet performance is acceptable.',
      },
    };
  }

  /**
   * Helper: Get device distribution summary
   */
  private getDeviceDistribution(metrics: LandingPageMetrics): string {
    const total = metrics.totalSessions;
    return `
- Desktop: ${metrics.desktopSessions} (${((metrics.desktopSessions / total) * 100).toFixed(1)}%)
- Mobile: ${metrics.mobileSessions} (${((metrics.mobileSessions / total) * 100).toFixed(1)}%)
- Tablet: ${metrics.tabletSessions} (${((metrics.tabletSessions / total) * 100).toFixed(1)}%)
    `.trim();
  }

  /**
   * Helper: Assess engagement quality
   */
  private getEngagementQuality(metrics: LandingPageMetrics): string {
    let quality = 'Poor';
    let insights: string[] = [];

    if (metrics.avgScrollDepth > 70) {
      quality = 'Excellent';
      insights.push('Users are scrolling deep - content is engaging');
    } else if (metrics.avgScrollDepth > 50) {
      quality = 'Good';
      insights.push('Decent scroll depth - most users see key content');
    } else {
      quality = 'Poor';
      insights.push('Low scroll depth - users not engaging with full page');
    }

    if (metrics.avgSessionDuration > 180) {
      insights.push('Long session duration indicates high interest');
    } else if (metrics.avgSessionDuration < 60) {
      insights.push('Short sessions suggest lack of engagement or quick decisions');
    }

    if (metrics.avgClicksPerSession > 3) {
      insights.push('High click activity shows active exploration');
    } else if (metrics.avgClicksPerSession < 1.5) {
      insights.push('Low click activity - CTAs may not be compelling');
    }

    return `Quality: ${quality}\n${insights.map((i) => `- ${i}`).join('\n')}`;
  }

  /**
   * Helper: Identify frustration signals
   */
  private getFrustrationIndicators(metrics: LandingPageMetrics): string {
    const indicators: string[] = [];
    const rageClickRate = metrics.totalClicks > 0 ? (metrics.totalRageClicks / metrics.totalClicks) * 100 : 0;

    if (rageClickRate > 10) {
      indicators.push(`⚠️ HIGH FRUSTRATION: ${rageClickRate.toFixed(1)}% of clicks are rage clicks`);
    } else if (rageClickRate > 5) {
      indicators.push(`⚠️ Moderate frustration: ${rageClickRate.toFixed(1)}% rage clicks detected`);
    } else {
      indicators.push(`✓ Low frustration: Only ${rageClickRate.toFixed(1)}% rage clicks`);
    }

    if (metrics.formAbandonmentRate > 50) {
      indicators.push(`⚠️ CRITICAL: ${metrics.formAbandonmentRate.toFixed(1)}% form abandonment - major friction point`);
    } else if (metrics.formAbandonmentRate > 30) {
      indicators.push(`⚠️ ${metrics.formAbandonmentRate.toFixed(1)}% form abandonment - needs optimization`);
    }

    if (metrics.bounceRate > 70) {
      indicators.push(`⚠️ Very high bounce rate: ${metrics.bounceRate.toFixed(1)}% - relevance or loading issues`);
    }

    return indicators.length > 0 ? indicators.join('\n') : 'No major frustration indicators detected';
  }
}

/**
 * Factory function
 */
export function createAILandingPageAnalyzer(): AILandingPageAnalyzer {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is required');
  }

  return new AILandingPageAnalyzer(apiKey);
}
