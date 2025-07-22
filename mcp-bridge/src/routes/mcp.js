/**
 * MCP API Routes
 * Handles all MCP-related endpoints for n8n integration
 */

const express = require('express');
const { StatusCodes } = require('http-status-codes');
const { v4: uuidv4 } = require('uuid');
const NodeCache = require('node-cache');

// Internal imports
const mcpClient = require('../mcpClient');
const DataProcessor = require('../dataProcessor');
const { validators } = require('../utils/validators');
const { logger, performanceLogger } = require('../utils/logger');
const config = require('../config');

const router = express.Router();
const dataProcessor = new DataProcessor();

// Cache for frequently requested data
const cache = new NodeCache({
  stdTTL: config.cache.stdTTL,
  checkperiod: config.cache.checkperiod,
  useClones: config.cache.useClones
});

/**
 * Main MCP endpoint - handles all MCP operations
 */
router.post('/', validators.mcpRequest, async (req, res) => {
  const startTime = performanceLogger.start('mcpRequest', req.requestId);
  const { action, request_id } = req.body;

  try {
    let result;
    
    switch (action) {
      case 'get_all_ad_accounts':
        result = await handleGetAllAdAccounts(req.body, req.requestId);
        break;
        
      case 'get_campaign_insights':
        result = await handleGetCampaignInsights(req.body, req.requestId);
        break;
        
      case 'generate_ai_analysis':
        result = await handleGenerateAIAnalysis(req.body, req.requestId);
        break;
        
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    performanceLogger.end('mcpRequest', startTime, req.requestId, {
      action,
      success: true,
      responseSize: JSON.stringify(result).length
    });

    res.json({
      success: true,
      ...result,
      request_id: request_id || req.requestId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    performanceLogger.end('mcpRequest', startTime, req.requestId, {
      action,
      success: false,
      error: error.message
    });

    logger.error('MCP request failed', {
      action,
      error: error.message,
      requestId: req.requestId,
      body: req.body
    });

    const statusCode = error.name === 'ValidationError' ? 
      StatusCodes.BAD_REQUEST : StatusCodes.INTERNAL_SERVER_ERROR;

    res.status(statusCode).json({
      success: false,
      error: error.name || 'ServerError',
      message: error.message,
      request_id: request_id || req.requestId,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Handle get all ad accounts request
 */
async function handleGetAllAdAccounts(requestData, requestId) {
  const { limit = 25 } = requestData;
  const cacheKey = `ad_accounts_${limit}`;

  // Check cache first
  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    logger.info('Returning cached ad accounts data', { requestId, limit });
    return cachedData;
  }

  try {
    // Fetch from MCP
    const rawData = await mcpClient.getAllAdAccounts(limit);
    
    // Process the data
    const processedData = dataProcessor.processAdAccounts(rawData);
    
    // Cache the result
    cache.set(cacheKey, processedData);
    
    logger.info('Retrieved ad accounts', {
      requestId,
      accountCount: processedData.accounts.length,
      limit
    });

    return processedData;

  } catch (error) {
    logger.error('Failed to get ad accounts', {
      requestId,
      error: error.message,
      limit
    });
    throw error;
  }
}

/**
 * Handle get campaign insights request
 */
async function handleGetCampaignInsights(requestData, requestId) {
  const { account_id, time_ranges, level = 'campaign', fields = [] } = requestData;
  const cacheKey = `insights_${account_id}_${time_ranges.join('_')}_${level}`;

  // Check cache first
  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    logger.info('Returning cached insights data', { requestId, account_id, time_ranges });
    return cachedData;
  }

  try {
    const insights = {};
    
    // Fetch insights for each time range
    for (const timeRange of time_ranges) {
      const rawData = await mcpClient.getCampaignInsights(
        account_id, 
        timeRange, 
        level, 
        fields
      );
      
      insights[timeRange] = rawData;
    }

    // Process the insights data
    const processedData = dataProcessor.processMultipleTimeRanges(insights);
    
    // Add account ID to the response
    processedData.account_id = account_id;
    
    // Cache the result
    cache.set(cacheKey, processedData);
    
    logger.info('Retrieved campaign insights', {
      requestId,
      account_id,
      time_ranges,
      level,
      totalCampaigns: Object.values(processedData.insights)
        .reduce((sum, insight) => sum + insight.campaigns.length, 0)
    });

    return processedData;

  } catch (error) {
    logger.error('Failed to get campaign insights', {
      requestId,
      account_id,
      time_ranges,
      error: error.message
    });
    throw error;
  }
}

/**
 * Handle generate AI analysis request
 */
async function handleGenerateAIAnalysis(requestData, requestId) {
  const { performance_data, analysis_type = 'daily', context = {} } = requestData;
  
  try {
    // Generate AI analysis via MCP
    const analysisResult = await mcpClient.generateAIAnalysis(
      performance_data,
      analysis_type,
      context
    );

    // Process and structure the analysis
    const processedAnalysis = processAIAnalysis(analysisResult, analysis_type);
    
    logger.info('Generated AI analysis', {
      requestId,
      analysis_type,
      dataSize: JSON.stringify(performance_data).length,
      responseSize: JSON.stringify(processedAnalysis).length
    });

    return processedAnalysis;

  } catch (error) {
    logger.error('Failed to generate AI analysis', {
      requestId,
      analysis_type,
      error: error.message
    });
    
    // Return fallback analysis if AI fails
    return generateFallbackAnalysis(performance_data, analysis_type);
  }
}

/**
 * Process AI analysis response
 */
function processAIAnalysis(analysisResult, analysisType) {
  // Extract structured data from AI response
  const analysis = {
    analysis_type: analysisType,
    raw_analysis: analysisResult.content || analysisResult.analysis || '',
    recommendations: extractRecommendations(analysisResult),
    priority_actions: extractPriorityActions(analysisResult),
    budget_suggestions: extractBudgetSuggestions(analysisResult),
    issues_identified: extractIssues(analysisResult),
    confidence_score: analysisResult.confidence || 0.8,
    timestamp: new Date().toISOString()
  };

  return analysis;
}

/**
 * Extract recommendations from AI response
 */
function extractRecommendations(analysisResult) {
  const content = analysisResult.content || analysisResult.analysis || '';
  const recommendations = [];

  // Look for bullet points or numbered recommendations
  const lines = content.split('\n');
  let inRecommendationsSection = false;

  for (const line of lines) {
    const trimmed = line.trim();
    
    // Check if we're entering recommendations section
    if (trimmed.toLowerCase().includes('recommendation')) {
      inRecommendationsSection = true;
      continue;
    }
    
    // Check if we're leaving recommendations section
    if (inRecommendationsSection && trimmed.match(/^[A-Z].*:$/)) {
      inRecommendationsSection = false;
    }
    
    // Extract recommendation items
    if (inRecommendationsSection && trimmed.match(/^[-*•]\s|^\d+\.\s/)) {
      const rec = trimmed.replace(/^[-*•]\s|^\d+\.\s/, '').trim();
      if (rec.length > 10) {
        recommendations.push(rec);
      }
    }
  }

  return recommendations.slice(0, 8); // Limit to 8 recommendations
}

/**
 * Extract priority actions from AI response
 */
function extractPriorityActions(analysisResult) {
  const content = analysisResult.content || analysisResult.analysis || '';
  const actions = [];

  // Look for priority or urgent actions
  const lines = content.split('\n');
  let inPrioritySection = false;

  for (const line of lines) {
    const trimmed = line.trim();
    
    if (trimmed.toLowerCase().includes('priority') || 
        trimmed.toLowerCase().includes('urgent') ||
        trimmed.toLowerCase().includes('immediate')) {
      inPrioritySection = true;
      continue;
    }
    
    if (inPrioritySection && trimmed.match(/^[A-Z].*:$/)) {
      inPrioritySection = false;
    }
    
    if (inPrioritySection && trimmed.match(/^[-*•]\s|^\d+\.\s/)) {
      const action = trimmed.replace(/^[-*•]\s|^\d+\.\s/, '').trim();
      if (action.length > 10) {
        actions.push({
          action: action,
          urgency: determineUrgency(action),
          estimated_impact: 'medium' // Default impact
        });
      }
    }
  }

  return actions.slice(0, 5); // Limit to 5 priority actions
}

/**
 * Extract budget suggestions from AI response
 */
function extractBudgetSuggestions(analysisResult) {
  const content = analysisResult.content || analysisResult.analysis || '';
  const suggestions = [];

  // Look for budget-related suggestions
  const budgetKeywords = ['budget', 'spend', 'allocation', 'reallocate', 'pause', 'increase'];
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    
    if (budgetKeywords.some(keyword => trimmed.toLowerCase().includes(keyword))) {
      if (trimmed.match(/^[-*•]\s|^\d+\.\s/)) {
        const suggestion = trimmed.replace(/^[-*•]\s|^\d+\.\s/, '').trim();
        if (suggestion.length > 10) {
          suggestions.push(suggestion);
        }
      }
    }
  }

  return suggestions.slice(0, 5); // Limit to 5 budget suggestions
}

/**
 * Extract issues from AI response
 */
function extractIssues(analysisResult) {
  const content = analysisResult.content || analysisResult.analysis || '';
  const issues = [];

  // Look for issues or problems
  const issueKeywords = ['issue', 'problem', 'concern', 'warning', 'critical'];
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    
    if (issueKeywords.some(keyword => trimmed.toLowerCase().includes(keyword))) {
      if (trimmed.match(/^[-*•]\s|^\d+\.\s/)) {
        const issue = trimmed.replace(/^[-*•]\s|^\d+\.\s/, '').trim();
        if (issue.length > 10) {
          issues.push({
            issue: issue,
            severity: determineSeverity(issue),
            category: categorizeIssue(issue)
          });
        }
      }
    }
  }

  return issues.slice(0, 10); // Limit to 10 issues
}

/**
 * Determine urgency of an action
 */
function determineUrgency(action) {
  const urgentKeywords = ['pause', 'stop', 'immediately', 'urgent', 'critical'];
  const actionLower = action.toLowerCase();
  
  if (urgentKeywords.some(keyword => actionLower.includes(keyword))) {
    return 'high';
  }
  
  return 'medium';
}

/**
 * Determine severity of an issue
 */
function determineSeverity(issue) {
  const criticalKeywords = ['critical', 'urgent', 'immediate', 'pause', 'stop'];
  const warningKeywords = ['warning', 'concern', 'high', 'review'];
  const issueLower = issue.toLowerCase();
  
  if (criticalKeywords.some(keyword => issueLower.includes(keyword))) {
    return 'critical';
  }
  
  if (warningKeywords.some(keyword => issueLower.includes(keyword))) {
    return 'warning';
  }
  
  return 'info';
}

/**
 * Categorize an issue
 */
function categorizeIssue(issue) {
  const issueLower = issue.toLowerCase();
  
  if (issueLower.includes('cpl') || issueLower.includes('cost per lead')) {
    return 'cost_per_lead';
  }
  
  if (issueLower.includes('ctr') || issueLower.includes('click through')) {
    return 'click_through_rate';
  }
  
  if (issueLower.includes('budget') || issueLower.includes('spend')) {
    return 'budget';
  }
  
  if (issueLower.includes('audience') || issueLower.includes('targeting')) {
    return 'targeting';
  }
  
  if (issueLower.includes('creative') || issueLower.includes('ad')) {
    return 'creative';
  }
  
  return 'general';
}

/**
 * Generate fallback analysis when AI fails
 */
function generateFallbackAnalysis(performanceData, analysisType) {
  const recommendations = [];
  const priorityActions = [];
  const budgetSuggestions = [];

  // Basic analysis based on data patterns
  if (performanceData.summary) {
    const { averageCPL, criticalAccounts, totalSpend } = performanceData.summary;
    
    if (averageCPL > 30) {
      recommendations.push('Review targeting to improve cost per lead efficiency');
      priorityActions.push({
        action: 'Analyze high CPL campaigns and optimize targeting',
        urgency: 'high',
        estimated_impact: 'high'
      });
    }
    
    if (criticalAccounts > 0) {
      recommendations.push(`Address ${criticalAccounts} accounts with critical performance issues`);
      priorityActions.push({
        action: 'Review and pause underperforming campaigns',
        urgency: 'high',
        estimated_impact: 'high'
      });
    }
    
    if (totalSpend > 1000) {
      budgetSuggestions.push('Consider reallocating budget from poor performers to top campaigns');
    }
  }

  return {
    analysis_type: analysisType,
    raw_analysis: 'AI analysis unavailable - using fallback recommendations based on performance data patterns',
    recommendations,
    priority_actions: priorityActions,
    budget_suggestions: budgetSuggestions,
    issues_identified: [],
    confidence_score: 0.6, // Lower confidence for fallback
    fallback: true,
    timestamp: new Date().toISOString()
  };
}

/**
 * Bulk operations endpoint for multiple accounts
 */
router.post('/bulk', async (req, res) => {
  const { operations, request_id } = req.body;
  
  if (!Array.isArray(operations)) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      error: 'Invalid Request',
      message: 'Operations must be an array',
      request_id: request_id || req.requestId,
      timestamp: new Date().toISOString()
    });
  }

  try {
    const results = [];
    
    // Process operations concurrently but limit concurrency
    const concurrencyLimit = config.metaAds.limits.maxConcurrentRequests;
    const chunks = [];
    
    for (let i = 0; i < operations.length; i += concurrencyLimit) {
      chunks.push(operations.slice(i, i + concurrencyLimit));
    }
    
    for (const chunk of chunks) {
      const chunkResults = await Promise.allSettled(
        chunk.map(async (operation) => {
          switch (operation.action) {
            case 'get_campaign_insights':
              return await handleGetCampaignInsights(operation, req.requestId);
            case 'get_all_ad_accounts':
              return await handleGetAllAdAccounts(operation, req.requestId);
            default:
              throw new Error(`Unsupported bulk operation: ${operation.action}`);
          }
        })
      );
      
      results.push(...chunkResults);
    }
    
    // Process results
    const successfulResults = results
      .filter(result => result.status === 'fulfilled')
      .map(result => result.value);
    
    const failedResults = results
      .filter(result => result.status === 'rejected')
      .map(result => ({ error: result.reason.message }));
    
    res.json({
      success: true,
      results: successfulResults,
      failed: failedResults,
      summary: {
        total: operations.length,
        successful: successfulResults.length,
        failed: failedResults.length
      },
      request_id: request_id || req.requestId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Bulk operation failed', {
      error: error.message,
      requestId: req.requestId,
      operationCount: operations.length
    });

    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: 'BulkOperationError',
      message: error.message,
      request_id: request_id || req.requestId,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Cache management endpoints
 */
router.delete('/cache', (req, res) => {
  const deletedKeys = cache.keys();
  cache.flushAll();
  
  res.json({
    success: true,
    message: 'Cache cleared',
    deleted_keys: deletedKeys.length,
    timestamp: new Date().toISOString()
  });
});

router.get('/cache/stats', (req, res) => {
  const stats = cache.getStats();
  
  res.json({
    success: true,
    cache_stats: {
      keys: stats.keys,
      hits: stats.hits,
      misses: stats.misses,
      ksize: stats.ksize,
      vsize: stats.vsize
    },
    timestamp: new Date().toISOString()
  });
});

module.exports = router;