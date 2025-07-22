/**
 * Meta Ads Data Processing Utilities
 * Handles extraction and processing of Meta Ads data from MCP responses
 */

class MetaDataProcessor {
  constructor() {
    this.thresholds = {
      costPerLead: { warning: 25, critical: 40 },
      dailySpend: { warning: 100, critical: 200 },
      ctr: { warning: 0.8, critical: 0.5 }
    };
  }

  /**
   * Extract lead metrics from campaign insights
   * @param {Object} campaign - Campaign data from Meta MCP
   * @returns {Object} Processed lead metrics
   */
  extractLeadMetrics(campaign) {
    const leadActions = campaign.actions?.find(action => action.action_type === 'lead');
    const leadCosts = campaign.cost_per_action_type?.find(action => action.action_type === 'lead');
    
    const leads = leadActions ? parseInt(leadActions.value) : 0;
    const costPerLead = leadCosts ? parseFloat(leadCosts.value) : 0;
    const spend = parseFloat(campaign.spend || 0);
    const impressions = parseInt(campaign.impressions || 0);
    const clicks = parseInt(campaign.clicks || 0);
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;

    return {
      campaignId: campaign.campaign_id,
      campaignName: campaign.campaign_name,
      leads,
      costPerLead,
      spend,
      impressions,
      clicks,
      ctr,
      dateStart: campaign.date_start,
      dateStop: campaign.date_stop
    };
  }

  /**
   * Process multiple campaigns data
   * @param {Array} campaigns - Array of campaign data
   * @returns {Array} Processed campaigns with metrics
   */
  processCampaigns(campaigns) {
    return campaigns.map(campaign => {
      const metrics = this.extractLeadMetrics(campaign);
      const issues = this.identifyIssues(metrics);
      
      return {
        ...metrics,
        issues,
        severity: this.calculateSeverity(issues)
      };
    });
  }

  /**
   * Identify performance issues in campaign metrics
   * @param {Object} metrics - Campaign metrics
   * @returns {Array} Array of identified issues
   */
  identifyIssues(metrics) {
    const issues = [];

    // High cost per lead
    if (metrics.costPerLead > this.thresholds.costPerLead.critical) {
      issues.push({
        type: 'high_cpl',
        severity: 'critical',
        message: `Cost per lead (£${metrics.costPerLead}) exceeds critical threshold (£${this.thresholds.costPerLead.critical})`
      });
    } else if (metrics.costPerLead > this.thresholds.costPerLead.warning) {
      issues.push({
        type: 'high_cpl',
        severity: 'warning',
        message: `Cost per lead (£${metrics.costPerLead}) exceeds warning threshold (£${this.thresholds.costPerLead.warning})`
      });
    }

    // High spend with no leads
    if (metrics.spend > this.thresholds.dailySpend.warning && metrics.leads === 0) {
      issues.push({
        type: 'no_leads',
        severity: 'critical',
        message: `High spend (£${metrics.spend}) with no leads generated`
      });
    }

    // Low CTR
    if (metrics.ctr < this.thresholds.ctr.critical) {
      issues.push({
        type: 'low_ctr',
        severity: 'critical',
        message: `CTR (${metrics.ctr.toFixed(2)}%) below critical threshold (${this.thresholds.ctr.critical}%)`
      });
    } else if (metrics.ctr < this.thresholds.ctr.warning) {
      issues.push({
        type: 'low_ctr',
        severity: 'warning',
        message: `CTR (${metrics.ctr.toFixed(2)}%) below warning threshold (${this.thresholds.ctr.warning}%)`
      });
    }

    return issues;
  }

  /**
   * Calculate overall severity of campaign issues
   * @param {Array} issues - Array of issues
   * @returns {String} Overall severity level
   */
  calculateSeverity(issues) {
    if (issues.some(issue => issue.severity === 'critical')) {
      return 'critical';
    }
    if (issues.some(issue => issue.severity === 'warning')) {
      return 'warning';
    }
    return 'good';
  }

  /**
   * Aggregate account-level metrics from campaigns
   * @param {Array} campaigns - Processed campaigns
   * @returns {Object} Account-level aggregated metrics
   */
  aggregateAccountMetrics(campaigns) {
    const totalSpend = campaigns.reduce((sum, campaign) => sum + campaign.spend, 0);
    const totalLeads = campaigns.reduce((sum, campaign) => sum + campaign.leads, 0);
    const totalImpressions = campaigns.reduce((sum, campaign) => sum + campaign.impressions, 0);
    const totalClicks = campaigns.reduce((sum, campaign) => sum + campaign.clicks, 0);

    const averageCPL = totalLeads > 0 ? totalSpend / totalLeads : 0;
    const averageCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

    const criticalCampaigns = campaigns.filter(c => c.severity === 'critical');
    const warningCampaigns = campaigns.filter(c => c.severity === 'warning');

    return {
      totalSpend,
      totalLeads,
      totalImpressions,
      totalClicks,
      averageCPL,
      averageCTR,
      campaignCount: campaigns.length,
      criticalCampaigns: criticalCampaigns.length,
      warningCampaigns: warningCampaigns.length,
      healthScore: this.calculateHealthScore(campaigns)
    };
  }

  /**
   * Calculate account health score (0-100)
   * @param {Array} campaigns - Processed campaigns
   * @returns {Number} Health score
   */
  calculateHealthScore(campaigns) {
    if (campaigns.length === 0) return 0;

    const criticalCount = campaigns.filter(c => c.severity === 'critical').length;
    const warningCount = campaigns.filter(c => c.severity === 'warning').length;
    const goodCount = campaigns.filter(c => c.severity === 'good').length;

    // Weighted score: good campaigns = 100, warning = 60, critical = 20
    const totalScore = (goodCount * 100) + (warningCount * 60) + (criticalCount * 20);
    return Math.round(totalScore / campaigns.length);
  }

  /**
   * Compare performance across time periods
   * @param {Object} current - Current period data
   * @param {Object} previous - Previous period data
   * @returns {Object} Trend analysis
   */
  analyzeTrends(current, previous) {
    const trends = {};

    // Calculate percentage changes
    const metrics = ['totalSpend', 'totalLeads', 'averageCPL', 'averageCTR'];
    
    metrics.forEach(metric => {
      const currentValue = current[metric] || 0;
      const previousValue = previous[metric] || 0;
      
      if (previousValue === 0) {
        trends[metric] = { change: 0, direction: 'stable' };
      } else {
        const change = ((currentValue - previousValue) / previousValue) * 100;
        trends[metric] = {
          change: Math.round(change * 100) / 100,
          direction: change > 5 ? 'up' : change < -5 ? 'down' : 'stable'
        };
      }
    });

    return trends;
  }

  /**
   * Identify poor performing campaigns
   * @param {Array} campaigns - Processed campaigns
   * @param {Object} accountMetrics - Account-level metrics for comparison
   * @returns {Array} Poor performing campaigns
   */
  identifyPoorPerformers(campaigns, accountMetrics) {
    const poorPerformers = [];

    campaigns.forEach(campaign => {
      const reasons = [];

      // CPL significantly above account average
      if (campaign.costPerLead > accountMetrics.averageCPL * 1.5) {
        reasons.push(`CPL (£${campaign.costPerLead}) is ${Math.round((campaign.costPerLead / accountMetrics.averageCPL) * 100)}% of account average`);
      }

      // No leads with significant spend
      if (campaign.leads === 0 && campaign.spend > 50) {
        reasons.push(`£${campaign.spend} spent with no leads generated`);
      }

      // CTR significantly below account average
      if (campaign.ctr < accountMetrics.averageCTR * 0.5) {
        reasons.push(`CTR (${campaign.ctr.toFixed(2)}%) is significantly below account average (${accountMetrics.averageCTR.toFixed(2)}%)`);
      }

      if (reasons.length > 0) {
        poorPerformers.push({
          ...campaign,
          reasons
        });
      }
    });

    return poorPerformers.sort((a, b) => b.spend - a.spend); // Sort by spend descending
  }

  /**
   * Generate executive summary for reporting
   * @param {Array} accounts - Array of account data
   * @returns {Object} Executive summary
   */
  generateExecutiveSummary(accounts) {
    const totalAccounts = accounts.length;
    const totalSpend = accounts.reduce((sum, acc) => sum + acc.metrics.totalSpend, 0);
    const totalLeads = accounts.reduce((sum, acc) => sum + acc.metrics.totalLeads, 0);
    const averageCPL = totalLeads > 0 ? totalSpend / totalLeads : 0;

    const criticalAccounts = accounts.filter(acc => acc.campaigns.some(c => c.severity === 'critical'));
    const warningAccounts = accounts.filter(acc => acc.campaigns.some(c => c.severity === 'warning'));

    return {
      totalAccounts,
      totalSpend,
      totalLeads,
      averageCPL,
      criticalAccounts: criticalAccounts.length,
      warningAccounts: warningAccounts.length,
      healthyAccounts: totalAccounts - criticalAccounts.length - warningAccounts.length,
      overallHealth: this.calculateOverallHealth(accounts)
    };
  }

  /**
   * Calculate overall health across all accounts
   * @param {Array} accounts - Array of account data
   * @returns {String} Overall health status
   */
  calculateOverallHealth(accounts) {
    const healthScores = accounts.map(acc => acc.metrics.healthScore);
    const averageHealth = healthScores.reduce((sum, score) => sum + score, 0) / healthScores.length;

    if (averageHealth >= 80) return 'excellent';
    if (averageHealth >= 60) return 'good';
    if (averageHealth >= 40) return 'warning';
    return 'critical';
  }
}

module.exports = MetaDataProcessor;