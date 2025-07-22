/**
 * Report Formatting Utilities
 * Handles email and notification formatting for daily reports and alerts
 */

class ReportFormatter {
  constructor() {
    this.brandColors = {
      primary: '#1877F2',
      success: '#28a745',
      warning: '#ffc107',
      danger: '#dc3545',
      info: '#17a2b8'
    };
  }

  /**
   * Format daily performance report for email
   * @param {Object} data - Analysis data with accounts, summary, and AI insights
   * @returns {Object} Formatted email content
   */
  formatDailyReport(data) {
    const { accounts, summary, aiAnalysis } = data;
    
    return {
      subject: `📊 Daily Meta Ads Report - ${new Date().toLocaleDateString('en-GB')} | ${summary.totalLeads} Leads, £${summary.averageCPL.toFixed(2)} CPL`,
      html: this.generateHTMLReport(data),
      text: this.generateTextReport(data)
    };
  }

  /**
   * Format alert notification for email and Telegram
   * @param {Object} alertData - Alert data with critical issues
   * @returns {Object} Formatted alert content
   */
  formatAlert(alertData) {
    const { criticalCampaigns, accountName, crisisAnalysis } = alertData;
    const severity = this.getAlertSeverity(criticalCampaigns);
    
    return {
      email: {
        subject: `🚨 ${severity.toUpperCase()} Alert: Meta Ads Issues - ${accountName}`,
        html: this.generateHTMLAlert(alertData),
        text: this.generateTextAlert(alertData)
      },
      telegram: this.generateTelegramAlert(alertData)
    };
  }

  /**
   * Generate HTML report for email
   * @param {Object} data - Report data
   * @returns {String} HTML content
   */
  generateHTMLReport(data) {
    const { accounts, summary, aiAnalysis } = data;
    
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Daily Meta Ads Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
    .container { max-width: 800px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, ${this.brandColors.primary}, #4267B2); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .header p { margin: 10px 0 0; opacity: 0.9; }
    .summary { padding: 20px; background-color: #f8f9fa; border-bottom: 1px solid #e9ecef; }
    .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
    .metric-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center; }
    .metric-value { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
    .metric-label { color: #666; font-size: 14px; }
    .health-score { color: ${this.getHealthColor(summary.overallHealth)}; }
    .section { padding: 20px; border-bottom: 1px solid #e9ecef; }
    .section h2 { margin-top: 0; color: #333; }
    .account-card { background: #f8f9fa; border-radius: 8px; padding: 15px; margin: 10px 0; }
    .account-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
    .account-name { font-weight: bold; font-size: 16px; }
    .health-badge { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
    .campaign-list { margin: 10px 0; }
    .campaign-item { background: white; padding: 10px; margin: 5px 0; border-radius: 4px; border-left: 4px solid ${this.brandColors.info}; }
    .campaign-critical { border-left-color: ${this.brandColors.danger}; }
    .campaign-warning { border-left-color: ${this.brandColors.warning}; }
    .ai-section { background: #f0f8ff; padding: 20px; }
    .ai-recommendations { list-style: none; padding: 0; }
    .ai-recommendations li { background: white; padding: 10px; margin: 5px 0; border-radius: 4px; border-left: 4px solid ${this.brandColors.info}; }
    .priority-high { border-left-color: ${this.brandColors.danger}; }
    .priority-medium { border-left-color: ${this.brandColors.warning}; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1>📊 Daily Meta Ads Report</h1>
      <p>${new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
    </div>

    <!-- Executive Summary -->
    <div class="summary">
      <h2>Executive Summary</h2>
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-value">£${summary.totalSpend.toFixed(2)}</div>
          <div class="metric-label">Total Spend</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${summary.totalLeads}</div>
          <div class="metric-label">Total Leads</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">£${summary.averageCPL.toFixed(2)}</div>
          <div class="metric-label">Average CPL</div>
        </div>
        <div class="metric-card">
          <div class="metric-value health-score">${summary.overallHealth}</div>
          <div class="metric-label">Overall Health</div>
        </div>
      </div>
      <p><strong>Accounts:</strong> ${summary.totalAccounts} total | ${summary.criticalAccounts} critical | ${summary.warningAccounts} warning | ${summary.healthyAccounts} healthy</p>
    </div>

    <!-- Account Details -->
    <div class="section">
      <h2>Account Performance</h2>
      ${accounts.map(account => this.generateAccountHTML(account)).join('')}
    </div>

    <!-- AI Analysis -->
    <div class="ai-section">
      <h2>🤖 AI Analysis & Recommendations</h2>
      <div style="margin-bottom: 20px;">
        <h3>Priority Actions</h3>
        <ul class="ai-recommendations">
          ${aiAnalysis.priorityActions.map(action => `<li class="priority-high">${action}</li>`).join('')}
        </ul>
      </div>
      <div style="margin-bottom: 20px;">
        <h3>Optimization Recommendations</h3>
        <ul class="ai-recommendations">
          ${aiAnalysis.recommendations.slice(0, 5).map(rec => `<li>${rec}</li>`).join('')}
        </ul>
      </div>
      <div>
        <h3>Budget Suggestions</h3>
        <ul class="ai-recommendations">
          ${aiAnalysis.budgetSuggestions.map(suggestion => `<li class="priority-medium">${suggestion}</li>`).join('')}
        </ul>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p>🤖 Generated with AI Meta Ads Automation System | ${new Date().toLocaleString('en-GB')}</p>
    </div>
  </div>
</body>
</html>`;
  }

  /**
   * Generate account HTML section
   * @param {Object} account - Account data
   * @returns {String} HTML for account section
   */
  generateAccountHTML(account) {
    const healthBadge = this.getHealthBadge(account.metrics.healthScore);
    const poorPerformers = account.campaigns.filter(c => c.severity === 'critical' || c.severity === 'warning');
    
    return `
      <div class="account-card">
        <div class="account-header">
          <div class="account-name">${account.name}</div>
          <div class="health-badge" style="background-color: ${healthBadge.color}; color: white;">${healthBadge.text}</div>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; margin: 10px 0;">
          <div><strong>Spend:</strong> £${account.metrics.totalSpend.toFixed(2)}</div>
          <div><strong>Leads:</strong> ${account.metrics.totalLeads}</div>
          <div><strong>CPL:</strong> £${account.metrics.averageCPL.toFixed(2)}</div>
          <div><strong>CTR:</strong> ${account.metrics.averageCTR.toFixed(2)}%</div>
        </div>
        ${poorPerformers.length > 0 ? `
          <div class="campaign-list">
            <strong>Issues requiring attention:</strong>
            ${poorPerformers.map(campaign => `
              <div class="campaign-item campaign-${campaign.severity}">
                <strong>${campaign.campaignName}</strong> - £${campaign.costPerLead} CPL, ${campaign.leads} leads, ${campaign.ctr.toFixed(2)}% CTR
                <br><small>${campaign.issues.map(i => i.message).join(', ')}</small>
              </div>
            `).join('')}
          </div>
        ` : '<div style="color: #28a745;">✅ All campaigns performing well</div>'}
      </div>
    `;
  }

  /**
   * Generate text version of the report
   * @param {Object} data - Report data
   * @returns {String} Text content
   */
  generateTextReport(data) {
    const { accounts, summary, aiAnalysis } = data;
    
    return `
DAILY META ADS REPORT - ${new Date().toLocaleDateString('en-GB')}

EXECUTIVE SUMMARY
=================
Total Spend: £${summary.totalSpend.toFixed(2)}
Total Leads: ${summary.totalLeads}
Average CPL: £${summary.averageCPL.toFixed(2)}
Overall Health: ${summary.overallHealth}

Accounts: ${summary.totalAccounts} total | ${summary.criticalAccounts} critical | ${summary.warningAccounts} warning | ${summary.healthyAccounts} healthy

ACCOUNT PERFORMANCE
==================
${accounts.map(account => this.generateAccountText(account)).join('\n\n')}

AI ANALYSIS & RECOMMENDATIONS
============================
Priority Actions:
${aiAnalysis.priorityActions.map(action => `• ${action}`).join('\n')}

Key Recommendations:
${aiAnalysis.recommendations.slice(0, 5).map(rec => `• ${rec}`).join('\n')}

Budget Suggestions:
${aiAnalysis.budgetSuggestions.map(suggestion => `• ${suggestion}`).join('\n')}

Generated: ${new Date().toLocaleString('en-GB')}
`;
  }

  /**
   * Generate account text section
   * @param {Object} account - Account data
   * @returns {String} Text for account
   */
  generateAccountText(account) {
    const poorPerformers = account.campaigns.filter(c => c.severity === 'critical' || c.severity === 'warning');
    
    return `
${account.name} (Health: ${account.metrics.healthScore}/100)
- Spend: £${account.metrics.totalSpend.toFixed(2)} | Leads: ${account.metrics.totalLeads} | CPL: £${account.metrics.averageCPL.toFixed(2)} | CTR: ${account.metrics.averageCTR.toFixed(2)}%

${poorPerformers.length > 0 ? 
  `Issues:\n${poorPerformers.map(c => `  • ${c.campaignName}: £${c.costPerLead} CPL, ${c.leads} leads, ${c.ctr.toFixed(2)}% CTR`).join('\n')}` : 
  '✅ All campaigns performing well'
}`;
  }

  /**
   * Generate HTML alert
   * @param {Object} alertData - Alert data
   * @returns {String} HTML alert content
   */
  generateHTMLAlert(alertData) {
    const { criticalCampaigns, accountName, crisisAnalysis } = alertData;
    const severity = this.getAlertSeverity(criticalCampaigns);
    
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Meta Ads Alert</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header { background: ${severity === 'critical' ? this.brandColors.danger : this.brandColors.warning}; color: white; padding: 20px; text-align: center; }
    .header h1 { margin: 0; font-size: 20px; }
    .section { padding: 20px; border-bottom: 1px solid #e9ecef; }
    .campaign-item { background: #f8f9fa; padding: 15px; margin: 10px 0; border-radius: 4px; border-left: 4px solid ${this.brandColors.danger}; }
    .action-item { background: #fff3cd; padding: 10px; margin: 5px 0; border-radius: 4px; border-left: 4px solid ${this.brandColors.warning}; }
    .emergency-action { background: #f8d7da; border-left-color: ${this.brandColors.danger}; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚨 ${severity.toUpperCase()} ALERT</h1>
      <p>${accountName} - ${new Date().toLocaleString('en-GB')}</p>
    </div>

    <div class="section">
      <h2>Critical Issues</h2>
      ${criticalCampaigns.map(campaign => `
        <div class="campaign-item">
          <strong>${campaign.campaignName}</strong><br>
          Spend: £${campaign.spend} | Leads: ${campaign.leads} | CPL: £${campaign.costPerLead} | CTR: ${campaign.ctr.toFixed(2)}%<br>
          <small style="color: #dc3545;">${campaign.issues.map(i => i.message).join(', ')}</small>
        </div>
      `).join('')}
    </div>

    <div class="section">
      <h2>🚨 Emergency Actions</h2>
      ${crisisAnalysis.emergencyActions.map(action => `
        <div class="action-item emergency-action">${action}</div>
      `).join('')}
    </div>

    <div class="section">
      <h2>⚡ Quick Wins</h2>
      ${crisisAnalysis.quickWins.map(win => `
        <div class="action-item">${win}</div>
      `).join('')}
    </div>
  </div>
</body>
</html>`;
  }

  /**
   * Generate text alert
   * @param {Object} alertData - Alert data
   * @returns {String} Text alert content
   */
  generateTextAlert(alertData) {
    const { criticalCampaigns, accountName, crisisAnalysis } = alertData;
    const severity = this.getAlertSeverity(criticalCampaigns);
    
    return `
🚨 ${severity.toUpperCase()} ALERT - ${accountName}
${new Date().toLocaleString('en-GB')}

CRITICAL ISSUES:
${criticalCampaigns.map(campaign => `
• ${campaign.campaignName}
  Spend: £${campaign.spend} | Leads: ${campaign.leads} | CPL: £${campaign.costPerLead} | CTR: ${campaign.ctr.toFixed(2)}%
  Issues: ${campaign.issues.map(i => i.message).join(', ')}
`).join('')}

EMERGENCY ACTIONS:
${crisisAnalysis.emergencyActions.map(action => `• ${action}`).join('\n')}

QUICK WINS:
${crisisAnalysis.quickWins.map(win => `• ${win}`).join('\n')}

ROOT CAUSE:
${crisisAnalysis.rootCause}

NEXT STEPS:
${crisisAnalysis.nextSteps.map(step => `• ${step}`).join('\n')}
`;
  }

  /**
   * Generate Telegram alert message
   * @param {Object} alertData - Alert data
   * @returns {String} Telegram message
   */
  generateTelegramAlert(alertData) {
    const { criticalCampaigns, accountName, crisisAnalysis } = alertData;
    const severity = this.getAlertSeverity(criticalCampaigns);
    
    const emoji = severity === 'critical' ? '🚨' : '⚠️';
    
    return `
${emoji} *${severity.toUpperCase()} ALERT* - ${accountName}

*Critical Issues:*
${criticalCampaigns.map(campaign => `
• ${campaign.campaignName}
  £${campaign.spend} spend | ${campaign.leads} leads | £${campaign.costPerLead} CPL
`).join('')}

*Emergency Actions:*
${crisisAnalysis.emergencyActions.slice(0, 3).map(action => `• ${action}`).join('\n')}

*Quick Wins:*
${crisisAnalysis.quickWins.slice(0, 2).map(win => `• ${win}`).join('\n')}

_Generated: ${new Date().toLocaleString('en-GB')}_
`.trim();
  }

  /**
   * Get alert severity based on campaigns
   * @param {Array} campaigns - Critical campaigns
   * @returns {String} Severity level
   */
  getAlertSeverity(campaigns) {
    const hasCritical = campaigns.some(c => c.severity === 'critical');
    return hasCritical ? 'critical' : 'warning';
  }

  /**
   * Get health color based on health status
   * @param {String} health - Health status
   * @returns {String} Color code
   */
  getHealthColor(health) {
    switch (health) {
      case 'excellent': return this.brandColors.success;
      case 'good': return this.brandColors.info;
      case 'warning': return this.brandColors.warning;
      case 'critical': return this.brandColors.danger;
      default: return this.brandColors.info;
    }
  }

  /**
   * Get health badge configuration
   * @param {Number} score - Health score
   * @returns {Object} Badge configuration
   */
  getHealthBadge(score) {
    if (score >= 80) return { text: 'Excellent', color: this.brandColors.success };
    if (score >= 60) return { text: 'Good', color: this.brandColors.info };
    if (score >= 40) return { text: 'Warning', color: this.brandColors.warning };
    return { text: 'Critical', color: this.brandColors.danger };
  }

  /**
   * Format performance metrics for display
   * @param {Number} value - Metric value
   * @param {String} type - Metric type (currency, percentage, number)
   * @returns {String} Formatted value
   */
  formatMetric(value, type) {
    switch (type) {
      case 'currency':
        return `£${value.toFixed(2)}`;
      case 'percentage':
        return `${value.toFixed(2)}%`;
      case 'number':
        return value.toLocaleString();
      default:
        return value.toString();
    }
  }
}

module.exports = ReportFormatter;