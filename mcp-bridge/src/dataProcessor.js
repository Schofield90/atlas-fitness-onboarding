/**
 * Meta Ads Data Processing
 * Processes raw Meta Ads data and calculates performance metrics
 */

const _ = require('lodash');
const config = require('./config');
const { logger, performanceLogger } = require('./utils/logger');

class DataProcessor {
  constructor() {
    this.thresholds = config.metaAds.thresholds;
  }

  /**
   * Process raw ad accounts data
   */
  processAdAccounts(rawData) {
    const startTime = performanceLogger.start('processAdAccounts', 'processor');
    
    try {
      if (!rawData || !rawData.data) {
        throw new Error('Invalid ad accounts data structure');
      }

      const accounts = rawData.data.map(account => ({
        id: account.id,
        name: account.name,
        account_status: account.account_status,
        currency: account.currency,
        amount_spent: parseFloat(account.amount_spent || 0),
        business_city: account.business_city,
        business_country_code: account.business_country_code,
        created_time: account.created_time,
        timezone_name: account.timezone_name,
        account_type: account.account_type || 'REGULAR'
      }));

      performanceLogger.end('processAdAccounts', startTime, 'processor', {
        accountCount: accounts.length
      });

      return {
        success: true,
        accounts: accounts,
        count: accounts.length
      };

    } catch (error) {
      performanceLogger.end('processAdAccounts', startTime, 'processor', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Process campaign insights data
   */
  processCampaignInsights(rawData, timeRange, accountId) {
    const startTime = performanceLogger.start('processCampaignInsights', 'processor');
    
    try {
      if (!rawData || !rawData.data) {
        throw new Error('Invalid campaign insights data structure');
      }

      const campaigns = rawData.data.map(campaign => {
        const processed = this.extractCampaignMetrics(campaign);
        const issues = this.identifyIssues(processed);
        
        return {
          ...processed,
          issues,
          severity: this.calculateSeverity(issues),
          account_id: accountId,
          time_range: timeRange
        };
      });

      // Calculate account-level metrics
      const accountMetrics = this.calculateAccountMetrics(campaigns);

      performanceLogger.end('processCampaignInsights', startTime, 'processor', {
        accountId,
        timeRange,
        campaignCount: campaigns.length,
        criticalCount: campaigns.filter(c => c.severity === 'critical').length
      });

      return {
        success: true,
        campaigns: campaigns,
        account_metrics: accountMetrics,
        time_range: timeRange,
        account_id: accountId,
        summary: {
          total_campaigns: campaigns.length,
          critical_campaigns: campaigns.filter(c => c.severity === 'critical').length,
          warning_campaigns: campaigns.filter(c => c.severity === 'warning').length,
          healthy_campaigns: campaigns.filter(c => c.severity === 'good').length
        }
      };

    } catch (error) {
      performanceLogger.end('processCampaignInsights', startTime, 'processor', {
        accountId,
        timeRange,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Extract metrics from individual campaign data
   */
  extractCampaignMetrics(campaign) {
    // Extract lead actions
    const leadActions = campaign.actions?.find(action => action.action_type === 'lead');
    const leadCosts = campaign.cost_per_action_type?.find(action => action.action_type === 'lead');
    
    // Basic metrics
    const spend = parseFloat(campaign.spend || 0);
    const impressions = parseInt(campaign.impressions || 0);
    const clicks = parseInt(campaign.clicks || 0);
    const leads = leadActions ? parseInt(leadActions.value) : 0;
    const costPerLead = leadCosts ? parseFloat(leadCosts.value) : (leads > 0 ? spend / leads : 0);
    
    // Calculated metrics
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    const cpc = clicks > 0 ? spend / clicks : 0;
    const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;
    
    // Conversion metrics
    const conversionRate = clicks > 0 ? (leads / clicks) * 100 : 0;
    const leadRate = impressions > 0 ? (leads / impressions) * 100 : 0;

    return {
      campaign_id: campaign.campaign_id,
      campaign_name: campaign.campaign_name,
      spend,
      impressions,
      clicks,
      leads,
      costPerLead,
      ctr,
      cpc,
      cpm,
      conversionRate,
      leadRate,
      date_start: campaign.date_start,
      date_stop: campaign.date_stop,
      // Additional metrics
      frequency: campaign.frequency ? parseFloat(campaign.frequency) : 0,
      reach: campaign.reach ? parseInt(campaign.reach) : 0,
      objective: campaign.objective,
      status: campaign.status || 'UNKNOWN'
    };
  }

  /**
   * Identify performance issues
   */
  identifyIssues(metrics) {
    const issues = [];
    const { costPerLead, spend, ctr, leads, impressions } = metrics;

    // High cost per lead
    if (costPerLead > this.thresholds.costPerLead.critical) {
      issues.push({
        type: 'high_cpl',
        severity: 'critical',
        message: `Cost per lead (£${costPerLead.toFixed(2)}) exceeds critical threshold (£${this.thresholds.costPerLead.critical})`,
        value: costPerLead,
        threshold: this.thresholds.costPerLead.critical
      });
    } else if (costPerLead > this.thresholds.costPerLead.warning) {
      issues.push({
        type: 'high_cpl',
        severity: 'warning',
        message: `Cost per lead (£${costPerLead.toFixed(2)}) exceeds warning threshold (£${this.thresholds.costPerLead.warning})`,
        value: costPerLead,
        threshold: this.thresholds.costPerLead.warning
      });
    }

    // High spend with no leads
    if (spend > this.thresholds.spend.warning && leads === 0) {
      issues.push({
        type: 'no_leads',
        severity: 'critical',
        message: `High spend (£${spend.toFixed(2)}) with no leads generated`,
        value: spend,
        threshold: this.thresholds.spend.warning
      });
    }

    // Low CTR
    if (impressions > 100) { // Only check CTR if we have meaningful impressions
      if (ctr < this.thresholds.ctr.critical) {
        issues.push({
          type: 'low_ctr',
          severity: 'critical',
          message: `CTR (${ctr.toFixed(2)}%) below critical threshold (${this.thresholds.ctr.critical}%)`,
          value: ctr,
          threshold: this.thresholds.ctr.critical
        });
      } else if (ctr < this.thresholds.ctr.warning) {
        issues.push({
          type: 'low_ctr',
          severity: 'warning',
          message: `CTR (${ctr.toFixed(2)}%) below warning threshold (${this.thresholds.ctr.warning}%)`,
          value: ctr,
          threshold: this.thresholds.ctr.warning
        });
      }
    }

    // High frequency (ad fatigue)
    if (metrics.frequency > 3) {
      issues.push({
        type: 'high_frequency',
        severity: 'warning',
        message: `High frequency (${metrics.frequency.toFixed(1)}) indicates potential ad fatigue`,
        value: metrics.frequency,
        threshold: 3
      });
    }

    // Low conversion rate
    if (metrics.clicks > 50 && metrics.conversionRate < 2) {
      issues.push({
        type: 'low_conversion',
        severity: 'warning',
        message: `Low conversion rate (${metrics.conversionRate.toFixed(2)}%) from clicks to leads`,
        value: metrics.conversionRate,
        threshold: 2
      });
    }

    return issues;
  }

  /**
   * Calculate campaign severity
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
   * Calculate account-level metrics
   */
  calculateAccountMetrics(campaigns) {
    if (!campaigns || campaigns.length === 0) {
      return {
        totalSpend: 0,
        totalLeads: 0,
        totalImpressions: 0,
        totalClicks: 0,
        averageCPL: 0,
        averageCTR: 0,
        averageCPC: 0,
        averageCPM: 0,
        campaignCount: 0,
        healthScore: 0
      };
    }

    const totalSpend = _.sumBy(campaigns, 'spend');
    const totalLeads = _.sumBy(campaigns, 'leads');
    const totalImpressions = _.sumBy(campaigns, 'impressions');
    const totalClicks = _.sumBy(campaigns, 'clicks');

    const averageCPL = totalLeads > 0 ? totalSpend / totalLeads : 0;
    const averageCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const averageCPC = totalClicks > 0 ? totalSpend / totalClicks : 0;
    const averageCPM = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;

    // Calculate health score
    const criticalCount = campaigns.filter(c => c.severity === 'critical').length;
    const warningCount = campaigns.filter(c => c.severity === 'warning').length;
    const goodCount = campaigns.filter(c => c.severity === 'good').length;

    const healthScore = campaigns.length > 0 ? 
      Math.round(((goodCount * 100) + (warningCount * 60) + (criticalCount * 20)) / campaigns.length) : 0;

    return {
      totalSpend,
      totalLeads,
      totalImpressions,
      totalClicks,
      averageCPL,
      averageCTR,
      averageCPC,
      averageCPM,
      campaignCount: campaigns.length,
      criticalCampaigns: criticalCount,
      warningCampaigns: warningCount,
      goodCampaigns: goodCount,
      healthScore,
      // Additional metrics
      conversionRate: totalClicks > 0 ? (totalLeads / totalClicks) * 100 : 0,
      leadRate: totalImpressions > 0 ? (totalLeads / totalImpressions) * 100 : 0,
      averageFrequency: campaigns.length > 0 ? _.meanBy(campaigns, 'frequency') : 0
    };
  }

  /**
   * Process multiple time ranges for trend analysis
   */
  processMultipleTimeRanges(insightsData) {
    const startTime = performanceLogger.start('processMultipleTimeRanges', 'processor');
    
    try {
      const processedData = {};
      
      Object.keys(insightsData).forEach(timeRange => {
        const rawData = insightsData[timeRange];
        processedData[timeRange] = this.processCampaignInsights(
          rawData, 
          timeRange, 
          rawData.account_id
        );
      });

      // Calculate trends if we have multiple time ranges
      const trends = this.calculateTrends(processedData);

      performanceLogger.end('processMultipleTimeRanges', startTime, 'processor', {
        timeRanges: Object.keys(insightsData).length,
        trendsCalculated: trends ? true : false
      });

      return {
        success: true,
        insights: processedData,
        trends,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      performanceLogger.end('processMultipleTimeRanges', startTime, 'processor', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Calculate trends between time periods
   */
  calculateTrends(processedData) {
    const timeRanges = Object.keys(processedData);
    if (timeRanges.length < 2) return null;

    const trends = {};
    const metrics = ['totalSpend', 'totalLeads', 'averageCPL', 'averageCTR'];

    // Compare each metric across time periods
    metrics.forEach(metric => {
      const values = timeRanges.map(range => 
        processedData[range].account_metrics[metric] || 0
      );

      // Calculate percentage change between periods
      const changes = [];
      for (let i = 1; i < values.length; i++) {
        const current = values[i];
        const previous = values[i - 1];
        
        if (previous === 0) {
          changes.push(current > 0 ? 100 : 0);
        } else {
          changes.push(((current - previous) / previous) * 100);
        }
      }

      trends[metric] = {
        values,
        changes,
        direction: this.getTrendDirection(changes),
        severity: this.getTrendSeverity(changes, metric)
      };
    });

    return trends;
  }

  /**
   * Determine trend direction
   */
  getTrendDirection(changes) {
    if (changes.length === 0) return 'stable';
    
    const averageChange = _.mean(changes);
    if (averageChange > 5) return 'increasing';
    if (averageChange < -5) return 'decreasing';
    return 'stable';
  }

  /**
   * Determine trend severity
   */
  getTrendSeverity(changes, metric) {
    if (changes.length === 0) return 'neutral';
    
    const averageChange = Math.abs(_.mean(changes));
    
    // Different thresholds for different metrics
    const thresholds = {
      totalSpend: { warning: 20, critical: 50 },
      totalLeads: { warning: 15, critical: 30 },
      averageCPL: { warning: 15, critical: 25 },
      averageCTR: { warning: 10, critical: 20 }
    };

    const threshold = thresholds[metric] || { warning: 15, critical: 30 };
    
    if (averageChange > threshold.critical) return 'critical';
    if (averageChange > threshold.warning) return 'warning';
    return 'neutral';
  }

  /**
   * Aggregate data across multiple accounts
   */
  aggregateMultipleAccounts(accountsData) {
    const startTime = performanceLogger.start('aggregateMultipleAccounts', 'processor');
    
    try {
      const aggregated = {
        totalAccounts: accountsData.length,
        totalSpend: 0,
        totalLeads: 0,
        totalImpressions: 0,
        totalClicks: 0,
        totalCampaigns: 0,
        criticalAccounts: 0,
        warningAccounts: 0,
        healthyAccounts: 0,
        accounts: []
      };

      accountsData.forEach(accountData => {
        const metrics = accountData.account_metrics;
        
        aggregated.totalSpend += metrics.totalSpend;
        aggregated.totalLeads += metrics.totalLeads;
        aggregated.totalImpressions += metrics.totalImpressions;
        aggregated.totalClicks += metrics.totalClicks;
        aggregated.totalCampaigns += metrics.campaignCount;

        // Count account health
        if (metrics.criticalCampaigns > 0) {
          aggregated.criticalAccounts++;
        } else if (metrics.warningCampaigns > 0) {
          aggregated.warningAccounts++;
        } else {
          aggregated.healthyAccounts++;
        }

        aggregated.accounts.push({
          account_id: accountData.account_id,
          name: accountData.name || `Account ${accountData.account_id}`,
          metrics: metrics,
          campaigns: accountData.campaigns,
          health: metrics.healthScore >= 80 ? 'excellent' : 
                  metrics.healthScore >= 60 ? 'good' :
                  metrics.healthScore >= 40 ? 'warning' : 'critical'
        });
      });

      // Calculate overall metrics
      aggregated.averageCPL = aggregated.totalLeads > 0 ? 
        aggregated.totalSpend / aggregated.totalLeads : 0;
      aggregated.averageCTR = aggregated.totalImpressions > 0 ? 
        (aggregated.totalClicks / aggregated.totalImpressions) * 100 : 0;
      aggregated.overallHealth = this.calculateOverallHealth(aggregated.accounts);

      performanceLogger.end('aggregateMultipleAccounts', startTime, 'processor', {
        accountCount: accountsData.length,
        totalCampaigns: aggregated.totalCampaigns,
        overallHealth: aggregated.overallHealth
      });

      return aggregated;

    } catch (error) {
      performanceLogger.end('aggregateMultipleAccounts', startTime, 'processor', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Calculate overall health across all accounts
   */
  calculateOverallHealth(accounts) {
    if (accounts.length === 0) return 'unknown';
    
    const healthScores = accounts.map(acc => acc.metrics.healthScore);
    const averageHealth = _.mean(healthScores);
    
    if (averageHealth >= 80) return 'excellent';
    if (averageHealth >= 60) return 'good';
    if (averageHealth >= 40) return 'warning';
    return 'critical';
  }
}

module.exports = DataProcessor;