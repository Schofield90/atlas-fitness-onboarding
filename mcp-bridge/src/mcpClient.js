/**
 * MCP Client for Claude Communication
 * Handles WebSocket communication with Claude MCP server
 */

const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const config = require('./config');
const { logger, mcpLogger, performanceLogger } = require('./utils/logger');

class MCPClient {
  constructor() {
    this.ws = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = config.mcp.maxRetries;
    this.reconnectDelay = config.mcp.retryDelay;
    this.pendingRequests = new Map();
    this.connectionPromise = null;
  }

  /**
   * Connect to MCP server
   */
  async connect() {
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        logger.info('Connecting to MCP server', { url: config.mcp.serverUrl });
        
        this.ws = new WebSocket(config.mcp.serverUrl);
        
        this.ws.on('open', () => {
          logger.info('Connected to MCP server');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          resolve();
        });

        this.ws.on('message', (data) => {
          this.handleMessage(data);
        });

        this.ws.on('close', (code, reason) => {
          logger.warn('MCP connection closed', { code, reason: reason.toString() });
          this.isConnected = false;
          this.handleDisconnect();
        });

        this.ws.on('error', (error) => {
          logger.error('MCP connection error', { error: error.message });
          this.isConnected = false;
          reject(error);
        });

        // Connection timeout
        setTimeout(() => {
          if (!this.isConnected) {
            reject(new Error('MCP connection timeout'));
          }
        }, config.mcp.timeout);

      } catch (error) {
        logger.error('Failed to create MCP connection', { error: error.message });
        reject(error);
      }
    });

    return this.connectionPromise;
  }

  /**
   * Handle incoming messages from MCP server
   */
  handleMessage(data) {
    try {
      const message = JSON.parse(data.toString());
      
      if (message.id && this.pendingRequests.has(message.id)) {
        const { resolve, reject, startTime, action } = this.pendingRequests.get(message.id);
        const duration = Date.now() - startTime;
        
        if (message.error) {
          mcpLogger.error(action, new Error(message.error.message), message.id);
          reject(new Error(message.error.message));
        } else {
          mcpLogger.response(action, true, message.result, message.id, duration);
          resolve(message.result);
        }
        
        this.pendingRequests.delete(message.id);
      }
    } catch (error) {
      logger.error('Error parsing MCP message', { error: error.message });
    }
  }

  /**
   * Handle disconnection and attempt reconnection
   */
  async handleDisconnect() {
    this.connectionPromise = null;
    
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      
      logger.info(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`, {
        delay: `${delay}ms`
      });
      
      setTimeout(() => {
        this.connect().catch(error => {
          logger.error('Reconnection failed', { error: error.message });
        });
      }, delay);
    } else {
      logger.error('Max reconnection attempts reached');
      // Reject all pending requests
      this.pendingRequests.forEach(({ reject, action }) => {
        reject(new Error('MCP connection lost'));
      });
      this.pendingRequests.clear();
    }
  }

  /**
   * Send request to MCP server
   */
  async sendRequest(method, params, action = 'unknown') {
    if (!this.isConnected) {
      await this.connect();
    }

    const requestId = uuidv4();
    const startTime = Date.now();
    
    const request = {
      jsonrpc: '2.0',
      id: requestId,
      method,
      params
    };

    mcpLogger.request(action, params, requestId);

    return new Promise((resolve, reject) => {
      // Store request for response handling
      this.pendingRequests.set(requestId, {
        resolve,
        reject,
        startTime,
        action
      });

      // Send request
      this.ws.send(JSON.stringify(request));

      // Request timeout
      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          mcpLogger.error(action, new Error('Request timeout'), requestId);
          reject(new Error('MCP request timeout'));
        }
      }, config.mcp.timeout);
    });
  }

  /**
   * Get all ad accounts
   */
  async getAllAdAccounts(limit = 25) {
    const startTime = performanceLogger.start('getAllAdAccounts', 'mcp');
    
    try {
      const result = await this.sendRequest('tools/call', {
        name: 'Meta Ads Assistant:get_ad_accounts',
        arguments: { limit }
      }, 'get_all_ad_accounts');
      
      performanceLogger.end('getAllAdAccounts', startTime, 'mcp', {
        accountCount: result?.data?.length || 0
      });
      
      return result;
    } catch (error) {
      performanceLogger.end('getAllAdAccounts', startTime, 'mcp', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get campaign insights
   */
  async getCampaignInsights(accountId, timeRange = 'yesterday', level = 'campaign', fields = []) {
    const startTime = performanceLogger.start('getCampaignInsights', 'mcp');
    
    const defaultFields = [
      'campaign_id',
      'campaign_name',
      'spend',
      'impressions',
      'clicks',
      'actions',
      'cost_per_action_type',
      'date_start',
      'date_stop'
    ];

    try {
      const result = await this.sendRequest('tools/call', {
        name: 'Meta Ads Assistant:get_insights',
        arguments: {
          object_id: accountId,
          time_range: timeRange,
          level,
          fields: fields.length > 0 ? fields : defaultFields
        }
      }, 'get_campaign_insights');
      
      performanceLogger.end('getCampaignInsights', startTime, 'mcp', {
        accountId,
        timeRange,
        campaignCount: result?.data?.length || 0
      });
      
      return result;
    } catch (error) {
      performanceLogger.end('getCampaignInsights', startTime, 'mcp', {
        accountId,
        timeRange,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Generate AI analysis (this would be sent to Claude for analysis)
   */
  async generateAIAnalysis(performanceData, analysisType = 'daily', context = {}) {
    const startTime = performanceLogger.start('generateAIAnalysis', 'mcp');
    
    try {
      // Construct prompt for Claude
      const prompt = this.buildAnalysisPrompt(performanceData, analysisType, context);
      
      const result = await this.sendRequest('tools/call', {
        name: 'analyze_meta_ads_performance',
        arguments: {
          performance_data: performanceData,
          analysis_type: analysisType,
          context,
          prompt
        }
      }, 'generate_ai_analysis');
      
      performanceLogger.end('generateAIAnalysis', startTime, 'mcp', {
        analysisType,
        dataSize: JSON.stringify(performanceData).length
      });
      
      return result;
    } catch (error) {
      performanceLogger.end('generateAIAnalysis', startTime, 'mcp', {
        analysisType,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Build analysis prompt for Claude
   */
  buildAnalysisPrompt(performanceData, analysisType, context) {
    const businessContext = {
      business_type: 'gym',
      target_market: 'uk',
      primary_metric: 'cost_per_lead',
      ...context
    };

    let prompt = `Analyze the following Meta Ads performance data for ${businessContext.business_type} campaigns in ${businessContext.target_market}:\n\n`;
    
    // Add performance data summary
    if (performanceData.summary) {
      prompt += `EXECUTIVE SUMMARY:\n`;
      prompt += `- Total Accounts: ${performanceData.summary.totalAccounts}\n`;
      prompt += `- Total Spend: £${performanceData.summary.totalSpend}\n`;
      prompt += `- Total Leads: ${performanceData.summary.totalLeads}\n`;
      prompt += `- Average CPL: £${performanceData.summary.averageCPL}\n\n`;
    }

    // Add account details
    if (performanceData.accounts && performanceData.accounts.length > 0) {
      prompt += `ACCOUNT DETAILS:\n`;
      performanceData.accounts.forEach(account => {
        prompt += `Account: ${account.name}\n`;
        prompt += `- Spend: £${account.metrics?.totalSpend || 0}\n`;
        prompt += `- Leads: ${account.metrics?.totalLeads || 0}\n`;
        prompt += `- CPL: £${account.metrics?.averageCPL || 0}\n`;
        prompt += `- Health Score: ${account.metrics?.healthScore || 0}/100\n\n`;
      });
    }

    // Analysis type specific instructions
    switch (analysisType) {
      case 'daily':
        prompt += `Please provide:\n`;
        prompt += `1. Root cause analysis of performance issues\n`;
        prompt += `2. Specific optimization recommendations\n`;
        prompt += `3. Budget reallocation suggestions\n`;
        prompt += `4. Priority action items\n`;
        break;
      
      case 'crisis':
        prompt += `URGENT ANALYSIS REQUIRED:\n`;
        prompt += `Please provide immediate action plan:\n`;
        prompt += `1. Stop/pause recommendations\n`;
        prompt += `2. Emergency budget adjustments\n`;
        prompt += `3. Quick wins for immediate improvement\n`;
        prompt += `4. Root cause analysis\n`;
        break;
      
      case 'optimization':
        prompt += `OPTIMIZATION FOCUS:\n`;
        prompt += `Please provide:\n`;
        prompt += `1. Performance improvement opportunities\n`;
        prompt += `2. Audience targeting adjustments\n`;
        prompt += `3. Creative refresh recommendations\n`;
        prompt += `4. Budget optimization strategies\n`;
        break;
    }

    return prompt;
  }

  /**
   * Health check (non-blocking)
   */
  async healthCheck() {
    try {
      // Only check if already connected, don't try to connect
      if (!this.isConnected) {
        return false;
      }
      
      // Send a simple ping-like request with timeout
      const result = await Promise.race([
        this.sendRequest('ping', {}, 'health_check'),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Health check timeout')), 1000))
      ]);
      return true;
    } catch (error) {
      logger.error('MCP health check failed', { error: error.message });
      return false;
    }
  }

  /**
   * Close connection
   */
  close() {
    if (this.ws) {
      this.ws.close();
      this.isConnected = false;
    }
  }
}

// Create singleton instance
const mcpClient = new MCPClient();

module.exports = mcpClient;