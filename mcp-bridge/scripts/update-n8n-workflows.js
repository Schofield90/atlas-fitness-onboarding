#!/usr/bin/env node

/**
 * Update n8n workflows to use MCP Bridge
 * Generates updated workflow files with HTTP Request nodes
 */

const fs = require('fs');
const path = require('path');

const BRIDGE_URL = 'http://localhost:3000/mcp';
const WORKFLOWS_DIR = '/Users/samschofield/ai-meta-ads-automation/workflows';

// HTTP Request node template
const createHTTPRequestNode = (nodeId, name, action, parameters = {}) => ({
  parameters: {
    url: BRIDGE_URL,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Request-ID': '={{$node.uuid()}}'
    },
    body: {
      action,
      request_id: '={{$node.uuid()}}',
      ...parameters
    },
    options: {
      timeout: 30000,
      redirect: {
        follow: true,
        maxRedirects: 3
      }
    }
  },
  name,
  type: 'n8n-nodes-base.httpRequest',
  typeVersion: 1,
  position: [900, 300],
  id: nodeId
});

// Function node to process MCP Bridge responses
const createProcessResponseNode = (nodeId, name, processingCode) => ({
  parameters: {
    functionCode: processingCode
  },
  name,
  type: 'n8n-nodes-base.function',
  typeVersion: 1,
  position: [1120, 300],
  id: nodeId
});

function updateDailyAnalysisWorkflow() {
  console.log('📝 Updating daily analysis workflow...');
  
  const workflowPath = path.join(WORKFLOWS_DIR, 'daily-analysis.json');
  
  if (!fs.existsSync(workflowPath)) {
    console.log('❌ Daily analysis workflow not found');
    return;
  }
  
  const workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));
  
  // Update nodes to use HTTP requests
  const updatedNodes = workflow.nodes.map(node => {
    switch (node.name) {
      case 'Get All Ad Accounts':
        return createHTTPRequestNode(
          node.id || 'get-accounts',
          'Get All Ad Accounts (HTTP)',
          'get_all_ad_accounts',
          { limit: 25 }
        );
        
      case 'Get Yesterday Insights':
        return createHTTPRequestNode(
          node.id || 'get-yesterday',
          'Get Yesterday Insights (HTTP)',
          'get_campaign_insights',
          {
            account_id: '={{$json.account_id}}',
            time_ranges: ['yesterday'],
            level: 'campaign'
          }
        );
        
      case 'Get Last 3 Days Insights':
        return createHTTPRequestNode(
          node.id || 'get-3days',
          'Get Last 3 Days Insights (HTTP)',
          'get_campaign_insights',
          {
            account_id: '={{$json.account_id}}',
            time_ranges: ['last_3d'],
            level: 'campaign'
          }
        );
        
      case 'Get Last 5 Days Insights':
        return createHTTPRequestNode(
          node.id || 'get-5days',
          'Get Last 5 Days Insights (HTTP)',
          'get_campaign_insights',
          {
            account_id: '={{$json.account_id}}',
            time_ranges: ['last_5d'],
            level: 'campaign'
          }
        );
        
      case 'Generate AI Analysis':
        return createHTTPRequestNode(
          node.id || 'ai-analysis',
          'Generate AI Analysis (HTTP)',
          'generate_ai_analysis',
          {
            performance_data: '={{$json.processedData}}',
            analysis_type: 'daily',
            context: {
              business_type: 'gym',
              target_market: 'uk'
            }
          }
        );
        
      case 'Process Campaign Data':
        return createProcessResponseNode(
          node.id || 'process-data',
          'Process MCP Response',
          `
// Process MCP Bridge responses
const allResponses = $input.all();
const processedData = {
  accounts: [],
  summary: {
    totalAccounts: 0,
    totalSpend: 0,
    totalLeads: 0,
    averageCPL: 0,
    criticalAccounts: 0,
    warningAccounts: 0,
    healthyAccounts: 0
  }
};

// Process each response
allResponses.forEach(response => {
  const data = response.json;
  
  if (data.success && data.insights) {
    // Process campaign insights
    Object.keys(data.insights).forEach(timeRange => {
      const insight = data.insights[timeRange];
      
      if (insight.campaigns) {
        processedData.accounts.push({
          id: data.account_id,
          name: insight.account_name || data.account_id,
          campaigns: insight.campaigns,
          metrics: insight.account_metrics,
          timeRange: timeRange
        });
      }
    });
  }
  
  if (data.success && data.accounts) {
    // Process ad accounts
    data.accounts.forEach(account => {
      processedData.summary.totalAccounts++;
    });
  }
});

// Calculate summary
if (processedData.accounts.length > 0) {
  processedData.summary.totalSpend = processedData.accounts.reduce((sum, acc) => 
    sum + (acc.metrics?.totalSpend || 0), 0);
  processedData.summary.totalLeads = processedData.accounts.reduce((sum, acc) => 
    sum + (acc.metrics?.totalLeads || 0), 0);
  processedData.summary.averageCPL = processedData.summary.totalLeads > 0 ? 
    processedData.summary.totalSpend / processedData.summary.totalLeads : 0;
}

return [{ json: { processedData } }];
          `
        );
        
      default:
        return node;
    }
  });
  
  // Update workflow
  const updatedWorkflow = {
    ...workflow,
    nodes: updatedNodes,
    name: 'Daily Meta Ads Analysis (MCP Bridge)'
  };
  
  // Save updated workflow
  const updatedPath = path.join(WORKFLOWS_DIR, 'daily-analysis-mcp-bridge.json');
  fs.writeFileSync(updatedPath, JSON.stringify(updatedWorkflow, null, 2));
  
  console.log('✅ Daily analysis workflow updated');
  console.log(`   Saved to: ${updatedPath}`);
}

function updateRealTimeAlertsWorkflow() {
  console.log('📝 Updating real-time alerts workflow...');
  
  const workflowPath = path.join(WORKFLOWS_DIR, 'real-time-alerts.json');
  
  if (!fs.existsSync(workflowPath)) {
    console.log('❌ Real-time alerts workflow not found');
    return;
  }
  
  const workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));
  
  // Update nodes to use HTTP requests
  const updatedNodes = workflow.nodes.map(node => {
    switch (node.name) {
      case 'Get All Ad Accounts':
        return createHTTPRequestNode(
          node.id || 'get-accounts-alerts',
          'Get All Ad Accounts (HTTP)',
          'get_all_ad_accounts',
          { limit: 25 }
        );
        
      case "Get Today's Insights":
        return createHTTPRequestNode(
          node.id || 'get-today',
          "Get Today's Insights (HTTP)",
          'get_campaign_insights',
          {
            account_id: '={{$json.account_id}}',
            time_ranges: ['today'],
            level: 'campaign'
          }
        );
        
      case 'Generate Crisis Analysis':
        return createHTTPRequestNode(
          node.id || 'crisis-analysis',
          'Generate Crisis Analysis (HTTP)',
          'generate_ai_analysis',
          {
            performance_data: '={{$json.criticalData}}',
            analysis_type: 'crisis',
            context: {
              business_type: 'gym',
              target_market: 'uk'
            }
          }
        );
        
      default:
        return node;
    }
  });
  
  // Update workflow
  const updatedWorkflow = {
    ...workflow,
    nodes: updatedNodes,
    name: 'Real-Time Meta Ads Alerts (MCP Bridge)'
  };
  
  // Save updated workflow
  const updatedPath = path.join(WORKFLOWS_DIR, 'real-time-alerts-mcp-bridge.json');
  fs.writeFileSync(updatedPath, JSON.stringify(updatedWorkflow, null, 2));
  
  console.log('✅ Real-time alerts workflow updated');
  console.log(`   Saved to: ${updatedPath}`);
}

function generateN8nInstructions() {
  console.log('📋 Generating n8n setup instructions...');
  
  const instructions = `
# n8n Setup Instructions for MCP Bridge

## 1. Import Updated Workflows

Import these updated workflow files into n8n:
- daily-analysis-mcp-bridge.json
- real-time-alerts-mcp-bridge.json

## 2. Configure HTTP Request Nodes

All HTTP Request nodes should be configured with:

**URL:** http://localhost:3000/mcp
**Method:** POST
**Headers:**
\`\`\`json
{
  "Content-Type": "application/json",
  "X-Request-ID": "={{$node.uuid()}}"
}
\`\`\`

## 3. Test Individual Nodes

### Get All Ad Accounts
\`\`\`json
{
  "action": "get_all_ad_accounts",
  "request_id": "={{$node.uuid()}}",
  "limit": 25
}
\`\`\`

### Get Campaign Insights
\`\`\`json
{
  "action": "get_campaign_insights",
  "request_id": "={{$node.uuid()}}",
  "account_id": "act_123456789",
  "time_ranges": ["yesterday"],
  "level": "campaign"
}
\`\`\`

### Generate AI Analysis
\`\`\`json
{
  "action": "generate_ai_analysis",
  "request_id": "={{$node.uuid()}}",
  "performance_data": {
    "accounts": [...],
    "summary": {...}
  },
  "analysis_type": "daily"
}
\`\`\`

## 4. Error Handling

Add error handling to each HTTP Request node:

**On Error:** Continue
**Error Output:** Include error details

## 5. Activate Workflows

1. Ensure MCP Bridge Service is running on port 3000
2. Test individual nodes first
3. Activate the workflows
4. Monitor the logs for any issues

## 6. Monitoring

- Check MCP Bridge logs: tail -f /Users/samschofield/mcp-bridge/logs/mcp-bridge.log
- Check n8n execution logs
- Monitor health endpoint: http://localhost:3000/health
`;
  
  const instructionsPath = path.join(WORKFLOWS_DIR, 'n8n-mcp-bridge-setup.md');
  fs.writeFileSync(instructionsPath, instructions);
  
  console.log('✅ n8n setup instructions generated');
  console.log(`   Saved to: ${instructionsPath}`);
}

function main() {
  console.log('🔧 Updating n8n workflows for MCP Bridge...\n');
  
  try {
    updateDailyAnalysisWorkflow();
    updateRealTimeAlertsWorkflow();
    generateN8nInstructions();
    
    console.log('\n🎉 All workflows updated successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Start MCP Bridge: node scripts/start-with-mcp.js');
    console.log('   2. Import new workflows into n8n');
    console.log('   3. Test the workflows');
    console.log('   4. Activate the workflows');
    
  } catch (error) {
    console.error('❌ Failed to update workflows:', error.message);
    process.exit(1);
  }
}

main();