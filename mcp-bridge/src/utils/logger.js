/**
 * Logging utility for MCP Bridge Service
 */

const winston = require('winston');
const path = require('path');
const config = require('../config');

// Create logs directory if it doesn't exist
const fs = require('fs');
const logsDir = path.dirname(config.logging.file);
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create logger instance
const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  defaultMeta: { service: 'mcp-bridge' },
  transports: [
    // File transport
    new winston.transports.File({
      filename: config.logging.file,
      maxsize: config.logging.maxSize,
      maxFiles: config.logging.maxFiles,
      tailable: true
    }),
    
    // Error file transport
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: config.logging.maxSize,
      maxFiles: config.logging.maxFiles,
      tailable: true
    })
  ]
});

// Add console transport for development
if (config.isDevelopment) {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Request logging middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const duration = Date.now() - start;
    
    logger.info('HTTP Request', {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      requestId: req.requestId
    });
    
    originalEnd.call(this, chunk, encoding);
  };
  
  next();
};

// Error logging middleware
const errorLogger = (error, req, res, next) => {
  logger.error('HTTP Error', {
    error: error.message,
    stack: error.stack,
    method: req.method,
    url: req.url,
    status: res.statusCode,
    requestId: req.requestId
  });
  
  next(error);
};

// MCP request logger
const mcpLogger = {
  request: (action, params, requestId) => {
    logger.info('MCP Request', {
      action,
      params,
      requestId,
      timestamp: new Date().toISOString()
    });
  },
  
  response: (action, success, data, requestId, duration) => {
    logger.info('MCP Response', {
      action,
      success,
      dataSize: JSON.stringify(data).length,
      requestId,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    });
  },
  
  error: (action, error, requestId) => {
    logger.error('MCP Error', {
      action,
      error: error.message,
      stack: error.stack,
      requestId,
      timestamp: new Date().toISOString()
    });
  }
};

// Performance logger
const performanceLogger = {
  start: (operation, requestId) => {
    const startTime = Date.now();
    logger.debug('Performance Start', {
      operation,
      requestId,
      startTime,
      timestamp: new Date().toISOString()
    });
    return startTime;
  },
  
  end: (operation, startTime, requestId, additionalData = {}) => {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    logger.info('Performance End', {
      operation,
      duration: `${duration}ms`,
      requestId,
      ...additionalData,
      timestamp: new Date().toISOString()
    });
    
    return duration;
  }
};

module.exports = {
  logger,
  requestLogger,
  errorLogger,
  mcpLogger,
  performanceLogger
};