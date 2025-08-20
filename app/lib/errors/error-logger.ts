/**
 * Error Logging System for Atlas Fitness CRM
 * 
 * This module provides comprehensive error logging, tracking, and analytics
 * for the multi-tenant SaaS platform with structured logging and monitoring.
 */

import { AppError } from './error-classes'
import { ErrorContext } from './error-handler'
import { createAdminClient } from '@/app/lib/supabase/admin'

// Log levels
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

// Log entry interface
export interface LogEntry {
  id?: string
  timestamp: Date
  level: LogLevel
  message: string
  errorCode?: string
  organizationId?: string
  userId?: string
  sessionId?: string
  requestId?: string
  correlationId?: string
  
  // Error details
  statusCode?: number
  stack?: string
  context?: Record<string, any>
  
  // Request details
  method?: string
  endpoint?: string
  userAgent?: string
  ipAddress?: string
  
  // Performance metrics
  responseTime?: number
  memoryUsage?: number
  
  // Additional metadata
  environment: string
  version: string
  service: string
  tags?: string[]
}

// Error statistics interface
export interface ErrorStats {
  totalErrors: number
  errorsByCode: Record<string, number>
  errorsByOrganization: Record<string, number>
  errorsByEndpoint: Record<string, number>
  errorsByTimeRange: {
    hour: number
    day: number
    week: number
    month: number
  }
  criticalErrors: number
  retryableErrors: number
  avgResponseTime?: number
}

/**
 * Enhanced Error Logger with multiple outputs and analytics
 */
export class ErrorLogger {
  private static instance: ErrorLogger
  private readonly environment: string
  private readonly version: string
  private readonly service: string

  private constructor() {
    this.environment = process.env.NODE_ENV || 'development'
    this.version = process.env.APP_VERSION || '1.0.0'
    this.service = 'atlas-fitness-crm'
  }

  public static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger()
    }
    return ErrorLogger.instance
  }

  /**
   * Log error with full context and multiple outputs
   */
  async logError(
    error: AppError, 
    context: ErrorContext = {},
    additionalData?: Record<string, any>
  ): Promise<void> {
    const logEntry = this.createLogEntry(error, context, additionalData)

    // Execute all logging operations in parallel
    await Promise.allSettled([
      this.logToConsole(logEntry),
      this.logToDatabase(logEntry),
      this.logToFile(logEntry),
      this.logToExternalService(logEntry)
    ])

    // Update error statistics
    await this.updateErrorStats(logEntry)

    // Send alerts if critical
    if (this.isCriticalError(error)) {
      await this.sendCriticalErrorAlert(logEntry)
    }
  }

  /**
   * Log info message
   */
  async logInfo(
    message: string,
    context: ErrorContext = {},
    additionalData?: Record<string, any>
  ): Promise<void> {
    const logEntry: LogEntry = {
      timestamp: new Date(),
      level: LogLevel.INFO,
      message,
      organizationId: context.organizationId,
      userId: context.userId,
      requestId: context.requestId,
      correlationId: context.correlationId,
      method: context.method,
      endpoint: context.endpoint,
      userAgent: context.userAgent,
      ipAddress: context.ipAddress,
      context: additionalData,
      environment: this.environment,
      version: this.version,
      service: this.service
    }

    await this.logToConsole(logEntry)
    await this.logToDatabase(logEntry)
  }

  /**
   * Log warning message
   */
  async logWarning(
    message: string,
    context: ErrorContext = {},
    additionalData?: Record<string, any>
  ): Promise<void> {
    const logEntry: LogEntry = {
      timestamp: new Date(),
      level: LogLevel.WARN,
      message,
      organizationId: context.organizationId,
      userId: context.userId,
      requestId: context.requestId,
      correlationId: context.correlationId,
      method: context.method,
      endpoint: context.endpoint,
      userAgent: context.userAgent,
      ipAddress: context.ipAddress,
      context: additionalData,
      environment: this.environment,
      version: this.version,
      service: this.service
    }

    await this.logToConsole(logEntry)
    await this.logToDatabase(logEntry)
  }

  /**
   * Create structured log entry
   */
  private createLogEntry(
    error: AppError,
    context: ErrorContext,
    additionalData?: Record<string, any>
  ): LogEntry {
    return {
      timestamp: error.timestamp,
      level: LogLevel.ERROR,
      message: error.message,
      errorCode: error.errorCode,
      statusCode: error.statusCode,
      organizationId: error.organizationId || context.organizationId,
      userId: error.userId || context.userId,
      requestId: context.requestId,
      correlationId: context.correlationId,
      stack: error.stack,
      context: { ...error.context, ...additionalData },
      method: context.method,
      endpoint: context.endpoint,
      userAgent: context.userAgent,
      ipAddress: context.ipAddress,
      responseTime: additionalData?.responseTime,
      memoryUsage: this.getMemoryUsage(),
      environment: this.environment,
      version: this.version,
      service: this.service,
      tags: this.generateTags(error, context)
    }
  }

  /**
   * Log to console with structured format
   */
  private async logToConsole(entry: LogEntry): Promise<void> {
    const logData = {
      timestamp: entry.timestamp.toISOString(),
      level: entry.level,
      message: entry.message,
      errorCode: entry.errorCode,
      organizationId: entry.organizationId,
      userId: entry.userId,
      requestId: entry.requestId,
      endpoint: entry.endpoint,
      method: entry.method,
      statusCode: entry.statusCode,
      ...(entry.level === LogLevel.ERROR && { stack: entry.stack }),
      context: entry.context
    }

    switch (entry.level) {
      case LogLevel.ERROR:
        console.error('🚨 ERROR:', logData)
        break
      case LogLevel.WARN:
        console.warn('⚠️  WARN:', logData)
        break
      case LogLevel.INFO:
        console.info('ℹ️  INFO:', logData)
        break
      case LogLevel.DEBUG:
        console.debug('🔍 DEBUG:', logData)
        break
    }
  }

  /**
   * Log to database for persistence and analytics
   */
  private async logToDatabase(entry: LogEntry): Promise<void> {
    try {
      const supabase = createAdminClient()
      
      const dbEntry = {
        timestamp: entry.timestamp.toISOString(),
        level: entry.level,
        message: entry.message,
        error_code: entry.errorCode,
        status_code: entry.statusCode,
        organization_id: entry.organizationId,
        user_id: entry.userId,
        session_id: entry.sessionId,
        request_id: entry.requestId,
        correlation_id: entry.correlationId,
        stack_trace: entry.stack,
        context: entry.context,
        method: entry.method,
        endpoint: entry.endpoint,
        user_agent: entry.userAgent,
        ip_address: entry.ipAddress,
        response_time: entry.responseTime,
        memory_usage: entry.memoryUsage,
        environment: entry.environment,
        version: entry.version,
        service: entry.service,
        tags: entry.tags
      }

      await supabase.from('error_logs').insert(dbEntry)
    } catch (error) {
      // Never fail on logging errors - just log to console
      console.error('Failed to log to database:', error)
    }
  }

  /**
   * Log to file system (in development or when specified)
   */
  private async logToFile(entry: LogEntry): Promise<void> {
    // Skip file logging in production or on client-side
    if (this.environment === 'production' || typeof window !== 'undefined') return

    try {
      // Only attempt to use fs on server-side
      if (typeof window === 'undefined') {
        const fs = await import('fs/promises')
        const path = await import('path')
      
        const logDir = path.join(process.cwd(), 'logs')
        const logFile = path.join(logDir, `errors-${new Date().toISOString().split('T')[0]}.log`)
        
        // Ensure logs directory exists
        try {
          await fs.access(logDir)
        } catch {
          await fs.mkdir(logDir, { recursive: true })
        }
        
        const logLine = JSON.stringify(entry) + '\n'
        await fs.appendFile(logFile, logLine)
      }
    } catch (error) {
      console.error('Failed to log to file:', error)
    }
  }

  /**
   * Log to external monitoring services
   */
  private async logToExternalService(entry: LogEntry): Promise<void> {
    try {
      // Sentry integration
      if (process.env.SENTRY_DSN && entry.level === LogLevel.ERROR) {
        await this.sendToSentry(entry)
      }

      // DataDog integration
      if (process.env.DATADOG_API_KEY) {
        await this.sendToDataDog(entry)
      }

      // Custom webhook integration
      if (process.env.ERROR_WEBHOOK_URL) {
        await this.sendToWebhook(entry)
      }
    } catch (error) {
      console.error('Failed to send to external service:', error)
    }
  }

  /**
   * Send error to Sentry
   */
  private async sendToSentry(entry: LogEntry): Promise<void> {
    // Implementation would depend on Sentry SDK
    // This is a placeholder for the integration
    console.log('Sending to Sentry:', {
      message: entry.message,
      errorCode: entry.errorCode,
      organizationId: entry.organizationId,
      requestId: entry.requestId
    })
  }

  /**
   * Send error to DataDog
   */
  private async sendToDataDog(entry: LogEntry): Promise<void> {
    try {
      const response = await fetch('https://http-intake.logs.datadoghq.com/v1/input/' + process.env.DATADOG_API_KEY, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...entry,
          ddsource: 'atlas-fitness-crm',
          ddtags: entry.tags?.join(',')
        })
      })

      if (!response.ok) {
        throw new Error(`DataDog API error: ${response.status}`)
      }
    } catch (error) {
      console.error('Failed to send to DataDog:', error)
    }
  }

  /**
   * Send to custom webhook
   */
  private async sendToWebhook(entry: LogEntry): Promise<void> {
    try {
      await fetch(process.env.ERROR_WEBHOOK_URL!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.ERROR_WEBHOOK_TOKEN || ''}`
        },
        body: JSON.stringify({
          service: 'atlas-fitness-crm',
          environment: entry.environment,
          error: entry
        })
      })
    } catch (error) {
      console.error('Failed to send to webhook:', error)
    }
  }

  /**
   * Update error statistics in database
   */
  private async updateErrorStats(entry: LogEntry): Promise<void> {
    if (entry.level !== LogLevel.ERROR) return

    try {
      const supabase = createAdminClient()
      const today = new Date().toISOString().split('T')[0]
      
      // Update daily error statistics
      await supabase.rpc('update_error_stats', {
        p_date: today,
        p_organization_id: entry.organizationId,
        p_error_code: entry.errorCode,
        p_endpoint: entry.endpoint,
        p_status_code: entry.statusCode,
        p_response_time: entry.responseTime
      })
    } catch (error) {
      console.error('Failed to update error stats:', error)
    }
  }

  /**
   * Check if error is critical and requires immediate attention
   */
  private isCriticalError(error: AppError): boolean {
    const criticalCodes = [
      'DATABASE_ERROR',
      'AUTHENTICATION_ERROR',
      'MULTI_TENANT_ERROR'
    ]
    
    return criticalCodes.includes(error.errorCode) || 
           error.statusCode >= 500 ||
           !error.isOperational
  }

  /**
   * Send critical error alerts
   */
  private async sendCriticalErrorAlert(entry: LogEntry): Promise<void> {
    try {
      // Send email alert
      if (process.env.ALERT_EMAIL) {
        await this.sendEmailAlert(entry)
      }

      // Send Slack alert
      if (process.env.SLACK_WEBHOOK_URL) {
        await this.sendSlackAlert(entry)
      }

      // Send SMS alert (for production critical errors)
      if (process.env.ALERT_PHONE && this.environment === 'production') {
        await this.sendSMSAlert(entry)
      }
    } catch (error) {
      console.error('Failed to send critical error alert:', error)
    }
  }

  /**
   * Send email alert for critical errors
   */
  private async sendEmailAlert(entry: LogEntry): Promise<void> {
    // Implementation would integrate with your email service
    console.log('Sending email alert for critical error:', {
      to: process.env.ALERT_EMAIL,
      subject: `Critical Error in ${entry.service}`,
      errorCode: entry.errorCode,
      organizationId: entry.organizationId,
      requestId: entry.requestId
    })
  }

  /**
   * Send Slack alert for critical errors
   */
  private async sendSlackAlert(entry: LogEntry): Promise<void> {
    try {
      await fetch(process.env.SLACK_WEBHOOK_URL!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `🚨 Critical Error in ${entry.service}`,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Critical Error Detected*\n*Error:* ${entry.message}\n*Code:* ${entry.errorCode}\n*Organization:* ${entry.organizationId}\n*Request:* ${entry.requestId}`
              }
            }
          ]
        })
      })
    } catch (error) {
      console.error('Failed to send Slack alert:', error)
    }
  }

  /**
   * Send SMS alert for critical errors
   */
  private async sendSMSAlert(entry: LogEntry): Promise<void> {
    // Implementation would integrate with Twilio or similar
    console.log('Sending SMS alert for critical error:', {
      to: process.env.ALERT_PHONE,
      message: `Critical error in ${entry.service}: ${entry.errorCode} - ${entry.requestId}`
    })
  }

  /**
   * Generate tags for categorizing errors
   */
  private generateTags(error: AppError, context: ErrorContext): string[] {
    const tags: string[] = [
      `error_code:${error.errorCode}`,
      `status_code:${error.statusCode}`,
      `environment:${this.environment}`,
      `service:${this.service}`
    ]

    if (error.organizationId) {
      tags.push(`organization:${error.organizationId}`)
    }

    if (context.endpoint) {
      tags.push(`endpoint:${context.endpoint.replace(/\/\d+/g, '/:id')}`)
    }

    if (context.method) {
      tags.push(`method:${context.method}`)
    }

    if (error.isOperational) {
      tags.push('operational:true')
    } else {
      tags.push('operational:false', 'critical:true')
    }

    return tags
  }

  /**
   * Get current memory usage
   */
  private getMemoryUsage(): number {
    try {
      return process.memoryUsage().heapUsed
    } catch {
      return 0
    }
  }

  /**
   * Get error statistics for monitoring dashboard
   */
  async getErrorStats(
    organizationId?: string,
    timeRange: 'hour' | 'day' | 'week' | 'month' = 'day'
  ): Promise<ErrorStats> {
    try {
      const supabase = createAdminClient()
      
      let query = supabase.from('error_logs')
        .select('error_code, organization_id, endpoint, timestamp')
        .eq('level', 'error')
        .gte('timestamp', this.getTimeRangeStart(timeRange))

      if (organizationId) {
        query = query.eq('organization_id', organizationId)
      }

      const { data: errors } = await query

      if (!errors) return this.getEmptyStats()

      return this.calculateStats(errors, timeRange)
    } catch (error) {
      console.error('Failed to get error stats:', error)
      return this.getEmptyStats()
    }
  }

  /**
   * Calculate error statistics from raw data
   */
  private calculateStats(errors: any[], timeRange: string): ErrorStats {
    const stats: ErrorStats = {
      totalErrors: errors.length,
      errorsByCode: {},
      errorsByOrganization: {},
      errorsByEndpoint: {},
      errorsByTimeRange: {
        hour: 0,
        day: 0,
        week: 0,
        month: 0
      },
      criticalErrors: 0,
      retryableErrors: 0
    }

    const now = new Date()
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    errors.forEach(error => {
      const timestamp = new Date(error.timestamp)
      
      // Count by error code
      stats.errorsByCode[error.error_code] = (stats.errorsByCode[error.error_code] || 0) + 1
      
      // Count by organization
      stats.errorsByOrganization[error.organization_id] = (stats.errorsByOrganization[error.organization_id] || 0) + 1
      
      // Count by endpoint
      stats.errorsByEndpoint[error.endpoint] = (stats.errorsByEndpoint[error.endpoint] || 0) + 1
      
      // Count by time range
      if (timestamp > oneHourAgo) stats.errorsByTimeRange.hour++
      if (timestamp > oneDayAgo) stats.errorsByTimeRange.day++
      if (timestamp > oneWeekAgo) stats.errorsByTimeRange.week++
      if (timestamp > oneMonthAgo) stats.errorsByTimeRange.month++
      
      // Count critical errors
      if (this.isCriticalErrorCode(error.error_code)) {
        stats.criticalErrors++
      }
    })

    return stats
  }

  /**
   * Get empty statistics object
   */
  private getEmptyStats(): ErrorStats {
    return {
      totalErrors: 0,
      errorsByCode: {},
      errorsByOrganization: {},
      errorsByEndpoint: {},
      errorsByTimeRange: {
        hour: 0,
        day: 0,
        week: 0,
        month: 0
      },
      criticalErrors: 0,
      retryableErrors: 0
    }
  }

  /**
   * Get start date for time range
   */
  private getTimeRangeStart(timeRange: string): string {
    const now = new Date()
    switch (timeRange) {
      case 'hour':
        return new Date(now.getTime() - 60 * 60 * 1000).toISOString()
      case 'day':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
      case 'month':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
      default:
        return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
    }
  }

  /**
   * Check if error code is critical
   */
  private isCriticalErrorCode(errorCode: string): boolean {
    const criticalCodes = [
      'DATABASE_ERROR',
      'AUTHENTICATION_ERROR',
      'MULTI_TENANT_ERROR',
      'INTERNAL_ERROR'
    ]
    return criticalCodes.includes(errorCode)
  }
}

// Export singleton instance
export const errorLogger = ErrorLogger.getInstance()

// Convenience function for logging errors
export async function logError(
  error: AppError, 
  context: ErrorContext = {},
  additionalData?: Record<string, any>
): Promise<void> {
  return errorLogger.logError(error, context, additionalData)
}

// Convenience function for logging info
export async function logInfo(
  message: string,
  context: ErrorContext = {},
  additionalData?: Record<string, any>
): Promise<void> {
  return errorLogger.logInfo(message, context, additionalData)
}

// Convenience function for logging warnings
export async function logWarning(
  message: string,
  context: ErrorContext = {},
  additionalData?: Record<string, any>
): Promise<void> {
  return errorLogger.logWarning(message, context, additionalData)
}