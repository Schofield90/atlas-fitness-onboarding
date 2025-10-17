import { logger } from './logger';

interface ApiLogContext {
  method: string;
  endpoint: string;
  requestId: string;
  userId?: string;
  duration?: number;
  statusCode?: number;
}

export const apiLogger = {
  request: (method: string, endpoint: string, requestId: string, userId?: string) => {
    logger.info({
      type: 'API_REQUEST',
      method,
      endpoint,
      requestId,
      userId,
    }, `API Request: ${method} ${endpoint}`);
  },

  success: (method: string, endpoint: string, requestId: string, duration?: number) => {
    logger.info({
      type: 'API_SUCCESS',
      method,
      endpoint,
      requestId,
      duration,
    }, `API Success: ${method} ${endpoint} (${duration}ms)`);
  },

  error: (method: string, endpoint: string, requestId: string, error: any) => {
    logger.error({
      type: 'API_ERROR',
      method,
      endpoint,
      requestId,
      error: error.message,
      stack: error.stack,
    }, `API Error: ${method} ${endpoint} - ${error.message}`);
  },
};

export const dbLogger = {
  query: (operation: string, table: string, requestId: string) => {
    logger.info({
      type: 'DB_QUERY',
      operation,
      table,
      requestId,
    }, `Database: ${operation} on ${table}`);
  },

  error: (operation: string, table: string, requestId: string, error: any) => {
    logger.error({
      type: 'DB_ERROR',
      operation,
      table,
      requestId,
      error: error.message,
      stack: error.stack,
    }, `Database Error: ${operation} on ${table} - ${error.message}`);
  },
};

export const businessLogger = {
  event: (eventName: string, data: any, requestId?: string) => {
    logger.info({
      type: 'BUSINESS_EVENT',
      eventName,
      data,
      requestId,
    }, `Business Event: ${eventName}`);
  },
};

export const integrationLogger = {
  call: (service: string, action: string, requestId: string) => {
    logger.info({
      type: 'INTEGRATION_CALL',
      service,
      action,
      requestId,
    }, `Integration: ${service} - ${action}`);
  },

  error: (service: string, action: string, requestId: string, error: any) => {
    logger.error({
      type: 'INTEGRATION_ERROR',
      service,
      action,
      requestId,
      error: error.message,
    }, `Integration Error: ${service} - ${action} - ${error.message}`);
  },
};

export const authLogger = {
  login: (userId: string, method: string) => {
    logger.info({
      type: 'AUTH_LOGIN',
      userId,
      method,
    }, `User login: ${userId} via ${method}`);
  },

  logout: (userId: string) => {
    logger.info({
      type: 'AUTH_LOGOUT',
      userId,
    }, `User logout: ${userId}`);
  },

  error: (action: string, error: any, userId?: string) => {
    logger.error({
      type: 'AUTH_ERROR',
      action,
      userId,
      error: error.message,
    }, `Auth Error: ${action} - ${error.message}`);
  },
};

export const perfLogger = {
  measure: (operation: string, duration: number, requestId?: string) => {
    logger.info({
      type: 'PERFORMANCE',
      operation,
      duration,
      requestId,
    }, `Performance: ${operation} took ${duration}ms`);
  },
};
