/**
 * Configuration management for MCP Bridge Service
 */

require('dotenv').config();

const config = {
  // Server Configuration
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || '0.0.0.0',
    environment: process.env.NODE_ENV || 'development'
  },

  // MCP Configuration
  mcp: {
    serverUrl: process.env.MCP_SERVER_URL || 'ws://localhost:8080',
    timeout: parseInt(process.env.MCP_TIMEOUT) || 30000,
    maxRetries: parseInt(process.env.MCP_MAX_RETRIES) || 3,
    retryDelay: parseInt(process.env.MCP_RETRY_DELAY) || 1000
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    skipSuccessfulRequests: false,
    skipFailedRequests: false
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || './logs/mcp-bridge.log',
    maxSize: process.env.LOG_MAX_SIZE || '10m',
    maxFiles: process.env.LOG_MAX_FILES || '5',
    format: process.env.LOG_FORMAT || 'json'
  },

  // Health Check
  healthCheck: {
    timeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT) || 5000,
    endpoint: '/health'
  },

  // CORS Configuration
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: process.env.CORS_CREDENTIALS === 'true',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  },

  // Security
  security: {
    helmet: {
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false
    }
  },

  // Cache Configuration
  cache: {
    stdTTL: parseInt(process.env.CACHE_TTL) || 300, // 5 minutes
    checkperiod: parseInt(process.env.CACHE_CHECK_PERIOD) || 600, // 10 minutes
    useClones: false
  },

  // Meta Ads Thresholds
  metaAds: {
    thresholds: {
      costPerLead: {
        warning: parseFloat(process.env.CPL_WARNING_THRESHOLD) || 25,
        critical: parseFloat(process.env.CPL_CRITICAL_THRESHOLD) || 40
      },
      spend: {
        warning: parseFloat(process.env.SPEND_WARNING_THRESHOLD) || 100,
        critical: parseFloat(process.env.SPEND_CRITICAL_THRESHOLD) || 200
      },
      ctr: {
        warning: parseFloat(process.env.CTR_WARNING_THRESHOLD) || 0.8,
        critical: parseFloat(process.env.CTR_CRITICAL_THRESHOLD) || 0.5
      }
    },
    limits: {
      maxAccountsPerRequest: parseInt(process.env.MAX_ACCOUNTS_PER_REQUEST) || 25,
      maxTimeRanges: parseInt(process.env.MAX_TIME_RANGES) || 3,
      maxConcurrentRequests: parseInt(process.env.MAX_CONCURRENT_REQUESTS) || 10
    }
  }
};

// Validation
const validateConfig = () => {
  const required = [
    'server.port',
    'mcp.serverUrl',
    'logging.level'
  ];

  const missing = required.filter(key => {
    const value = key.split('.').reduce((obj, k) => obj && obj[k], config);
    return value === undefined || value === null;
  });

  if (missing.length > 0) {
    throw new Error(`Missing required configuration: ${missing.join(', ')}`);
  }
};

// Export configuration
module.exports = {
  ...config,
  validateConfig,
  isDevelopment: config.server.environment === 'development',
  isProduction: config.server.environment === 'production',
  isTest: config.server.environment === 'test'
};