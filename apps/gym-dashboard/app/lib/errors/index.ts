/**
 * Atlas Fitness CRM - Comprehensive Error Handling System
 * 
 * This module exports all error handling components, classes, and utilities
 * for consistent error management across the multi-tenant SaaS platform.
 */

// Error Classes
export * from './error-classes'

// Error Handler
export * from './error-handler'

// Error Logger
export * from './error-logger'

// Error Monitoring
export * from './error-monitoring'

// Error Recovery
export * from './error-recovery'

// User-Friendly Messages
export * from './user-friendly-messages'

// Convenience re-exports for common use cases
export {
  // Main error classes
  AppError as BaseError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  RateLimitError,
  IntegrationError,
  DatabaseError,
  CacheError,
  AIServiceError,
  MultiTenantError
} from './error-classes'

export {
  // Error handler utilities
  globalErrorHandler,
  handleApiError,
  withErrorHandling,
  withApiErrorBoundary
} from './error-handler'

export {
  // Logging utilities
  errorLogger,
  logError,
  logInfo,
  logWarning
} from './error-logger'

export {
  // Monitoring utilities
  errorMonitor,
  processErrorForMonitoring
} from './error-monitoring'

export {
  // Recovery utilities
  globalRecoveryManager,
  withRetry,
  withCircuitBreaker,
  withFallback,
  withRecovery,
  RetryHandler,
  CircuitBreaker,
  FallbackHandler,
  GracefulDegradation,
  RecoveryManager
} from './error-recovery'

export {
  // User-friendly message utilities
  getUserFriendlyMessage,
  getApiErrorMessage,
  getErrorSummary,
  errorMessageConfig
} from './user-friendly-messages'

// Type exports
export type {
  ErrorContext,
  ErrorResponse,
  ErrorHandlerConfig
} from './error-handler'

export type {
  LogLevel,
  LogEntry,
  ErrorStats
} from './error-logger'

export type {
  AlertConfig,
  MonitoringConfig,
  ErrorTrend,
  AlertPayload
} from './error-monitoring'

export type {
  RetryConfig,
  CircuitBreakerConfig,
  FallbackConfig
} from './error-recovery'

export type {
  Locale,
  UserRole,
  UserFriendlyMessage
} from './user-friendly-messages'