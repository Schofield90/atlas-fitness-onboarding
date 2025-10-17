/**
 * Centralized Error Handler for Atlas Fitness CRM
 * 
 * This module provides comprehensive error processing, formatting,
 * and response generation for the multi-tenant SaaS platform.
 */

import { NextRequest, NextResponse } from 'next/server'
import { 
  AppError, 
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  RateLimitError,
  IntegrationError,
  DatabaseError,
  CacheError,
  AIServiceError,
  MultiTenantError,
  isAppError
} from './error-classes'
import { logError } from './error-logger'
import { getUserFriendlyMessage } from './user-friendly-messages'

// Error response interface
export interface ErrorResponse {
  success: false
  error: {
    code: string
    message: string
    userMessage: string
    statusCode: number
    details?: any
    timestamp: string
    requestId?: string
    organizationId?: string
    userId?: string
    retryable?: boolean
    retryAfter?: number
    support?: {
      code: string
      message: string
      contactInfo?: string
    }
  }
  metadata?: {
    correlationId?: string
    traceId?: string
  }
}

// Error context interface
export interface ErrorContext {
  request?: NextRequest
  organizationId?: string
  userId?: string
  userRole?: string
  requestId?: string
  correlationId?: string
  userAgent?: string
  ipAddress?: string
  endpoint?: string
  method?: string
}

// Error handler configuration
export interface ErrorHandlerConfig {
  logErrors?: boolean
  includeStackTrace?: boolean
  sendToMonitoring?: boolean
  userFriendlyMessages?: boolean
  includeContext?: boolean
  generateSupportCode?: boolean
}

const defaultConfig: ErrorHandlerConfig = {
  logErrors: true,
  includeStackTrace: process.env.NODE_ENV === 'development',
  sendToMonitoring: process.env.NODE_ENV === 'production',
  userFriendlyMessages: true,
  includeContext: true,
  generateSupportCode: true
}

/**
 * Process and handle errors consistently across the application
 */
export class ErrorHandler {
  private config: ErrorHandlerConfig

  constructor(config: Partial<ErrorHandlerConfig> = {}) {
    this.config = { ...defaultConfig, ...config }
  }

  /**
   * Handle error and return appropriate response
   */
  async handleError(
    error: unknown, 
    context: ErrorContext = {},
    config?: Partial<ErrorHandlerConfig>
  ): Promise<NextResponse> {
    const handlerConfig = { ...this.config, ...config }
    const processedError = this.processError(error, context)

    // Log error if enabled
    if (handlerConfig.logErrors) {
      await logError(processedError, context)
    }

    // Generate error response
    const errorResponse = this.generateErrorResponse(processedError, context, handlerConfig)

    // Send to monitoring if enabled
    if (handlerConfig.sendToMonitoring) {
      await this.sendToMonitoring(processedError, context)
    }

    return NextResponse.json(errorResponse, { 
      status: processedError.statusCode,
      headers: this.generateErrorHeaders(processedError, context)
    })
  }

  /**
   * Process raw error into structured AppError
   */
  private processError(error: unknown, context: ErrorContext): AppError {
    // Already an AppError - add context and return
    if (isAppError(error)) {
      return this.enrichError(error, context)
    }

    // Handle common JavaScript errors
    if (error instanceof TypeError) {
      return new ValidationError(
        'Invalid data type or structure',
        undefined,
        undefined,
        ['type'],
        { originalError: error.message }
      ).withContext(context)
    }

    if (error instanceof ReferenceError) {
      return new AppError(
        'Internal reference error',
        500,
        'REFERENCE_ERROR',
        false,
        { originalError: error.message }
      ).withContext(context)
    }

    if (error instanceof SyntaxError) {
      return new ValidationError(
        'Invalid JSON or syntax',
        undefined,
        undefined,
        ['syntax'],
        { originalError: error.message }
      ).withContext(context)
    }

    // Handle database-specific errors
    if (this.isDatabaseError(error)) {
      return this.processDatabaseError(error, context)
    }

    // Handle HTTP errors from external services
    if (this.isHTTPError(error)) {
      return this.processHTTPError(error, context)
    }

    // Handle timeout errors
    if (this.isTimeoutError(error)) {
      return new IntegrationError(
        'Operation timed out',
        'unknown',
        'timeout',
        'TIMEOUT',
        true,
        { originalError: String(error) }
      ).withContext(context)
    }

    // Generic error fallback
    const message = error instanceof Error ? error.message : String(error)
    return new AppError(
      message || 'An unexpected error occurred',
      500,
      'INTERNAL_ERROR',
      false,
      { originalError: String(error) }
    ).withContext(context)
  }

  /**
   * Enrich existing AppError with context
   */
  private enrichError(error: AppError, context: ErrorContext): AppError {
    if (context.organizationId && !error.organizationId) {
      error.withOrganization(context.organizationId)
    }
    if (context.userId && !error.userId) {
      error.withUser(context.userId)
    }
    return error.withContext({
      requestId: context.requestId,
      endpoint: context.endpoint,
      method: context.method,
      userAgent: context.userAgent,
      ipAddress: context.ipAddress
    })
  }

  /**
   * Process database-specific errors
   */
  private processDatabaseError(error: any, context: ErrorContext): DatabaseError {
    const errorMessage = error.message || String(error)
    const errorCode = error.code || 'UNKNOWN'

    // PostgreSQL error codes
    if (errorCode === '23505') { // unique_violation
      return DatabaseError.duplicateKey(
        error.table || 'unknown',
        error.constraint || 'unknown_field',
        error.detail,
        { originalError: errorMessage, code: errorCode }
      ).withContext(context)
    }

    if (errorCode === '23503') { // foreign_key_violation
      return DatabaseError.constraintViolation(
        error.table || 'unknown',
        'foreign_key',
        { originalError: errorMessage, code: errorCode }
      ).withContext(context)
    }

    if (errorCode === '42P01') { // undefined_table
      return DatabaseError.queryError(
        'unknown',
        'select',
        { originalError: errorMessage, code: errorCode, reason: 'table_not_found' }
      ).withContext(context)
    }

    // Connection errors
    if (errorMessage.includes('connection') || errorMessage.includes('timeout')) {
      return DatabaseError.connectionError({ 
        originalError: errorMessage, 
        code: errorCode 
      }).withContext(context)
    }

    // Generic database error
    return new DatabaseError(
      'Database operation failed',
      undefined,
      'unknown',
      undefined,
      false,
      { originalError: errorMessage, code: errorCode }
    ).withContext(context)
  }

  /**
   * Process HTTP errors from external services
   */
  private processHTTPError(error: any, context: ErrorContext): IntegrationError {
    const status = error.status || error.statusCode || 500
    const service = error.service || 'external_api'
    const operation = error.operation || context.endpoint || 'unknown'

    if (status >= 500) {
      return IntegrationError.serviceUnavailable(service, {
        originalError: error.message,
        status,
        operation
      }).withContext(context)
    }

    if (status === 429) {
      const resetTime = error.resetTime ? new Date(error.resetTime) : new Date(Date.now() + 60000)
      return RateLimitError.exceeded(
        error.limit || 100,
        resetTime,
        { service, operation, originalError: error.message }
      ).withContext(context)
    }

    return IntegrationError.apiFailure(
      service,
      operation,
      String(status),
      { originalError: error.message, status }
    ).withContext(context)
  }

  /**
   * Generate structured error response
   */
  private generateErrorResponse(
    error: AppError, 
    context: ErrorContext, 
    config: ErrorHandlerConfig
  ): ErrorResponse {
    const supportCode = config.generateSupportCode ? this.generateSupportCode(error, context) : undefined
    const userMessage = config.userFriendlyMessages 
      ? getUserFriendlyMessage(error, context.userRole)
      : error.message

    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code: error.errorCode,
        message: error.message,
        userMessage,
        statusCode: error.statusCode,
        timestamp: error.timestamp.toISOString(),
        requestId: context.requestId,
        organizationId: error.organizationId,
        userId: error.userId
      }
    }

    // Add retryable information
    if (this.isRetryableError(error)) {
      errorResponse.error.retryable = true
      if (error instanceof RateLimitError && error.retryAfter) {
        errorResponse.error.retryAfter = error.retryAfter
      }
    }

    // Add support information
    if (supportCode) {
      errorResponse.error.support = {
        code: supportCode,
        message: `Reference this code when contacting support: ${supportCode}`,
        contactInfo: process.env.SUPPORT_EMAIL || 'support@atlasfitness.com'
      }
    }

    // Add details in development
    if (config.includeStackTrace) {
      errorResponse.error.details = {
        stack: error.stack,
        context: error.context
      }
    }

    // Add metadata
    if (config.includeContext) {
      errorResponse.metadata = {
        correlationId: context.correlationId,
        traceId: context.requestId
      }
    }

    return errorResponse
  }

  /**
   * Generate error headers
   */
  private generateErrorHeaders(error: AppError, context: ErrorContext): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Error-Code': error.errorCode,
      'X-Request-ID': context.requestId || 'unknown'
    }

    // Add retry headers for rate limits
    if (error instanceof RateLimitError) {
      if (error.retryAfter) {
        headers['Retry-After'] = String(error.retryAfter)
      }
      if (error.resetTime) {
        headers['X-RateLimit-Reset'] = String(Math.floor(error.resetTime.getTime() / 1000))
      }
      if (error.limit) {
        headers['X-RateLimit-Limit'] = String(error.limit)
      }
    }

    // Add CORS headers if needed
    if (process.env.NODE_ENV === 'development') {
      headers['Access-Control-Allow-Origin'] = '*'
      headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, PATCH, OPTIONS'
      headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    }

    return headers
  }

  /**
   * Generate support code for user reference
   */
  private generateSupportCode(error: AppError, context: ErrorContext): string {
    const timestamp = Math.floor(error.timestamp.getTime() / 1000).toString(36)
    const errorCode = error.errorCode.slice(0, 3)
    const orgId = error.organizationId?.slice(-4) || 'XXXX'
    const randomSuffix = Math.random().toString(36).substr(2, 4).toUpperCase()
    
    return `${errorCode}-${timestamp}-${orgId}-${randomSuffix}`
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: AppError): boolean {
    if (error instanceof IntegrationError) return error.retryable || false
    if (error instanceof DatabaseError) return error.retryable || false
    if (error instanceof CacheError) return error.retryable || false
    if (error instanceof AIServiceError) return error.retryable || false
    if (error instanceof RateLimitError) return true
    
    // Network and temporary errors are generally retryable
    return error.statusCode >= 500 && error.statusCode < 600
  }

  /**
   * Send error to monitoring service
   */
  private async sendToMonitoring(error: AppError, context: ErrorContext): Promise<void> {
    try {
      // Here you would integrate with your monitoring service
      // Examples: Sentry, DataDog, LogRocket, etc.
      
      if (process.env.SENTRY_DSN) {
        // Sentry integration would go here
        console.log('Sending error to Sentry:', error.toJSON())
      }

      if (process.env.DATADOG_API_KEY) {
        // DataDog integration would go here
        console.log('Sending error to DataDog:', error.toJSON())
      }

      // For now, log to console in production for debugging
      console.error('Error sent to monitoring:', {
        error: error.toJSON(),
        context
      })
    } catch (monitoringError) {
      // Never fail on monitoring errors
      console.error('Failed to send error to monitoring:', monitoringError)
    }
  }

  /**
   * Type guards for error detection
   */
  private isDatabaseError(error: any): boolean {
    return error && (
      error.code && typeof error.code === 'string' && /^\d{5}$/.test(error.code) || // PostgreSQL codes
      error.name === 'PostgresError' ||
      error.constraint ||
      (error.message && error.message.includes('database'))
    )
  }

  private isHTTPError(error: any): boolean {
    return error && (
      (error.status && typeof error.status === 'number') ||
      (error.statusCode && typeof error.statusCode === 'number') ||
      error.response?.status
    )
  }

  private isTimeoutError(error: any): boolean {
    return error && (
      error.code === 'ETIMEDOUT' ||
      error.code === 'ENOTFOUND' ||
      error.code === 'ECONNRESET' ||
      error.code === 'ECONNREFUSED' ||
      (error.message && error.message.toLowerCase().includes('timeout'))
    )
  }
}

// Singleton instance for global use
export const globalErrorHandler = new ErrorHandler()

/**
 * Utility function for handling errors in API routes
 */
export async function handleApiError(
  error: unknown,
  request?: NextRequest,
  context?: Partial<ErrorContext>
): Promise<NextResponse> {
  const fullContext: ErrorContext = {
    request,
    endpoint: request?.nextUrl?.pathname,
    method: request?.method,
    userAgent: request?.headers?.get('user-agent') || undefined,
    ipAddress: request?.headers?.get('x-forwarded-for') || request?.headers?.get('x-real-ip') || undefined,
    requestId: request?.headers?.get('x-request-id') || generateRequestId(),
    ...context
  }

  return globalErrorHandler.handleError(error, fullContext)
}

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Async error wrapper for promise-based operations
 */
export async function withErrorHandling<T>(
  operation: Promise<T>,
  context?: ErrorContext
): Promise<T> {
  try {
    return await operation
  } catch (error) {
    // Transform error but don't handle response here
    // This is for internal error processing only
    throw globalErrorHandler['processError'](error, context || {})
  }
}

/**
 * Error boundary wrapper for API routes
 */
export function withApiErrorBoundary(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>
) {
  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    try {
      return await handler(request, context)
    } catch (error) {
      return handleApiError(error, request)
    }
  }
}