#!/usr/bin/env node

/**
 * Test MCP Bridge Connection
 * Tests the bridge service connection to Claude MCP
 */

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const BASE_URL = process.env.MCP_BRIDGE_URL || 'http://localhost:3000';

async function testConnection() {
  console.log('🔍 Testing MCP Bridge Service Connection...\n');

  // Test 1: Health Check
  try {
    console.log('1. Testing health check...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health check passed');
    console.log(`   Status: ${healthResponse.data.status}`);
    console.log(`   MCP: ${healthResponse.data.services?.mcp || 'unknown'}`);
    console.log('');
  } catch (error) {
    console.log('❌ Health check failed');
    console.log(`   Error: ${error.message}`);
    console.log('');
  }

  // Test 2: Get All Ad Accounts
  try {
    console.log('2. Testing get all ad accounts...');
    const accountsResponse = await axios.post(`${BASE_URL}/mcp`, {
      action: 'get_all_ad_accounts',
      request_id: uuidv4(),
      limit: 5
    });
    
    console.log('✅ Ad accounts request succeeded');
    console.log(`   Accounts found: ${accountsResponse.data.accounts?.length || 0}`);
    
    if (accountsResponse.data.accounts?.length > 0) {
      console.log('   First account:');
      const firstAccount = accountsResponse.data.accounts[0];
      console.log(`     - ID: ${firstAccount.id}`);
      console.log(`     - Name: ${firstAccount.name}`);
      console.log(`     - Currency: ${firstAccount.currency}`);
    }
    console.log('');
  } catch (error) {
    console.log('❌ Ad accounts request failed');
    console.log(`   Error: ${error.response?.data?.message || error.message}`);
    console.log('');
  }

  // Test 3: Get Campaign Insights (if we have accounts)
  try {
    console.log('3. Testing campaign insights...');
    
    // First get an account ID
    const accountsResponse = await axios.post(`${BASE_URL}/mcp`, {
      action: 'get_all_ad_accounts',
      request_id: uuidv4(),
      limit: 1
    });
    
    if (accountsResponse.data.accounts?.length > 0) {
      const accountId = accountsResponse.data.accounts[0].id;
      
      const insightsResponse = await axios.post(`${BASE_URL}/mcp`, {
        action: 'get_campaign_insights',
        request_id: uuidv4(),
        account_id: accountId,
        time_ranges: ['yesterday'],
        level: 'campaign'
      });
      
      console.log('✅ Campaign insights request succeeded');
      console.log(`   Account: ${accountId}`);
      const campaigns = insightsResponse.data.insights?.yesterday?.campaigns || [];
      console.log(`   Campaigns found: ${campaigns.length}`);
      
      if (campaigns.length > 0) {
        console.log('   First campaign:');
        const firstCampaign = campaigns[0];
        console.log(`     - Name: ${firstCampaign.campaign_name}`);
        console.log(`     - Spend: £${firstCampaign.spend}`);
        console.log(`     - Leads: ${firstCampaign.leads}`);
        console.log(`     - CPL: £${firstCampaign.costPerLead}`);
        console.log(`     - Severity: ${firstCampaign.severity}`);
      }
    } else {
      console.log('⚠️  No accounts available for insights test');
    }
    console.log('');
  } catch (error) {
    console.log('❌ Campaign insights request failed');
    console.log(`   Error: ${error.response?.data?.message || error.message}`);
    console.log('');
  }

  // Test 4: AI Analysis (with mock data)
  try {
    console.log('4. Testing AI analysis...');
    
    const mockData = {
      accounts: [
        {
          id: 'act_123456',
          name: 'Test Gym',
          metrics: {
            totalSpend: 500,
            totalLeads: 20,
            averageCPL: 25,
            healthScore: 75
          }
        }
      ],
      summary: {
        totalAccounts: 1,
        totalSpend: 500,
        totalLeads: 20,
        averageCPL: 25,
        overallHealth: 'good'
      }
    };
    
    const analysisResponse = await axios.post(`${BASE_URL}/mcp`, {
      action: 'generate_ai_analysis',
      request_id: uuidv4(),
      performance_data: mockData,
      analysis_type: 'daily'
    });
    
    console.log('✅ AI analysis request succeeded');
    console.log(`   Analysis type: ${analysisResponse.data.analysis_type}`);
    console.log(`   Recommendations: ${analysisResponse.data.recommendations?.length || 0}`);
    console.log(`   Priority actions: ${analysisResponse.data.priority_actions?.length || 0}`);
    console.log(`   Confidence: ${analysisResponse.data.confidence_score}`);
    console.log('');
  } catch (error) {
    console.log('❌ AI analysis request failed');
    console.log(`   Error: ${error.response?.data?.message || error.message}`);
    console.log('');
  }

  console.log('🎉 MCP Bridge Service testing completed!');
}

// Run the test
testConnection().catch(console.error);