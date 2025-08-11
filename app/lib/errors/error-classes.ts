/**
 * Centralized Custom Error Classes for Atlas Fitness CRM
 * 
 * This module defines custom error classes for comprehensive error handling
 * across the multi-tenant SaaS platform.
 */

// Base error class with additional metadata
export class AppError extends Error {
  public readonly name: string
  public readonly statusCode: number
  public readonly isOperational: boolean
  public readonly organizationId?: string
  public readonly userId?: string
  public readonly context?: Record<string, any>
  public readonly errorCode: string
  public readonly timestamp: Date

  constructor(
    message: string,
    statusCode: number = 500,
    errorCode: string,
    isOperational: boolean = true,
    context?: Record<string, any>
  ) {
    super(message)
    
    this.name = this.constructor.name
    this.statusCode = statusCode
    this.isOperational = isOperational
    this.errorCode = errorCode
    this.context = context
    this.timestamp = new Date()

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor)
  }

  // Add organizational context
  withOrganization(organizationId: string): this {
    (this as any).organizationId = organizationId
    return this
  }

  // Add user context
  withUser(userId: string): this {
    (this as any).userId = userId
    return this
  }

  // Add additional context
  withContext(context: Record<string, any>): this {
    this.context = { ...this.context, ...context }
    return this
  }

  // Convert to JSON for logging
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      errorCode: this.errorCode,
      organizationId: this.organizationId,
      userId: this.userId,
      context: this.context,
      timestamp: this.timestamp,
      stack: this.stack
    }
  }
}

// Validation Error - For input validation failures
export class ValidationError extends AppError {
  public readonly field?: string
  public readonly value?: any
  public readonly validationRules?: string[]

  constructor(
    message: string,
    field?: string,
    value?: any,
    validationRules?: string[],
    context?: Record<string, any>
  ) {
    super(message, 400, 'VALIDATION_ERROR', true, context)
    this.field = field
    this.value = value
    this.validationRules = validationRules
  }

  static required(field: string, context?: Record<string, any>) {
    return new ValidationError(
      `Field '${field}' is required`,
      field,
      undefined,
      ['required'],
      context
    )
  }

  static invalid(field: string, value: any, expectedFormat: string, context?: Record<string, any>) {
    return new ValidationError(
      `Field '${field}' has invalid format. Expected: ${expectedFormat}`,
      field,
      value,
      ['format'],
      context
    )
  }

  static tooLong(field: string, value: any, maxLength: number, context?: Record<string, any>) {
    return new ValidationError(
      `Field '${field}' exceeds maximum length of ${maxLength} characters`,
      field,
      value,
      ['maxLength'],
      context
    )
  }
}

// Authentication Error - For auth failures
export class AuthenticationError extends AppError {
  public readonly authMethod?: string
  public readonly attemptedResource?: string

  constructor(
    message: string = 'Authentication failed',
    authMethod?: string,
    attemptedResource?: string,
    context?: Record<string, any>
  ) {
    super(message, 401, 'AUTHENTICATION_ERROR', true, context)
    this.authMethod = authMethod
    this.attemptedResource = attemptedResource
  }

  static invalidCredentials(authMethod: string = 'email', context?: Record<string, any>) {
    return new AuthenticationError(
      'Invalid credentials provided',
      authMethod,
      undefined,
      context
    )
  }

  static tokenExpired(context?: Record<string, any>) {
    return new AuthenticationError(
      'Authentication token has expired',
      'token',
      undefined,
      context
    )
  }

  static invalidToken(context?: Record<string, any>) {
    return new AuthenticationError(
      'Invalid authentication token',
      'token',
      undefined,
      context
    )
  }
}

// Authorization Error - For permission issues
export class AuthorizationError extends AppError {
  public readonly requiredRole?: string
  public readonly userRole?: string
  public readonly resource?: string
  public readonly action?: string

  constructor(
    message: string = 'Access denied',
    requiredRole?: string,
    userRole?: string,
    resource?: string,
    action?: string,
    context?: Record<string, any>
  ) {
    super(message, 403, 'AUTHORIZATION_ERROR', true, context)
    this.requiredRole = requiredRole
    this.userRole = userRole
    this.resource = resource
    this.action = action
  }

  static insufficientRole(userRole: string, requiredRole: string, context?: Record<string, any>) {
    return new AuthorizationError(
      `Insufficient role. Required: ${requiredRole}, Current: ${userRole}`,
      requiredRole,
      userRole,
      undefined,
      undefined,
      context
    )
  }

  static resourceForbidden(resource: string, action: string, context?: Record<string, any>) {
    return new AuthorizationError(
      `Access denied for ${action} on ${resource}`,
      undefined,
      undefined,
      resource,
      action,
      context
    )
  }
}

// Not Found Error - For missing resources
export class NotFoundError extends AppError {
  public readonly resource?: string
  public readonly resourceId?: string

  constructor(
    message: string = 'Resource not found',
    resource?: string,
    resourceId?: string,
    context?: Record<string, any>
  ) {
    super(message, 404, 'NOT_FOUND_ERROR', true, context)
    this.resource = resource
    this.resourceId = resourceId
  }

  static resource(resource: string, resourceId: string, context?: Record<string, any>) {
    return new NotFoundError(
      `${resource} with ID '${resourceId}' not found`,
      resource,
      resourceId,
      context
    )
  }

  static endpoint(path: string, context?: Record<string, any>) {
    return new NotFoundError(
      `API endpoint '${path}' not found`,
      'endpoint',
      path,
      context
    )
  }
}

// Rate Limit Error - For rate limiting
export class RateLimitError extends AppError {
  public readonly limit?: number
  public readonly resetTime?: Date
  public readonly retryAfter?: number

  constructor(
    message: string = 'Rate limit exceeded',
    limit?: number,
    resetTime?: Date,
    retryAfter?: number,
    context?: Record<string, any>
  ) {
    super(message, 429, 'RATE_LIMIT_ERROR', true, context)
    this.limit = limit
    this.resetTime = resetTime
    this.retryAfter = retryAfter
  }

  static exceeded(limit: number, resetTime: Date, context?: Record<string, any>) {
    const retryAfter = Math.ceil((resetTime.getTime() - Date.now()) / 1000)
    return new RateLimitError(
      `Rate limit of ${limit} requests exceeded. Try again in ${retryAfter} seconds`,
      limit,
      resetTime,
      retryAfter,
      context
    )
  }
}

// Integration Error - For third-party API failures
export class IntegrationError extends AppError {
  public readonly service?: string
  public readonly operation?: string
  public readonly externalCode?: string
  public readonly retryable?: boolean

  constructor(
    message: string,
    service?: string,
    operation?: string,
    externalCode?: string,
    retryable: boolean = true,
    context?: Record<string, any>
  ) {
    super(message, 502, 'INTEGRATION_ERROR', true, context)
    this.service = service
    this.operation = operation
    this.externalCode = externalCode
    this.retryable = retryable
  }

  static serviceUnavailable(service: string, context?: Record<string, any>) {
    return new IntegrationError(
      `${service} service is currently unavailable`,
      service,
      'status_check',
      'SERVICE_UNAVAILABLE',
      true,
      context
    )
  }

  static apiFailure(service: string, operation: string, externalCode: string, context?: Record<string, any>) {
    return new IntegrationError(
      `${service} API failed for operation '${operation}': ${externalCode}`,
      service,
      operation,
      externalCode,
      true,
      context
    )
  }

  static timeout(service: string, operation: string, context?: Record<string, any>) {
    return new IntegrationError(
      `${service} operation '${operation}' timed out`,
      service,
      operation,
      'TIMEOUT',
      true,
      context
    )
  }
}

// Database Error - For database operations
export class DatabaseError extends AppError {
  public readonly table?: string
  public readonly operation?: string
  public readonly constraint?: string
  public readonly retryable?: boolean

  constructor(
    message: string,
    table?: string,
    operation?: string,
    constraint?: string,
    retryable: boolean = false,
    context?: Record<string, any>
  ) {
    super(message, 500, 'DATABASE_ERROR', true, context)
    this.table = table
    this.operation = operation
    this.constraint = constraint
    this.retryable = retryable
  }

  static connectionError(context?: Record<string, any>) {
    return new DatabaseError(
      'Database connection failed',
      undefined,
      'connect',
      undefined,
      true,
      context
    )
  }

  static queryError(table: string, operation: string, context?: Record<string, any>) {
    return new DatabaseError(
      `Database query failed on table '${table}' for operation '${operation}'`,
      table,
      operation,
      undefined,
      false,
      context
    )
  }

  static constraintViolation(table: string, constraint: string, context?: Record<string, any>) {
    return new DatabaseError(
      `Constraint violation on table '${table}': ${constraint}`,
      table,
      'constraint_check',
      constraint,
      false,
      context
    )
  }

  static duplicateKey(table: string, field: string, value: any, context?: Record<string, any>) {
    return new DatabaseError(
      `Duplicate value '${value}' for field '${field}' in table '${table}'`,
      table,
      'insert',
      `unique_${field}`,
      false,
      context
    )
  }
}

// Cache Error - For Redis failures
export class CacheError extends AppError {
  public readonly cacheKey?: string
  public readonly operation?: string
  public readonly retryable?: boolean

  constructor(
    message: string,
    cacheKey?: string,
    operation?: string,
    retryable: boolean = true,
    context?: Record<string, any>
  ) {
    super(message, 500, 'CACHE_ERROR', true, context)
    this.cacheKey = cacheKey
    this.operation = operation
    this.retryable = retryable
  }

  static connectionError(context?: Record<string, any>) {
    return new CacheError(
      'Cache connection failed',
      undefined,
      'connect',
      true,
      context
    )
  }

  static operationError(operation: string, cacheKey: string, context?: Record<string, any>) {
    return new CacheError(
      `Cache operation '${operation}' failed for key '${cacheKey}'`,
      cacheKey,
      operation,
      true,
      context
    )
  }
}

// AI Service Error - For AI API failures
export class AIServiceError extends AppError {
  public readonly provider?: string
  public readonly model?: string
  public readonly operation?: string
  public readonly retryable?: boolean

  constructor(
    message: string,
    provider?: string,
    model?: string,
    operation?: string,
    retryable: boolean = true,
    context?: Record<string, any>
  ) {
    super(message, 502, 'AI_SERVICE_ERROR', true, context)
    this.provider = provider
    this.model = model
    this.operation = operation
    this.retryable = retryable
  }

  static quotaExceeded(provider: string, context?: Record<string, any>) {
    return new AIServiceError(
      `${provider} quota exceeded`,
      provider,
      undefined,
      'quota_check',
      false,
      context
    )
  }

  static modelUnavailable(provider: string, model: string, context?: Record<string, any>) {
    return new AIServiceError(
      `Model '${model}' unavailable on ${provider}`,
      provider,
      model,
      'model_check',
      true,
      context
    )
  }

  static processingFailed(provider: string, operation: string, context?: Record<string, any>) {
    return new AIServiceError(
      `${provider} failed to process ${operation}`,
      provider,
      undefined,
      operation,
      true,
      context
    )
  }
}

// Multi-Tenant Error - For org isolation violations
export class MultiTenantError extends AppError {
  public readonly violationType?: string
  public readonly attemptedOrganization?: string
  public readonly userOrganization?: string

  constructor(
    message: string = 'Organization access violation',
    violationType?: string,
    attemptedOrganization?: string,
    userOrganization?: string,
    context?: Record<string, any>
  ) {
    super(message, 403, 'MULTI_TENANT_ERROR', true, context)
    this.violationType = violationType
    this.attemptedOrganization = attemptedOrganization
    this.userOrganization = userOrganization
  }

  static crossTenantAccess(
    userOrganization: string,
    attemptedOrganization: string,
    context?: Record<string, any>
  ) {
    return new MultiTenantError(
      'Attempted to access resource from different organization',
      'cross_tenant_access',
      attemptedOrganization,
      userOrganization,
      context
    )
  }

  static missingOrganization(context?: Record<string, any>) {
    return new MultiTenantError(
      'No organization context available',
      'missing_organization',
      undefined,
      undefined,
      context
    )
  }
}

// Error type guards for type-safe error handling
export function isAppError(error: any): error is AppError {
  return error instanceof AppError
}

export function isValidationError(error: any): error is ValidationError {
  return error instanceof ValidationError
}

export function isAuthenticationError(error: any): error is AuthenticationError {
  return error instanceof AuthenticationError
}

export function isAuthorizationError(error: any): error is AuthorizationError {
  return error instanceof AuthorizationError
}

export function isNotFoundError(error: any): error is NotFoundError {
  return error instanceof NotFoundError
}

export function isRateLimitError(error: any): error is RateLimitError {
  return error instanceof RateLimitError
}

export function isIntegrationError(error: any): error is IntegrationError {
  return error instanceof IntegrationError
}

export function isDatabaseError(error: any): error is DatabaseError {
  return error instanceof DatabaseError
}

export function isCacheError(error: any): error is CacheError {
  return error instanceof CacheError
}

export function isAIServiceError(error: any): error is AIServiceError {
  return error instanceof AIServiceError
}

export function isMultiTenantError(error: any): error is MultiTenantError {
  return error instanceof MultiTenantError
}

// Export all error classes
export {
  AppError as BaseError
}