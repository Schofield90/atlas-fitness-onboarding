import OpenAI from 'openai';
import { z } from 'zod';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Schema for campaign optimization analysis
const campaignOptimizationSchema = z.object({
  overall_score: z.number().min(0).max(100),
  performance_analysis: z.object({
    strengths: z.array(z.string()),
    weaknesses: z.array(z.string()),
    opportunities: z.array(z.string()),
    threats: z.array(z.string()),
  }),
  budget_recommendations: z.object({
    suggested_daily_budget: z.number().optional(),
    budget_allocation: z.object({
      percentage_increase: z.number().optional(),
      percentage_decrease: z.number().optional(),
      reason: z.string(),
    }),
    bid_strategy: z.enum(['increase', 'decrease', 'maintain']),
    bid_reason: z.string(),
  }),
  audience_optimization: z.object({
    current_audience_quality: z.enum(['poor', 'fair', 'good', 'excellent']),
    audience_recommendations: z.array(z.object({
      type: z.enum(['expand', 'narrow', 'exclude', 'include']),
      suggestion: z.string(),
      impact: z.enum(['low', 'medium', 'high']),
    })),
    lookalike_opportunities: z.array(z.string()),
    interest_recommendations: z.array(z.string()),
  }),
  creative_optimization: z.object({
    creative_fatigue_score: z.number().min(0).max(100),
    creative_recommendations: z.array(z.object({
      type: z.enum(['headline', 'description', 'image', 'video', 'cta']),
      suggestion: z.string(),
      priority: z.enum(['low', 'medium', 'high']),
    })),
    ab_test_suggestions: z.array(z.object({
      element: z.string(),
      variation_a: z.string(),
      variation_b: z.string(),
      hypothesis: z.string(),
    })),
  }),
  placement_optimization: z.object({
    recommended_placements: z.array(z.string()),
    placements_to_exclude: z.array(z.string()),
    device_recommendations: z.array(z.string()),
  }),
  timing_optimization: z.object({
    optimal_schedule: z.object({
      days: z.array(z.string()),
      hours: z.array(z.number()),
      timezone: z.string(),
    }),
    seasonal_adjustments: z.array(z.string()),
  }),
  action_items: z.array(z.object({
    priority: z.enum(['low', 'medium', 'high', 'urgent']),
    action: z.string(),
    expected_impact: z.string(),
    effort_required: z.enum(['low', 'medium', 'high']),
    timeline: z.string(),
  })),
  predicted_outcomes: z.object({
    cost_per_lead_improvement: z.number().optional(),
    conversion_rate_improvement: z.number().optional(),
    click_through_rate_improvement: z.number().optional(),
    roi_improvement: z.number().optional(),
    confidence_level: z.enum(['low', 'medium', 'high']),
  }),
});

export type CampaignOptimizationResult = z.infer<typeof campaignOptimizationSchema>;

export interface CampaignData {
  id: string;
  name: string;
  objective: string;
  platform: string;
  budget_amount: number;
  budget_type: string;
  start_date: string;
  end_date?: string;
  target_audience: {
    age_min?: number;
    age_max?: number;
    genders?: string[];
    locations?: string[];
    interests?: string[];
    languages?: string[];
  };
  ad_creative: {
    headline?: string;
    description?: string;
    image_urls?: string[];
    video_url?: string;
    call_to_action?: string;
    destination_url?: string;
  };
  metrics: {
    impressions: number;
    clicks: number;
    spend: number;
    leads: number;
    conversions: number;
    ctr: number;
    cpc: number;
    cpm: number;
    cost_per_lead: number;
    cost_per_conversion: number;
    roas: number;
  };
  created_at: string;
  updated_at: string;
}

export interface IndustryBenchmarks {
  fitness_industry: {
    avg_ctr: number;
    avg_cpc: number;
    avg_cpm: number;
    avg_cost_per_lead: number;
    avg_conversion_rate: number;
    avg_roas: number;
  };
}

export class CampaignOptimizer {
  private industryBenchmarks: IndustryBenchmarks = {
    fitness_industry: {
      avg_ctr: 0.025, // 2.5%
      avg_cpc: 1.50, // £1.50
      avg_cpm: 8.00, // £8.00
      avg_cost_per_lead: 25.00, // £25.00
      avg_conversion_rate: 0.15, // 15%
      avg_roas: 4.0, // 4:1 return on ad spend
    },
  };

  async optimizeCampaign(
    campaign: CampaignData,
    historicalData?: CampaignData[]
  ): Promise<CampaignOptimizationResult> {
    try {
      const prompt = this.buildOptimizationPrompt(campaign, historicalData);
      
      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are an expert digital marketing strategist specializing in fitness industry campaigns. 
            Analyze the provided campaign data and provide actionable optimization recommendations.
            Focus on improving lead quality, reducing costs, and increasing conversions.
            Consider fitness industry benchmarks and seasonal trends.
            Provide specific, actionable recommendations with clear reasoning.
            Return your analysis in valid JSON format matching the required schema.`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 4000,
      });

      const aiResponse = response.choices[0]?.message?.content;
      if (!aiResponse) {
        throw new Error('No response from AI');
      }

      // Parse and validate the response
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(aiResponse);
      } catch {
        throw new Error('Invalid JSON response from AI');
      }

      const validatedResult = campaignOptimizationSchema.parse(parsedResponse);
      return validatedResult;
    } catch (error) {
      console.error('Campaign optimization error:', error);
      throw new Error(`Failed to optimize campaign: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private buildOptimizationPrompt(
    campaign: CampaignData,
    historicalData?: CampaignData[]
  ): string {
    const benchmarks = this.industryBenchmarks.fitness_industry;
    
    const campaignAge = Math.floor(
      (new Date().getTime() - new Date(campaign.created_at).getTime()) / (1000 * 60 * 60 * 24)
    );

    const performanceComparison = {
      ctr_vs_benchmark: campaign.metrics.ctr / benchmarks.avg_ctr,
      cpc_vs_benchmark: campaign.metrics.cpc / benchmarks.avg_cpc,
      cost_per_lead_vs_benchmark: campaign.metrics.cost_per_lead / benchmarks.avg_cost_per_lead,
      roas_vs_benchmark: campaign.metrics.roas / benchmarks.avg_roas,
    };

    return `
# Campaign Optimization Analysis Request

## Campaign Details
- **Name**: ${campaign.name}
- **Objective**: ${campaign.objective}
- **Platform**: ${campaign.platform}
- **Budget**: £${campaign.budget_amount} (${campaign.budget_type})
- **Duration**: ${campaignAge} days (Started: ${campaign.start_date})
- **Target Audience**: 
  - Age: ${campaign.target_audience.age_min || 18}-${campaign.target_audience.age_max || 65}
  - Genders: ${campaign.target_audience.genders?.join(', ') || 'All'}
  - Locations: ${campaign.target_audience.locations?.join(', ') || 'Not specified'}
  - Interests: ${campaign.target_audience.interests?.join(', ') || 'Not specified'}

## Creative Elements
- **Headline**: ${campaign.ad_creative.headline || 'Not specified'}
- **Description**: ${campaign.ad_creative.description || 'Not specified'}
- **Call to Action**: ${campaign.ad_creative.call_to_action || 'Not specified'}
- **Has Image**: ${campaign.ad_creative.image_urls?.length ? 'Yes' : 'No'}
- **Has Video**: ${campaign.ad_creative.video_url ? 'Yes' : 'No'}

## Current Performance Metrics
- **Impressions**: ${campaign.metrics.impressions.toLocaleString()}
- **Clicks**: ${campaign.metrics.clicks.toLocaleString()}
- **CTR**: ${(campaign.metrics.ctr * 100).toFixed(2)}% (Benchmark: ${(benchmarks.avg_ctr * 100).toFixed(2)}%)
- **CPC**: £${campaign.metrics.cpc.toFixed(2)} (Benchmark: £${benchmarks.avg_cpc.toFixed(2)})
- **CPM**: £${campaign.metrics.cpm.toFixed(2)} (Benchmark: £${benchmarks.avg_cpm.toFixed(2)})
- **Total Spend**: £${campaign.metrics.spend.toFixed(2)}
- **Leads Generated**: ${campaign.metrics.leads}
- **Cost per Lead**: £${campaign.metrics.cost_per_lead.toFixed(2)} (Benchmark: £${benchmarks.avg_cost_per_lead.toFixed(2)})
- **Conversions**: ${campaign.metrics.conversions}
- **ROAS**: ${campaign.metrics.roas.toFixed(2)}x (Benchmark: ${benchmarks.avg_roas.toFixed(2)}x)

## Performance vs Industry Benchmarks
- **CTR Performance**: ${performanceComparison.ctr_vs_benchmark > 1 ? 'Above' : 'Below'} benchmark (${(performanceComparison.ctr_vs_benchmark * 100).toFixed(1)}%)
- **CPC Performance**: ${performanceComparison.cpc_vs_benchmark < 1 ? 'Better' : 'Worse'} than benchmark (${(performanceComparison.cpc_vs_benchmark * 100).toFixed(1)}%)
- **Cost per Lead**: ${performanceComparison.cost_per_lead_vs_benchmark < 1 ? 'Better' : 'Worse'} than benchmark (${(performanceComparison.cost_per_lead_vs_benchmark * 100).toFixed(1)}%)
- **ROAS Performance**: ${performanceComparison.roas_vs_benchmark > 1 ? 'Above' : 'Below'} benchmark (${(performanceComparison.roas_vs_benchmark * 100).toFixed(1)}%)

${historicalData ? `
## Historical Performance Context
Previous campaigns data available for trend analysis:
${historicalData.map(h => `- ${h.name}: CTR ${(h.metrics.ctr * 100).toFixed(2)}%, CPL £${h.metrics.cost_per_lead.toFixed(2)}, ROAS ${h.metrics.roas.toFixed(2)}x`).join('\n')}
` : ''}

## Analysis Requirements
Please provide a comprehensive optimization analysis including:

1. **Overall Performance Score** (0-100)
2. **SWOT Analysis** (Strengths, Weaknesses, Opportunities, Threats)
3. **Budget & Bidding Recommendations**
4. **Audience Optimization Suggestions**
5. **Creative Optimization Recommendations**
6. **Placement & Device Optimization**
7. **Timing & Scheduling Optimization**
8. **Prioritized Action Items**
9. **Predicted Outcomes**

Focus on actionable recommendations that can improve lead quality, reduce costs, and increase conversions in the fitness industry context.

Please return your analysis in valid JSON format matching the required schema.
`;
  }

  async generateABTestSuggestions(
    campaign: CampaignData
  ): Promise<Array<{
    element: string;
    variation_a: string;
    variation_b: string;
    hypothesis: string;
    expected_impact: string;
  }>> {
    try {
      const prompt = `
# A/B Test Suggestions for Fitness Campaign

## Campaign Context
- **Name**: ${campaign.name}
- **Objective**: ${campaign.objective}
- **Current Performance**: CTR ${(campaign.metrics.ctr * 100).toFixed(2)}%, CPL £${campaign.metrics.cost_per_lead.toFixed(2)}
- **Current Creative**: 
  - Headline: ${campaign.ad_creative.headline || 'Not specified'}
  - Description: ${campaign.ad_creative.description || 'Not specified'}
  - CTA: ${campaign.ad_creative.call_to_action || 'Not specified'}

Generate 5 A/B test suggestions for this fitness campaign. Focus on elements that typically drive the most impact in fitness marketing.

Return as JSON array with objects containing: element, variation_a, variation_b, hypothesis, expected_impact
`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a conversion optimization expert specializing in fitness industry A/B testing. Generate data-driven test suggestions.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.4,
        max_tokens: 2000,
      });

      const aiResponse = response.choices[0]?.message?.content;
      if (!aiResponse) {
        throw new Error('No response from AI');
      }

      return JSON.parse(aiResponse);
    } catch (error) {
      console.error('A/B test generation error:', error);
      throw new Error(`Failed to generate A/B test suggestions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async analyzeCampaignTrends(
    campaigns: CampaignData[]
  ): Promise<{
    trends: {
      performance_trend: 'improving' | 'declining' | 'stable';
      cost_trend: 'increasing' | 'decreasing' | 'stable';
      quality_trend: 'improving' | 'declining' | 'stable';
    };
    insights: string[];
    recommendations: string[];
  }> {
    try {
      const prompt = `
# Campaign Performance Trend Analysis

## Campaign Data
${campaigns.map((c, i) => `
Campaign ${i + 1}: ${c.name}
- Period: ${c.start_date} to ${c.end_date || 'ongoing'}
- CTR: ${(c.metrics.ctr * 100).toFixed(2)}%
- CPC: £${c.metrics.cpc.toFixed(2)}
- Cost per Lead: £${c.metrics.cost_per_lead.toFixed(2)}
- ROAS: ${c.metrics.roas.toFixed(2)}x
- Leads: ${c.metrics.leads}
- Conversions: ${c.metrics.conversions}
`).join('\n')}

Analyze the trends across these campaigns and provide insights on:
1. Overall performance trends
2. Cost efficiency trends  
3. Lead quality trends
4. Key insights and patterns
5. Strategic recommendations

Return as JSON with trends (performance_trend, cost_trend, quality_trend) and arrays of insights and recommendations.
`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a data analyst specializing in fitness marketing performance analysis. Identify trends and provide strategic insights.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      });

      const aiResponse = response.choices[0]?.message?.content;
      if (!aiResponse) {
        throw new Error('No response from AI');
      }

      return JSON.parse(aiResponse);
    } catch (error) {
      console.error('Trend analysis error:', error);
      throw new Error(`Failed to analyze campaign trends: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateSeasonalRecommendations(
    campaigns: CampaignData[]
  ): Promise<{
    current_season: string;
    seasonal_opportunities: string[];
    budget_adjustments: string[];
    creative_themes: string[];
    timing_recommendations: string[];
  }> {
    try {
      const currentMonth = new Date().getMonth() + 1;
      const currentSeason = this.getCurrentSeason(currentMonth);

      const prompt = `
# Seasonal Fitness Marketing Recommendations

## Current Context
- **Current Season**: ${currentSeason}
- **Month**: ${currentMonth}
- **Industry**: Fitness/Gym

## Historical Campaign Performance
${campaigns.map((c, i) => `
Campaign ${i + 1}: ${c.name}
- Performance: CTR ${(c.metrics.ctr * 100).toFixed(2)}%, CPL £${c.metrics.cost_per_lead.toFixed(2)}
- Audience: ${c.target_audience.age_min}-${c.target_audience.age_max} years
- Creative theme: ${c.ad_creative.headline || 'Not specified'}
`).join('\n')}

Provide seasonal recommendations for fitness marketing including:
1. Current seasonal opportunities
2. Budget adjustment recommendations
3. Creative themes that resonate with the season
4. Optimal timing recommendations

Consider fitness industry seasonality patterns (New Year, summer prep, post-holiday, etc.).

Return as JSON with arrays for each recommendation category.
`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a seasonal marketing strategist specializing in fitness industry trends and consumer behavior patterns.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.4,
        max_tokens: 2000,
      });

      const aiResponse = response.choices[0]?.message?.content;
      if (!aiResponse) {
        throw new Error('No response from AI');
      }

      return JSON.parse(aiResponse);
    } catch (error) {
      console.error('Seasonal recommendations error:', error);
      throw new Error(`Failed to generate seasonal recommendations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private getCurrentSeason(month: number): string {
    if (month >= 12 || month <= 2) return 'Winter';
    if (month >= 3 && month <= 5) return 'Spring';
    if (month >= 6 && month <= 8) return 'Summer';
    return 'Autumn';
  }

  calculatePerformanceScore(campaign: CampaignData): number {
    const benchmarks = this.industryBenchmarks.fitness_industry;
    
    const ctrScore = Math.min(100, (campaign.metrics.ctr / benchmarks.avg_ctr) * 25);
    const cpcScore = Math.min(100, (benchmarks.avg_cpc / campaign.metrics.cpc) * 25);
    const costPerLeadScore = Math.min(100, (benchmarks.avg_cost_per_lead / campaign.metrics.cost_per_lead) * 25);
    const roasScore = Math.min(100, (campaign.metrics.roas / benchmarks.avg_roas) * 25);

    return Math.round(ctrScore + cpcScore + costPerLeadScore + roasScore);
  }

  async generateCreativeVariations(
    campaign: CampaignData,
    elementType: 'headline' | 'description' | 'cta'
  ): Promise<string[]> {
    try {
      const prompt = `
# Creative Variation Generator

## Campaign Context
- **Name**: ${campaign.name}
- **Objective**: ${campaign.objective}
- **Target Audience**: ${campaign.target_audience.age_min}-${campaign.target_audience.age_max} years
- **Current Performance**: CTR ${(campaign.metrics.ctr * 100).toFixed(2)}%, CPL £${campaign.metrics.cost_per_lead.toFixed(2)}

## Current Creative
- **Headline**: ${campaign.ad_creative.headline || 'Not specified'}
- **Description**: ${campaign.ad_creative.description || 'Not specified'}
- **CTA**: ${campaign.ad_creative.call_to_action || 'Not specified'}

Generate 5 variations for the ${elementType} that would appeal to fitness enthusiasts and potentially improve performance.

Consider:
- Emotional triggers (motivation, transformation, community)
- Pain points (lack of time, lack of results, intimidation)
- Benefits (health, appearance, confidence, strength)
- Urgency and scarcity
- Social proof

Return as JSON array of strings.
`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a copywriter specializing in fitness marketing. Create compelling, conversion-focused variations.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.6,
        max_tokens: 1000,
      });

      const aiResponse = response.choices[0]?.message?.content;
      if (!aiResponse) {
        throw new Error('No response from AI');
      }

      return JSON.parse(aiResponse);
    } catch (error) {
      console.error('Creative variations error:', error);
      throw new Error(`Failed to generate creative variations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Factory function to create campaign optimizer
export function createCampaignOptimizer(): CampaignOptimizer {
  return new CampaignOptimizer();
}

// Helper function to validate OpenAI API key
export function validateOpenAIKey(): boolean {
  return !!process.env.OPENAI_API_KEY;
}