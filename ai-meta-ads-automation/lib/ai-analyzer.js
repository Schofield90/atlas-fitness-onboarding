/**
 * AI Analysis Integration
 * Handles OpenAI GPT-4 integration for campaign analysis and recommendations
 */

const OpenAI = require('openai');

class AIAnalyzer {
  constructor(apiKey) {
    this.openai = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY
    });
  }

  /**
   * Generate comprehensive campaign analysis and recommendations
   * @param {Array} accounts - Array of account data with processed campaigns
   * @param {Object} summary - Executive summary data
   * @returns {Object} AI analysis results
   */
  async generateAnalysis(accounts, summary) {
    const prompt = this.buildAnalysisPrompt(accounts, summary);
    
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are an expert Meta Ads analyst specializing in gym and fitness lead generation campaigns. Provide actionable insights and specific recommendations based on campaign data."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.7
      });

      return this.parseAnalysisResponse(response.choices[0].message.content);
    } catch (error) {
      console.error('AI analysis error:', error);
      return this.generateFallbackAnalysis(accounts, summary);
    }
  }

  /**
   * Generate crisis analysis for critical issues
   * @param {Array} criticalCampaigns - Campaigns with critical issues
   * @param {Object} accountContext - Account context information
   * @returns {Object} Crisis analysis and immediate action plan
   */
  async generateCrisisAnalysis(criticalCampaigns, accountContext) {
    const prompt = this.buildCrisisPrompt(criticalCampaigns, accountContext);
    
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a Meta Ads crisis management expert. Provide immediate action plans for critical campaign issues in gym lead generation."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 1500,
        temperature: 0.5
      });

      return this.parseCrisisResponse(response.choices[0].message.content);
    } catch (error) {
      console.error('Crisis analysis error:', error);
      return this.generateFallbackCrisisAnalysis(criticalCampaigns);
    }
  }

  /**
   * Build analysis prompt for GPT-4
   * @param {Array} accounts - Account data
   * @param {Object} summary - Executive summary
   * @returns {String} Formatted prompt
   */
  buildAnalysisPrompt(accounts, summary) {
    const accountSummaries = accounts.map(account => {
      const poorPerformers = account.campaigns.filter(c => c.severity === 'critical' || c.severity === 'warning');
      
      return `
Account: ${account.name}
- Total Spend: £${account.metrics.totalSpend}
- Total Leads: ${account.metrics.totalLeads}
- Average CPL: £${account.metrics.averageCPL.toFixed(2)}
- Health Score: ${account.metrics.healthScore}/100
- Critical Campaigns: ${account.metrics.criticalCampaigns}
- Warning Campaigns: ${account.metrics.warningCampaigns}

Poor Performing Campaigns:
${poorPerformers.map(c => `- ${c.campaignName}: £${c.costPerLead} CPL, ${c.leads} leads, ${c.ctr.toFixed(2)}% CTR`).join('\n')}
`;
    }).join('\n---\n');

    return `
Analyze the following gym lead generation campaign data and provide actionable recommendations:

EXECUTIVE SUMMARY:
- Total Accounts: ${summary.totalAccounts}
- Total Spend: £${summary.totalSpend}
- Total Leads: ${summary.totalLeads}
- Average CPL: £${summary.averageCPL.toFixed(2)}
- Overall Health: ${summary.overallHealth}

ACCOUNT DETAILS:
${accountSummaries}

Please provide:
1. Root cause analysis of performance issues
2. Specific optimization recommendations for each problematic campaign
3. Budget reallocation suggestions
4. Creative refresh recommendations
5. Audience targeting adjustments
6. Priority action items ranked by impact

Focus on practical, implementable solutions for gym marketing campaigns.
`;
  }

  /**
   * Build crisis prompt for immediate issues
   * @param {Array} criticalCampaigns - Critical campaigns
   * @param {Object} accountContext - Account context
   * @returns {String} Crisis prompt
   */
  buildCrisisPrompt(criticalCampaigns, accountContext) {
    const campaignDetails = criticalCampaigns.map(campaign => `
Campaign: ${campaign.campaignName}
- Spend: £${campaign.spend}
- Leads: ${campaign.leads}
- CPL: £${campaign.costPerLead}
- CTR: ${campaign.ctr.toFixed(2)}%
- Issues: ${campaign.issues.map(i => i.message).join(', ')}
`).join('\n');

    return `
URGENT: Critical Meta Ads performance issues detected for gym lead generation campaigns.

CRITICAL CAMPAIGNS:
${campaignDetails}

ACCOUNT CONTEXT:
- Account: ${accountContext.accountName}
- Industry: Gym/Fitness
- Campaign Type: Lead Generation
- Target Market: UK

Provide immediate action plan:
1. Stop/pause recommendations with justification
2. Emergency budget adjustments
3. Quick wins for immediate improvement
4. Root cause analysis
5. Specific next steps within 24 hours

Priority: Save budget and improve lead quality immediately.
`;
  }

  /**
   * Parse AI analysis response into structured format
   * @param {String} response - Raw AI response
   * @returns {Object} Structured analysis
   */
  parseAnalysisResponse(response) {
    return {
      rawAnalysis: response,
      recommendations: this.extractRecommendations(response),
      priorityActions: this.extractPriorityActions(response),
      budgetSuggestions: this.extractBudgetSuggestions(response),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Parse crisis analysis response
   * @param {String} response - Raw crisis response
   * @returns {Object} Structured crisis analysis
   */
  parseCrisisResponse(response) {
    return {
      emergencyActions: this.extractEmergencyActions(response),
      budgetActions: this.extractBudgetActions(response),
      quickWins: this.extractQuickWins(response),
      rootCause: this.extractRootCause(response),
      nextSteps: this.extractNextSteps(response),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Extract recommendations from AI response
   * @param {String} response - AI response text
   * @returns {Array} Array of recommendations
   */
  extractRecommendations(response) {
    const recommendations = [];
    const lines = response.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.match(/^[-*]\s|^\d+\.\s/)) {
        recommendations.push(line.replace(/^[-*]\s|^\d+\.\s/, ''));
      }
    }
    
    return recommendations;
  }

  /**
   * Extract priority actions from AI response
   * @param {String} response - AI response text
   * @returns {Array} Priority actions
   */
  extractPriorityActions(response) {
    const prioritySection = response.match(/priority.*?actions?[:\s]*(.*?)(?=\n\n|\n[A-Z]|$)/is);
    if (!prioritySection) return [];
    
    return prioritySection[1]
      .split('\n')
      .filter(line => line.trim().match(/^[-*]\s|^\d+\.\s/))
      .map(line => line.replace(/^[-*]\s|^\d+\.\s/, '').trim());
  }

  /**
   * Extract budget suggestions from AI response
   * @param {String} response - AI response text
   * @returns {Array} Budget suggestions
   */
  extractBudgetSuggestions(response) {
    const budgetSection = response.match(/budget.*?(?:reallocation|allocation|suggestion)[:\s]*(.*?)(?=\n\n|\n[A-Z]|$)/is);
    if (!budgetSection) return [];
    
    return budgetSection[1]
      .split('\n')
      .filter(line => line.trim().match(/^[-*]\s|^\d+\.\s/))
      .map(line => line.replace(/^[-*]\s|^\d+\.\s/, '').trim());
  }

  /**
   * Extract emergency actions from crisis response
   * @param {String} response - Crisis response text
   * @returns {Array} Emergency actions
   */
  extractEmergencyActions(response) {
    const emergencySection = response.match(/(?:emergency|immediate|urgent).*?action[:\s]*(.*?)(?=\n\n|\n[A-Z]|$)/is);
    if (!emergencySection) return [];
    
    return emergencySection[1]
      .split('\n')
      .filter(line => line.trim().match(/^[-*]\s|^\d+\.\s/))
      .map(line => line.replace(/^[-*]\s|^\d+\.\s/, '').trim());
  }

  /**
   * Extract budget actions from crisis response
   * @param {String} response - Crisis response text
   * @returns {Array} Budget actions
   */
  extractBudgetActions(response) {
    const budgetSection = response.match(/budget.*?adjustment[:\s]*(.*?)(?=\n\n|\n[A-Z]|$)/is);
    if (!budgetSection) return [];
    
    return budgetSection[1]
      .split('\n')
      .filter(line => line.trim().match(/^[-*]\s|^\d+\.\s/))
      .map(line => line.replace(/^[-*]\s|^\d+\.\s/, '').trim());
  }

  /**
   * Extract quick wins from crisis response
   * @param {String} response - Crisis response text
   * @returns {Array} Quick wins
   */
  extractQuickWins(response) {
    const quickWinsSection = response.match(/quick.*?win[:\s]*(.*?)(?=\n\n|\n[A-Z]|$)/is);
    if (!quickWinsSection) return [];
    
    return quickWinsSection[1]
      .split('\n')
      .filter(line => line.trim().match(/^[-*]\s|^\d+\.\s/))
      .map(line => line.replace(/^[-*]\s|^\d+\.\s/, '').trim());
  }

  /**
   * Extract root cause from crisis response
   * @param {String} response - Crisis response text
   * @returns {String} Root cause analysis
   */
  extractRootCause(response) {
    const rootCauseSection = response.match(/root.*?cause[:\s]*(.*?)(?=\n\n|\n[A-Z]|$)/is);
    return rootCauseSection ? rootCauseSection[1].trim() : '';
  }

  /**
   * Extract next steps from crisis response
   * @param {String} response - Crisis response text
   * @returns {Array} Next steps
   */
  extractNextSteps(response) {
    const nextStepsSection = response.match(/next.*?steps?[:\s]*(.*?)(?=\n\n|\n[A-Z]|$)/is);
    if (!nextStepsSection) return [];
    
    return nextStepsSection[1]
      .split('\n')
      .filter(line => line.trim().match(/^[-*]\s|^\d+\.\s/))
      .map(line => line.replace(/^[-*]\s|^\d+\.\s/, '').trim());
  }

  /**
   * Generate fallback analysis when AI fails
   * @param {Array} accounts - Account data
   * @param {Object} summary - Executive summary
   * @returns {Object} Fallback analysis
   */
  generateFallbackAnalysis(accounts, summary) {
    const recommendations = [];
    
    // High CPL campaigns
    const highCPLCampaigns = accounts.flatMap(acc => 
      acc.campaigns.filter(c => c.costPerLead > 30)
    );
    
    if (highCPLCampaigns.length > 0) {
      recommendations.push("Review targeting for high CPL campaigns - consider narrowing audience or improving creative");
    }
    
    // No leads campaigns
    const noLeadCampaigns = accounts.flatMap(acc => 
      acc.campaigns.filter(c => c.leads === 0 && c.spend > 50)
    );
    
    if (noLeadCampaigns.length > 0) {
      recommendations.push("Pause campaigns with no leads after £50+ spend - review creative and targeting");
    }
    
    return {
      rawAnalysis: "AI analysis unavailable - using fallback recommendations",
      recommendations,
      priorityActions: ["Review high CPL campaigns immediately", "Pause poor performing campaigns"],
      budgetSuggestions: ["Reallocate budget from poor performers to top campaigns"],
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Generate fallback crisis analysis
   * @param {Array} criticalCampaigns - Critical campaigns
   * @returns {Object} Fallback crisis analysis
   */
  generateFallbackCrisisAnalysis(criticalCampaigns) {
    const emergencyActions = [];
    
    criticalCampaigns.forEach(campaign => {
      if (campaign.costPerLead > 40) {
        emergencyActions.push(`PAUSE: ${campaign.campaignName} - CPL £${campaign.costPerLead} too high`);
      }
      if (campaign.leads === 0 && campaign.spend > 100) {
        emergencyActions.push(`PAUSE: ${campaign.campaignName} - No leads after £${campaign.spend} spend`);
      }
    });
    
    return {
      emergencyActions,
      budgetActions: ["Pause all campaigns with CPL > £40", "Reallocate budget to proven performers"],
      quickWins: ["Review ad creative for engagement", "Check targeting overlap"],
      rootCause: "High competition or poor targeting likely causing performance issues",
      nextSteps: ["Analyze competitor ads", "Review audience insights", "Test new creative"],
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = AIAnalyzer;