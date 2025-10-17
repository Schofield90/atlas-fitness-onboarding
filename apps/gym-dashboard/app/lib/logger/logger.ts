import { headers } from 'next/headers'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogContext {
  userId?: string
  organizationId?: string
  route?: string
  method?: string
  requestId?: string
  duration?: number
  statusCode?: number
  error?: Error
  metadata?: Record<string, any>
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development'
  private logLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info'
  
  private readonly logLevels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
  }
  
  /**
   * Sanitize sensitive data from logs
   */
  private sanitize(data: any): any {
    if (!data) return data
    
    // List of sensitive keys to redact
    const sensitiveKeys = [
      'password',
      'token',
      'api_key',
      'apiKey',
      'secret',
      'authorization',
      'cookie',
      'session',
      'credit_card',
      'creditCard',
      'ssn',
      'pin'
    ]
    
    if (typeof data === 'string') {
      // Redact JWT tokens
      return data.replace(/Bearer\s+[\w-]+\.[\w-]+\.[\w-]+/gi, 'Bearer [REDACTED]')
    }
    
    if (typeof data !== 'object') return data
    
    const sanitized = Array.isArray(data) ? [...data] : { ...data }
    
    for (const key in sanitized) {
      const lowerKey = key.toLowerCase()
      
      // Check if key contains sensitive words
      if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
        sanitized[key] = '[REDACTED]'
      } else if (typeof sanitized[key] === 'object') {
        sanitized[key] = this.sanitize(sanitized[key])
      }
    }
    
    return sanitized
  }
  
  /**
   * Generate a unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  
  /**
   * Get request context from headers
   */
  private async getRequestContext(): Promise<Partial<LogContext>> {
    try {
      const headersList = await headers()
      return {
        requestId: headersList.get('x-request-id') || this.generateRequestId(),
        route: headersList.get('x-pathname') || undefined,
        method: headersList.get('x-method') || undefined
      }
    } catch {
      return {
        requestId: this.generateRequestId()
      }
    }
  }
  
  /**
   * Format log message based on environment
   */
  private formatMessage(
    level: LogLevel,
    message: string,
    context?: LogContext
  ): string {
    const timestamp = new Date().toISOString()
    const sanitizedContext = this.sanitize(context)
    
    if (this.isDevelopment) {
      // Colorful, readable format for development
      const colors = {
        debug: '\x1b[36m', // Cyan
        info: '\x1b[32m',  // Green
        warn: '\x1b[33m',  // Yellow
        error: '\x1b[31m'  // Red
      }
      const reset = '\x1b[0m'
      const color = colors[level]
      
      let output = `${color}[${level.toUpperCase()}]${reset} ${timestamp} - ${message}`
      
      if (sanitizedContext && Object.keys(sanitizedContext).length > 0) {
        output += '\n' + JSON.stringify(sanitizedContext, null, 2)
      }
      
      return output
    } else {
      // Structured JSON for production (easy to parse by log aggregators)
      return JSON.stringify({
        level,
        timestamp,
        message,
        ...sanitizedContext
      })
    }
  }
  
  /**
   * Check if should log based on level
   */
  private shouldLog(level: LogLevel): boolean {
    return this.logLevels[level] >= this.logLevels[this.logLevel]
  }
  
  /**
   * Core logging method
   */
  private log(
    level: LogLevel,
    message: string,
    context?: LogContext
  ): void {
    if (!this.shouldLog(level)) return
    
    const formattedMessage = this.formatMessage(level, message, context)
    
    switch (level) {
      case 'debug':
        console.debug(formattedMessage)
        break
      case 'info':
        console.log(formattedMessage)
        break
      case 'warn':
        console.warn(formattedMessage)
        break
      case 'error':
        console.error(formattedMessage)
        // In production, you might want to send to error tracking service
        if (!this.isDevelopment && context?.error) {
          // TODO: Send to Sentry or similar
          // Sentry.captureException(context.error, { extra: context })
        }
        break
    }
  }
  
  /**
   * Public logging methods
   */
  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context)
  }
  
  info(message: string, context?: LogContext): void {
    this.log('info', message, context)
  }
  
  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context)
  }
  
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorObj = error instanceof Error ? error : new Error(String(error))
    
    this.log('error', message, {
      ...context,
      error: errorObj,
      metadata: {
        ...context?.metadata,
        errorName: errorObj.name,
        errorMessage: errorObj.message,
        errorStack: this.isDevelopment ? errorObj.stack : undefined
      }
    })
  }
  
  /**
   * Log API requests
   */
  async logRequest(
    request: Request,
    response: Response | null,
    duration: number,
    error?: Error
  ): Promise<void> {
    const url = new URL(request.url)
    const context = await this.getRequestContext()
    
    const logContext: LogContext = {
      ...context,
      route: url.pathname,
      method: request.method,
      duration,
      statusCode: response?.status,
      metadata: {
        query: Object.fromEntries(url.searchParams),
        userAgent: request.headers.get('user-agent'),
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
      }
    }
    
    if (error) {
      this.error(`API Error: ${request.method} ${url.pathname}`, error, logContext)
    } else if (response && response.status >= 400) {
      this.warn(`API Client Error: ${request.method} ${url.pathname}`, logContext)
    } else {
      this.info(`API Request: ${request.method} ${url.pathname}`, logContext)
    }
  }
  
  /**
   * Create a child logger with preset context
   */
  child(context: LogContext): LoggerInstance {
    return {
      debug: (message: string, additionalContext?: LogContext) => 
        this.debug(message, { ...context, ...additionalContext }),
      info: (message: string, additionalContext?: LogContext) => 
        this.info(message, { ...context, ...additionalContext }),
      warn: (message: string, additionalContext?: LogContext) => 
        this.warn(message, { ...context, ...additionalContext }),
      error: (message: string, error?: Error | unknown, additionalContext?: LogContext) => 
        this.error(message, error, { ...context, ...additionalContext })
    }
  }
}

// Logger instance interface for child loggers
interface LoggerInstance {
  debug(message: string, context?: LogContext): void
  info(message: string, context?: LogContext): void
  warn(message: string, context?: LogContext): void
  error(message: string, error?: Error | unknown, context?: LogContext): void
}

// Export singleton instance
export const logger = new Logger()

// Export types
export type { LoggerInstance }