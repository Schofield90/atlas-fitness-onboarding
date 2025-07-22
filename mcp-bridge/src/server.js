/**
 * MCP Bridge Service - Main Server
 * HTTP bridge between n8n workflows and Claude Meta MCP
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');
const { StatusCodes } = require('http-status-codes');

// Internal imports
const config = require('./config');
const { logger, requestLogger, errorLogger } = require('./utils/logger');
const { requestSizeValidator } = require('./utils/validators');
const mcpRoutes = require('./routes/mcp');

// Initialize Express app
const app = express();

// Validate configuration
try {
  config.validateConfig();
  logger.info('Configuration validated successfully');
} catch (error) {
  logger.error('Configuration validation failed:', error);
  process.exit(1);
}

// Security middleware
app.use(helmet(config.security.helmet));
app.use(compression());

// CORS configuration
app.use(cors(config.cors));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    success: false,
    error: 'Rate Limit Exceeded',
    message: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil(config.rateLimit.windowMs / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === config.healthCheck.endpoint;
  }
});

app.use(limiter);

// Request parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request size validation
app.use(requestSizeValidator(1024 * 1024)); // 1MB limit

// Request ID middleware
app.use((req, res, next) => {
  req.requestId = req.headers['x-request-id'] || uuidv4();
  res.set('X-Request-ID', req.requestId);
  next();
});

// Request logging middleware
app.use(requestLogger);

// Health check endpoint
app.get(config.healthCheck.endpoint, async (req, res) => {
  const healthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    environment: config.server.environment,
    memory: process.memoryUsage(),
    services: {
      database: 'not_applicable',
      mcp: 'checking'
    }
  };

  try {
    // Check MCP connection (non-blocking check)
    const mcpClient = require('./mcpClient');
    
    // Only check if already connected, don't try to connect
    if (mcpClient.isConnected) {
      const mcpHealthy = await Promise.race([
        mcpClient.healthCheck(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Health check timeout')), 2000))
      ]);
      healthCheck.services.mcp = mcpHealthy ? 'healthy' : 'unhealthy';
    } else {
      healthCheck.services.mcp = 'disconnected';
    }
    
    if (healthCheck.services.mcp !== 'healthy') {
      healthCheck.status = 'degraded';
    }
  } catch (error) {
    healthCheck.services.mcp = 'error';
    healthCheck.status = 'degraded';
    logger.warn('MCP health check failed:', error);
  }

  // Return 200 for degraded (service is working, just MCP is down)
  // Return 503 only if the service itself is broken
  const statusCode = healthCheck.status === 'healthy' ? 
    StatusCodes.OK : StatusCodes.OK; // Always return 200 for HTTP server health
  
  res.status(statusCode).json(healthCheck);
});

// API routes
app.use('/mcp', mcpRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'MCP Bridge Service',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: config.healthCheck.endpoint,
      mcp: '/mcp',
      documentation: '/docs'
    }
  });
});

// API documentation endpoint
app.get('/docs', (req, res) => {
  res.json({
    title: 'MCP Bridge Service API Documentation',
    version: '1.0.0',
    description: 'HTTP bridge between n8n workflows and Claude Meta MCP',
    endpoints: {
      'POST /mcp': {
        description: 'Main MCP endpoint for all operations',
        actions: {
          'get_all_ad_accounts': {
            description: 'Retrieve all Meta ad accounts',
            parameters: {
              request_id: 'string (UUID)',
              limit: 'number (1-100, default: 25)'
            }
          },
          'get_campaign_insights': {
            description: 'Get campaign performance insights',
            parameters: {
              request_id: 'string (UUID)',
              account_id: 'string (act_XXXXXX)',
              time_ranges: 'array of time ranges',
              level: 'string (campaign, adset, ad)',
              fields: 'array of field names'
            }
          },
          'generate_ai_analysis': {
            description: 'Generate AI analysis of performance data',
            parameters: {
              request_id: 'string (UUID)',
              performance_data: 'object with account data',
              analysis_type: 'string (daily, crisis, optimization)',
              context: 'object with business context'
            }
          }
        }
      },
      'GET /health': {
        description: 'Health check endpoint',
        response: 'Service health status and metrics'
      }
    },
    examples: {
      get_all_ad_accounts: {
        request: {
          action: 'get_all_ad_accounts',
          request_id: 'uuid-here',
          limit: 25
        },
        response: {
          success: true,
          accounts: [],
          request_id: 'uuid-here',
          timestamp: '2025-01-15T10:30:00Z'
        }
      }
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(StatusCodes.NOT_FOUND).json({
    success: false,
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use(errorLogger);

app.use((error, req, res, next) => {
  const statusCode = error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
  const message = error.message || 'Internal Server Error';
  
  const errorResponse = {
    success: false,
    error: error.name || 'ServerError',
    message: message,
    request_id: req.requestId,
    timestamp: new Date().toISOString()
  };
  
  // Add stack trace in development
  if (config.isDevelopment) {
    errorResponse.stack = error.stack;
  }
  
  res.status(statusCode).json(errorResponse);
});

// Graceful shutdown handling
const shutdown = (signal) => {
  logger.info(`Received ${signal}, shutting down gracefully...`);
  
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
  
  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

// Start server with proper error handling
const server = app.listen(config.server.port, config.server.host, (err) => {
  if (err) {
    logger.error('❌ Failed to start HTTP server:', err);
    process.exit(1);
  }
  
  logger.info(`✅ MCP Bridge HTTP server successfully listening on port ${config.server.port}`, {
    port: config.server.port,
    host: config.server.host,
    environment: config.server.environment,
    nodeVersion: process.version,
    pid: process.pid
  });
  
  logger.info(`🔗 Health check: http://localhost:${config.server.port}/health`);
  logger.info(`📡 API endpoint: http://localhost:${config.server.port}/mcp`);
});

// Handle server errors
server.on('error', (err) => {
  logger.error('❌ HTTP server error:', err);
  if (err.code === 'EADDRINUSE') {
    logger.error(`❌ Port ${config.server.port} is already in use`);
    logger.error('💡 Try: lsof -ti:3000 | xargs kill -9');
    process.exit(1);
  }
  if (err.code === 'EACCES') {
    logger.error(`❌ Permission denied to bind to port ${config.server.port}`);
    process.exit(1);
  }
});

// Handle graceful shutdown
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit in production, just log
  if (config.isDevelopment) {
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

module.exports = app;