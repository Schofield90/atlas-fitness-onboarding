/**
 * Error Recovery Mechanisms for Atlas Fitness CRM
 * 
 * This module provides automatic error recovery mechanisms including:
 * - Exponential backoff retry
 * - Circuit breaker pattern
 * - Graceful degradation
 * - Fallback strategies
 */

import { AppError, IntegrationError, DatabaseError, CacheError, AIServiceError, isAppError } from './error-classes'
import { errorLogger } from './error-logger'

// Retry configuration
export interface RetryConfig {
  maxAttempts: number
  initialDelayMs: number
  maxDelayMs: number
  backoffMultiplier: number
  retryCondition?: (error: any) => boolean
  onRetry?: (attempt: number, error: any) => void
}

// Circuit breaker configuration
export interface CircuitBreakerConfig {
  failureThreshold: number
  recoveryTimeoutMs: number
  monitoringPeriodMs: number
  onOpen?: () => void
  onHalfOpen?: () => void
  onClose?: () => void
}

// Circuit breaker state
enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

// Circuit breaker stats
interface CircuitStats {
  failures: number
  successes: number
  lastFailureTime?: Date
  lastSuccessTime?: Date
}

// Fallback configuration
export interface FallbackConfig<T> {
  fallbackValue?: T
  fallbackFunction?: () => Promise<T>
  condition?: (error: any) => boolean
}

// Default retry configuration
const defaultRetryConfig: RetryConfig = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  retryCondition: (error) => isRetryableError(error)
}

// Default circuit breaker configuration
const defaultCircuitConfig: CircuitBreakerConfig = {
  failureThreshold: 5,
  recoveryTimeoutMs: 60000,
  monitoringPeriodMs: 10000
}

/**
 * Check if error is retryable
 */
function isRetryableError(error: any): boolean {
  if (isAppError(error)) {
    // Don't retry validation, authentication, or authorization errors
    if (error.statusCode >= 400 && error.statusCode < 500) {
      return false
    }
    
    // Retry server errors and integration failures
    if (error instanceof IntegrationError) return error.retryable !== false
    if (error instanceof DatabaseError) return error.retryable === true
    if (error instanceof CacheError) return error.retryable !== false
    if (error instanceof AIServiceError) return error.retryable !== false
    
    // Retry 5xx errors
    return error.statusCode >= 500
  }
  
  // Check for network errors
  if (error?.code === 'ECONNRESET' || 
      error?.code === 'ETIMEDOUT' || 
      error?.code === 'ENOTFOUND' ||
      error?.code === 'ECONNREFUSED') {
    return true
  }
  
  // Don't retry by default
  return false
}

/**
 * Exponential Backoff Retry Mechanism
 */
export class RetryHandler {
  private config: RetryConfig

  constructor(config: Partial<RetryConfig> = {}) {
    this.config = { ...defaultRetryConfig, ...config }
  }

  /**
   * Execute operation with retry logic
   */
  async execute<T>(
    operation: () => Promise<T>,
    operationName = 'operation'
  ): Promise<T> {
    let lastError: any
    let attempt = 0

    while (attempt < this.config.maxAttempts) {
      attempt++
      
      try {
        const result = await operation()
        
        // Log successful retry if this wasn't the first attempt
        if (attempt > 1) {
          await errorLogger.logInfo(
            `Operation '${operationName}' succeeded after ${attempt} attempts`,
            {},
            { 
              operationName, 
              attempt, 
              totalAttempts: this.config.maxAttempts 
            }
          )
        }
        
        return result
      } catch (error) {
        lastError = error
        
        // Check if we should retry
        if (!this.shouldRetry(error, attempt)) {
          break
        }
        
        // Calculate delay
        const delay = this.calculateDelay(attempt)
        
        // Log retry attempt
        await errorLogger.logWarning(
          `Operation '${operationName}' failed, retrying in ${delay}ms (attempt ${attempt}/${this.config.maxAttempts})`,
          {},
          { 
            operationName, 
            attempt, 
            maxAttempts: this.config.maxAttempts, 
            delay, 
            error: error?.message || String(error) 
          }
        )
        
        // Call retry callback if provided
        if (this.config.onRetry) {
          this.config.onRetry(attempt, error)
        }
        
        // Wait before retrying
        if (attempt < this.config.maxAttempts) {
          await this.delay(delay)
        }
      }
    }
    
    // All retries failed
    const enhancedError = this.enhanceErrorWithRetryInfo(lastError, attempt - 1)
    
    await errorLogger.logError(
      enhancedError,
      {},
      { 
        operationName, 
        totalAttempts: attempt - 1, 
        maxAttempts: this.config.maxAttempts 
      }
    )
    
    throw enhancedError
  }

  /**
   * Check if we should retry the error
   */
  private shouldRetry(error: any, attempt: number): boolean {
    // Don't retry if we've reached max attempts
    if (attempt >= this.config.maxAttempts) {
      return false
    }
    
    // Use custom retry condition if provided
    if (this.config.retryCondition) {
      return this.config.retryCondition(error)
    }
    
    // Use default retry logic
    return isRetryableError(error)
  }

  /**
   * Calculate delay using exponential backoff with jitter
   */
  private calculateDelay(attempt: number): number {
    const exponentialDelay = this.config.initialDelayMs * Math.pow(this.config.backoffMultiplier, attempt - 1)
    const delayWithJitter = exponentialDelay + (Math.random() * 1000) // Add up to 1 second of jitter
    
    return Math.min(delayWithJitter, this.config.maxDelayMs)
  }

  /**
   * Enhance error with retry information
   */
  private enhanceErrorWithRetryInfo(error: any, attempts: number): AppError {
    if (isAppError(error)) {
      return error.withContext({ 
        retryAttempts: attempts, 
        maxRetryAttempts: this.config.maxAttempts,
        retryExhausted: true
      })
    }
    
    return new AppError(
      `Operation failed after ${attempts} retry attempts: ${error?.message || String(error)}`,
      500,
      'RETRY_EXHAUSTED',
      true,
      { 
        originalError: String(error),
        retryAttempts: attempts,
        maxRetryAttempts: this.config.maxAttempts
      }
    )
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

/**
 * Circuit Breaker Pattern Implementation
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED
  private stats: CircuitStats = { failures: 0, successes: 0 }
  private config: CircuitBreakerConfig
  private halfOpenStartTime?: Date

  constructor(private name: string, config: Partial<CircuitBreakerConfig> = {}) {
    this.config = { ...defaultCircuitConfig, ...config }
    
    // Start monitoring
    this.startMonitoring()
  }

  /**
   * Execute operation through circuit breaker
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    // Check if circuit is open
    if (this.state === CircuitState.OPEN) {
      throw new IntegrationError(
        `Circuit breaker '${this.name}' is OPEN`,
        this.name,
        'circuit_breaker',
        'CIRCUIT_OPEN',
        false,
        { 
          circuitState: this.state, 
          failures: this.stats.failures,
          lastFailureTime: this.stats.lastFailureTime
        }
      )
    }

    try {
      const result = await operation()
      
      // Record success
      this.onSuccess()
      
      return result
    } catch (error) {
      // Record failure
      this.onFailure(error)
      
      throw error
    }
  }

  /**
   * Get circuit breaker status
   */
  getStatus() {
    return {
      name: this.name,
      state: this.state,
      failures: this.stats.failures,
      successes: this.stats.successes,
      lastFailureTime: this.stats.lastFailureTime,
      lastSuccessTime: this.stats.lastSuccessTime,
      isOpen: this.state === CircuitState.OPEN,
      isHalfOpen: this.state === CircuitState.HALF_OPEN
    }
  }

  /**
   * Force circuit breaker state (for testing or manual control)
   */
  setState(state: CircuitState) {
    const oldState = this.state
    this.state = state
    
    if (oldState !== state) {
      errorLogger.logInfo(
        `Circuit breaker '${this.name}' state changed from ${oldState} to ${state}`,
        {},
        { circuitBreaker: this.name, oldState, newState: state }
      )
    }
  }

  /**
   * Reset circuit breaker
   */
  reset() {
    this.state = CircuitState.CLOSED
    this.stats = { failures: 0, successes: 0 }
    this.halfOpenStartTime = undefined
  }

  /**
   * Handle successful operation
   */
  private onSuccess() {
    this.stats.successes++
    this.stats.lastSuccessTime = new Date()
    
    // If we're half-open and got a success, close the circuit
    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.CLOSED
      this.stats.failures = 0 // Reset failure count
      
      if (this.config.onClose) {
        this.config.onClose()
      }
      
      errorLogger.logInfo(
        `Circuit breaker '${this.name}' closed after successful operation`,
        {},
        { circuitBreaker: this.name, successes: this.stats.successes }
      )
    }
  }

  /**
   * Handle failed operation
   */
  private onFailure(error: any) {
    this.stats.failures++
    this.stats.lastFailureTime = new Date()
    
    // If we're closed and reached failure threshold, open the circuit
    if (this.state === CircuitState.CLOSED && this.stats.failures >= this.config.failureThreshold) {
      this.state = CircuitState.OPEN
      
      if (this.config.onOpen) {
        this.config.onOpen()
      }
      
      errorLogger.logWarning(
        `Circuit breaker '${this.name}' opened after ${this.stats.failures} failures`,
        {},
        { 
          circuitBreaker: this.name, 
          failures: this.stats.failures,
          threshold: this.config.failureThreshold,
          lastError: error?.message || String(error)
        }
      )
    }
    
    // If we're half-open and got a failure, open the circuit again
    else if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.OPEN
      
      errorLogger.logWarning(
        `Circuit breaker '${this.name}' reopened after failure in half-open state`,
        {},
        { circuitBreaker: this.name, error: error?.message || String(error) }
      )
    }
  }

  /**
   * Start monitoring for recovery
   */
  private startMonitoring() {
    setInterval(() => {
      if (this.state === CircuitState.OPEN) {
        const timeSinceLastFailure = Date.now() - (this.stats.lastFailureTime?.getTime() || 0)
        
        if (timeSinceLastFailure >= this.config.recoveryTimeoutMs) {
          this.state = CircuitState.HALF_OPEN
          this.halfOpenStartTime = new Date()
          
          if (this.config.onHalfOpen) {
            this.config.onHalfOpen()
          }
          
          errorLogger.logInfo(
            `Circuit breaker '${this.name}' moved to half-open state for recovery testing`,
            {},
            { circuitBreaker: this.name, recoveryTimeout: this.config.recoveryTimeoutMs }
          )
        }
      }
    }, this.config.monitoringPeriodMs)
  }
}

/**
 * Fallback Handler
 */
export class FallbackHandler {
  /**
   * Execute operation with fallback
   */
  static async withFallback<T>(
    operation: () => Promise<T>,
    fallback: FallbackConfig<T>,
    operationName = 'operation'
  ): Promise<T> {
    try {
      return await operation()
    } catch (error) {
      // Check if we should use fallback for this error
      if (fallback.condition && !fallback.condition(error)) {
        throw error
      }
      
      // Log fallback usage
      await errorLogger.logWarning(
        `Operation '${operationName}' failed, using fallback`,
        {},
        { 
          operationName,
          error: error?.message || String(error),
          hasFallbackValue: fallback.fallbackValue !== undefined,
          hasFallbackFunction: fallback.fallbackFunction !== undefined
        }
      )
      
      // Use fallback function if provided
      if (fallback.fallbackFunction) {
        try {
          return await fallback.fallbackFunction()
        } catch (fallbackError) {
          errorLogger.logError(
            new AppError(
              `Both operation and fallback failed for '${operationName}'`,
              500,
              'FALLBACK_FAILED',
              true,
              {
                originalError: error?.message || String(error),
                fallbackError: fallbackError?.message || String(fallbackError)
              }
            )
          )
          throw fallbackError
        }
      }
      
      // Use fallback value if provided
      if (fallback.fallbackValue !== undefined) {
        return fallback.fallbackValue
      }
      
      // No fallback available
      throw error
    }
  }
}

/**
 * Graceful Degradation Manager
 */
export class GracefulDegradation {
  private static degradedServices = new Set<string>()
  private static readonly degradationTimeouts = new Map<string, NodeJS.Timeout>()

  /**
   * Mark service as degraded
   */
  static degradeService(serviceName: string, durationMs = 300000) { // 5 minutes default
    this.degradedServices.add(serviceName)
    
    // Clear existing timeout if any
    const existingTimeout = this.degradationTimeouts.get(serviceName)
    if (existingTimeout) {
      clearTimeout(existingTimeout)
    }
    
    // Set recovery timeout
    const timeout = setTimeout(() => {
      this.recoverService(serviceName)
    }, durationMs)
    
    this.degradationTimeouts.set(serviceName, timeout)
    
    errorLogger.logWarning(
      `Service '${serviceName}' marked as degraded`,
      {},
      { serviceName, degradationDuration: durationMs }
    )
  }

  /**
   * Recover service from degraded state
   */
  static recoverService(serviceName: string) {
    this.degradedServices.delete(serviceName)
    
    const timeout = this.degradationTimeouts.get(serviceName)
    if (timeout) {
      clearTimeout(timeout)
      this.degradationTimeouts.delete(serviceName)
    }
    
    errorLogger.logInfo(
      `Service '${serviceName}' recovered from degraded state`,
      {},
      { serviceName }
    )
  }

  /**
   * Check if service is degraded
   */
  static isServiceDegraded(serviceName: string): boolean {
    return this.degradedServices.has(serviceName)
  }

  /**
   * Get list of degraded services
   */
  static getDegradedServices(): string[] {
    return Array.from(this.degradedServices)
  }

  /**
   * Execute with graceful degradation
   */
  static async executeWithDegradation<T>(
    serviceName: string,
    operation: () => Promise<T>,
    degradedOperation?: () => Promise<T>,
    fallbackValue?: T
  ): Promise<T> {
    // If service is degraded, use degraded operation or fallback
    if (this.isServiceDegraded(serviceName)) {
      if (degradedOperation) {
        return await degradedOperation()
      }
      
      if (fallbackValue !== undefined) {
        return fallbackValue
      }
      
      throw new AppError(
        `Service '${serviceName}' is currently degraded`,
        503,
        'SERVICE_DEGRADED',
        true,
        { serviceName, degradedServices: this.getDegradedServices() }
      )
    }
    
    try {
      return await operation()
    } catch (error) {
      // If operation fails, consider degrading the service
      if (this.shouldDegradeService(error, serviceName)) {
        this.degradeService(serviceName)
        
        // Try degraded operation or fallback
        if (degradedOperation) {
          return await degradedOperation()
        }
        
        if (fallbackValue !== undefined) {
          return fallbackValue
        }
      }
      
      throw error
    }
  }

  /**
   * Determine if service should be degraded based on error
   */
  private static shouldDegradeService(error: any, serviceName: string): boolean {
    // Degrade on integration errors or 5xx errors
    if (isAppError(error)) {
      return error instanceof IntegrationError || error.statusCode >= 500
    }
    
    // Degrade on network errors
    return error?.code === 'ECONNRESET' || 
           error?.code === 'ETIMEDOUT' || 
           error?.code === 'ECONNREFUSED'
  }
}

/**
 * Comprehensive Recovery Manager
 * Combines all recovery mechanisms
 */
export class RecoveryManager {
  private retryHandler: RetryHandler
  private circuitBreakers = new Map<string, CircuitBreaker>()

  constructor(
    private retryConfig?: Partial<RetryConfig>,
    private circuitConfig?: Partial<CircuitBreakerConfig>
  ) {
    this.retryHandler = new RetryHandler(retryConfig)
  }

  /**
   * Execute operation with comprehensive recovery
   */
  async executeWithRecovery<T>(
    operationName: string,
    operation: () => Promise<T>,
    options: {
      useRetry?: boolean
      useCircuitBreaker?: boolean
      useFallback?: boolean
      useGracefulDegradation?: boolean
      fallback?: FallbackConfig<T>
      serviceName?: string
    } = {}
  ): Promise<T> {
    const {
      useRetry = true,
      useCircuitBreaker = true,
      useFallback = false,
      useGracefulDegradation = false,
      fallback,
      serviceName = operationName
    } = options

    // Wrap operation with circuit breaker if enabled
    let wrappedOperation = operation
    if (useCircuitBreaker) {
      const circuitBreaker = this.getOrCreateCircuitBreaker(serviceName)
      wrappedOperation = () => circuitBreaker.execute(operation)
    }

    // Wrap with graceful degradation if enabled
    if (useGracefulDegradation) {
      const originalOperation = wrappedOperation
      wrappedOperation = () => GracefulDegradation.executeWithDegradation(
        serviceName,
        originalOperation,
        fallback?.fallbackFunction,
        fallback?.fallbackValue
      )
    }

    // Wrap with retry if enabled
    if (useRetry) {
      const originalOperation = wrappedOperation
      wrappedOperation = () => this.retryHandler.execute(originalOperation, operationName)
    }

    // Execute with fallback if enabled
    if (useFallback && fallback) {
      return FallbackHandler.withFallback(wrappedOperation, fallback, operationName)
    }

    return wrappedOperation()
  }

  /**
   * Get or create circuit breaker for service
   */
  private getOrCreateCircuitBreaker(serviceName: string): CircuitBreaker {
    if (!this.circuitBreakers.has(serviceName)) {
      this.circuitBreakers.set(serviceName, new CircuitBreaker(serviceName, this.circuitConfig))
    }
    return this.circuitBreakers.get(serviceName)!
  }

  /**
   * Get circuit breaker status for all services
   */
  getCircuitBreakerStatus() {
    const status: Record<string, any> = {}
    
    for (const [serviceName, circuitBreaker] of this.circuitBreakers) {
      status[serviceName] = circuitBreaker.getStatus()
    }
    
    return status
  }

  /**
   * Get degraded services status
   */
  getDegradationStatus() {
    return {
      degradedServices: GracefulDegradation.getDegradedServices(),
      totalDegraded: GracefulDegradation.getDegradedServices().length
    }
  }
}

// Export global recovery manager
export const globalRecoveryManager = new RecoveryManager()

// Convenience functions
export const withRetry = (operation: () => Promise<any>, config?: Partial<RetryConfig>) => 
  new RetryHandler(config).execute(operation)

export const withCircuitBreaker = (serviceName: string, operation: () => Promise<any>, config?: Partial<CircuitBreakerConfig>) => 
  new CircuitBreaker(serviceName, config).execute(operation)

export const withFallback = <T>(operation: () => Promise<T>, fallback: FallbackConfig<T>) => 
  FallbackHandler.withFallback(operation, fallback)

export const withRecovery = <T>(operationName: string, operation: () => Promise<T>, options?: any) =>
  globalRecoveryManager.executeWithRecovery(operationName, operation, options)