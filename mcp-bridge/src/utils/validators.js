/**
 * Request validation utilities for MCP Bridge Service
 */

const Joi = require('joi');
const { StatusCodes } = require('http-status-codes');

// Common validation schemas
const schemas = {
  // Get all ad accounts request
  getAllAdAccountsRequest: Joi.object({
    action: Joi.string().valid('get_all_ad_accounts').required(),
    request_id: Joi.string().uuid().required(),
    limit: Joi.number().integer().min(1).max(100).default(25)
  }),
  
  // Get campaign insights request
  getCampaignInsightsRequest: Joi.object({
    action: Joi.string().valid('get_campaign_insights').required(),
    request_id: Joi.string().uuid().required(),
    account_id: Joi.string().pattern(/^act_\d+$/).required(),
    time_ranges: Joi.array().items(
      Joi.string().valid(
        'today',
        'yesterday',
        'last_3d',
        'last_7d',
        'last_14d',
        'last_30d',
        'last_90d'
      )
    ).min(1).max(3).required(),
    level: Joi.string().valid('account', 'campaign', 'adset', 'ad').default('campaign'),
    fields: Joi.array().items(Joi.string()).default([
      'campaign_id',
      'campaign_name',
      'spend',
      'impressions',
      'clicks',
      'actions',
      'cost_per_action_type',
      'date_start',
      'date_stop'
    ])
  }),
  
  // Generate AI analysis request
  generateAIAnalysisRequest: Joi.object({
    action: Joi.string().valid('generate_ai_analysis').required(),
    request_id: Joi.string().uuid().required(),
    performance_data: Joi.object().required(),
    analysis_type: Joi.string().valid('daily', 'crisis', 'optimization').default('daily'),
    context: Joi.object({
      business_type: Joi.string().default('gym'),
      target_market: Joi.string().default('uk'),
      primary_metric: Joi.string().default('cost_per_lead')
    }).default({})
  }),

  // Generic MCP request for dynamic validation
  mcpRequest: Joi.object({
    action: Joi.string().valid(
      'get_all_ad_accounts',
      'get_campaign_insights',
      'generate_ai_analysis',
      'health_check'
    ).required(),
    request_id: Joi.string().uuid().required()
  }).unknown(true)
};

// Validation middleware factory
const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      allowUnknown: false,
      stripUnknown: true
    });
    
    if (error) {
      const errorDetails = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));
      
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: 'Validation Error',
        details: errorDetails,
        timestamp: new Date().toISOString()
      });
    }
    
    // Replace req.body with validated and sanitized data
    req.body = value;
    next();
  };
};

// Dynamic validator for MCP endpoint based on action type
const validateMCPRequest = (req, res, next) => {
  const { action } = req.body;
  
  // First validate the basic structure
  const { error: basicError } = schemas.mcpRequest.validate(req.body, {
    abortEarly: false,
    allowUnknown: true
  });
  
  if (basicError) {
    const errorDetails = basicError.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message,
      value: detail.context?.value
    }));
    
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      error: 'Validation Error',
      details: errorDetails,
      timestamp: new Date().toISOString()
    });
  }
  
  // Then validate specific action requirements
  let specificSchema;
  switch (action) {
    case 'get_all_ad_accounts':
      specificSchema = schemas.getAllAdAccountsRequest;
      break;
    case 'get_campaign_insights':
      specificSchema = schemas.getCampaignInsightsRequest;
      break;
    case 'generate_ai_analysis':
      specificSchema = schemas.generateAIAnalysisRequest;
      break;
    default:
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: 'Invalid Action',
        message: `Unknown action: ${action}`,
        timestamp: new Date().toISOString()
      });
  }
  
  const { error, value } = specificSchema.validate(req.body, {
    abortEarly: false,
    allowUnknown: false,
    stripUnknown: true
  });
  
  if (error) {
    const errorDetails = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message,
      value: detail.context?.value
    }));
    
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      error: 'Validation Error',
      details: errorDetails,
      timestamp: new Date().toISOString()
    });
  }
  
  // Replace req.body with validated and sanitized data
  req.body = value;
  next();
};

// Specific validators for each endpoint
const validators = {
  mcpRequest: validateMCPRequest,
  getAllAdAccounts: validateRequest(schemas.getAllAdAccountsRequest),
  getCampaignInsights: validateRequest(schemas.getCampaignInsightsRequest),
  generateAIAnalysis: validateRequest(schemas.generateAIAnalysisRequest)
};

// Custom validation functions
const customValidators = {
  // Validate account ID format
  isValidAccountId: (accountId) => {
    return /^act_\d+$/.test(accountId);
  },
  
  // Validate time range combination
  isValidTimeRangeCombo: (timeRanges) => {
    if (!Array.isArray(timeRanges)) return false;
    if (timeRanges.length === 0 || timeRanges.length > 3) return false;
    
    const validRanges = [
      'today', 'yesterday', 'last_3d', 'last_7d', 
      'last_14d', 'last_30d', 'last_90d'
    ];
    
    return timeRanges.every(range => validRanges.includes(range));
  },
  
  // Validate performance data structure
  isValidPerformanceData: (data) => {
    if (!data || typeof data !== 'object') return false;
    
    // Check for required fields
    const requiredFields = ['accounts', 'summary'];
    return requiredFields.every(field => field in data);
  },
  
  // Validate request ID format (UUID v4)
  isValidRequestId: (requestId) => {
    const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidV4Regex.test(requestId);
  }
};

// Error response formatter
const formatValidationError = (error, req) => {
  return {
    success: false,
    error: 'Validation Error',
    message: error.message,
    details: error.details || [],
    request_id: req.body?.request_id || null,
    timestamp: new Date().toISOString(),
    endpoint: req.path,
    method: req.method
  };
};

// Rate limiting validation
const rateLimitValidator = (req, res, next) => {
  // Check if request is within rate limits
  const clientId = req.ip || 'unknown';
  const currentTime = Date.now();
  
  // This would integrate with actual rate limiting logic
  // For now, just pass through
  next();
};

// Request size validation
const requestSizeValidator = (maxSize = 1024 * 1024) => { // 1MB default
  return (req, res, next) => {
    const contentLength = parseInt(req.get('content-length') || '0');
    
    if (contentLength > maxSize) {
      return res.status(StatusCodes.REQUEST_TOO_LONG).json({
        success: false,
        error: 'Request Too Large',
        message: `Request size ${contentLength} exceeds maximum allowed size ${maxSize}`,
        timestamp: new Date().toISOString()
      });
    }
    
    next();
  };
};

module.exports = {
  schemas,
  validators,
  customValidators,
  validateRequest,
  formatValidationError,
  rateLimitValidator,
  requestSizeValidator
};