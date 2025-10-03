/**
 * User-Friendly Error Messages for Atlas Fitness CRM
 * 
 * This module provides user-friendly error messages with localization support,
 * converting technical errors into actionable messages for different user roles.
 */

import { AppError, ValidationError, AuthenticationError, AuthorizationError, NotFoundError, RateLimitError, IntegrationError, DatabaseError, CacheError, AIServiceError, MultiTenantError } from './error-classes'

// Supported locales
export type Locale = 'en' | 'es' | 'fr' | 'de' | 'it' | 'pt'

// User roles for context-aware messages
export type UserRole = 'owner' | 'admin' | 'staff' | 'viewer' | 'client'

// Message configuration
interface MessageConfig {
  showTechnicalDetails: boolean
  includeRecoverySteps: boolean
  includeSupportInfo: boolean
  locale: Locale
  userRole: UserRole
}

// Recovery action
interface RecoveryAction {
  action: string
  description: string
  url?: string
  priority: 'high' | 'medium' | 'low'
}

// User-friendly message
export interface UserFriendlyMessage {
  title: string
  message: string
  recoveryActions?: RecoveryAction[]
  supportCode?: string
  learnMoreUrl?: string
  technicalDetails?: string
}

// Default message configuration
const defaultConfig: MessageConfig = {
  showTechnicalDetails: process.env.NODE_ENV === 'development',
  includeRecoverySteps: true,
  includeSupportInfo: true,
  locale: 'en',
  userRole: 'staff'
}

// Localized messages
const messages: Record<Locale, Record<string, any>> = {
  en: {
    // Validation errors
    VALIDATION_ERROR: {
      title: 'Invalid Information',
      message: 'Please check the information you entered and try again.',
      actions: [
        { action: 'check_required', description: 'Make sure all required fields are filled out', priority: 'high' },
        { action: 'verify_format', description: 'Check that email addresses and phone numbers are properly formatted', priority: 'medium' }
      ]
    },
    
    // Authentication errors
    AUTHENTICATION_ERROR: {
      title: 'Login Required',
      message: 'You need to log in to access this feature.',
      actions: [
        { action: 'login', description: 'Sign in to your account', url: '/login', priority: 'high' },
        { action: 'reset_password', description: 'Reset your password if you\'ve forgotten it', url: '/auth/reset', priority: 'medium' }
      ]
    },
    
    // Authorization errors
    AUTHORIZATION_ERROR: {
      title: 'Access Denied',
      message: 'You don\'t have permission to perform this action.',
      actions: [
        { action: 'contact_admin', description: 'Contact your administrator to request access', priority: 'high' },
        { action: 'check_role', description: 'Make sure you\'re using the correct account', priority: 'medium' }
      ]
    },
    
    // Not found errors
    NOT_FOUND_ERROR: {
      title: 'Not Found',
      message: 'The item you\'re looking for couldn\'t be found.',
      actions: [
        { action: 'check_url', description: 'Check that the web address is correct', priority: 'high' },
        { action: 'search', description: 'Try searching for what you need', priority: 'medium' },
        { action: 'go_home', description: 'Go back to the dashboard', url: '/dashboard', priority: 'low' }
      ]
    },
    
    // Rate limit errors
    RATE_LIMIT_ERROR: {
      title: 'Too Many Requests',
      message: 'You\'ve made too many requests. Please wait a moment and try again.',
      actions: [
        { action: 'wait', description: 'Wait a few moments before trying again', priority: 'high' },
        { action: 'upgrade', description: 'Upgrade your plan for higher limits', url: '/billing', priority: 'low' }
      ]
    },
    
    // Integration errors
    INTEGRATION_ERROR: {
      title: 'Service Temporarily Unavailable',
      message: 'One of our services is temporarily unavailable. We\'re working to fix this.',
      actions: [
        { action: 'retry', description: 'Try again in a few minutes', priority: 'high' },
        { action: 'check_status', description: 'Check our status page for updates', url: '/status', priority: 'medium' }
      ]
    },
    
    // Database errors
    DATABASE_ERROR: {
      title: 'Data Error',
      message: 'There was a problem saving your information. Please try again.',
      actions: [
        { action: 'retry', description: 'Try saving again', priority: 'high' },
        { action: 'contact_support', description: 'Contact support if the problem continues', priority: 'medium' }
      ]
    },
    
    // Cache errors
    CACHE_ERROR: {
      title: 'Loading Issue',
      message: 'There was a problem loading some information. It should work normally now.',
      actions: [
        { action: 'refresh', description: 'Refresh the page', priority: 'high' }
      ]
    },
    
    // AI service errors
    AI_SERVICE_ERROR: {
      title: 'AI Service Unavailable',
      message: 'Our AI features are temporarily unavailable. Other features work normally.',
      actions: [
        { action: 'try_later', description: 'Try AI features again later', priority: 'high' },
        { action: 'manual_process', description: 'Complete this task manually for now', priority: 'medium' }
      ]
    },
    
    // Multi-tenant errors
    MULTI_TENANT_ERROR: {
      title: 'Access Violation',
      message: 'You can only access data from your own organization.',
      actions: [
        { action: 'check_organization', description: 'Make sure you\'re in the right organization', priority: 'high' },
        { action: 'switch_org', description: 'Switch to the correct organization', priority: 'medium' }
      ]
    },
    
    // Generic errors
    INTERNAL_ERROR: {
      title: 'Something Went Wrong',
      message: 'An unexpected error occurred. Our team has been notified.',
      actions: [
        { action: 'retry', description: 'Try again', priority: 'high' },
        { action: 'contact_support', description: 'Contact support if this keeps happening', priority: 'medium' }
      ]
    }
  },
  
  es: {
    VALIDATION_ERROR: {
      title: 'Información Inválida',
      message: 'Por favor verifica la información que ingresaste e intenta de nuevo.',
      actions: [
        { action: 'check_required', description: 'Asegúrate de llenar todos los campos requeridos', priority: 'high' },
        { action: 'verify_format', description: 'Verifica que los correos y teléfonos tengan el formato correcto', priority: 'medium' }
      ]
    },
    
    AUTHENTICATION_ERROR: {
      title: 'Inicio de Sesión Requerido',
      message: 'Necesitas iniciar sesión para acceder a esta función.',
      actions: [
        { action: 'login', description: 'Inicia sesión en tu cuenta', url: '/login', priority: 'high' },
        { action: 'reset_password', description: 'Restablece tu contraseña si la olvidaste', url: '/auth/reset', priority: 'medium' }
      ]
    }
  },
  
  fr: {
    VALIDATION_ERROR: {
      title: 'Informations Invalides',
      message: 'Veuillez vérifier les informations saisies et réessayer.',
      actions: [
        { action: 'check_required', description: 'Assurez-vous que tous les champs requis sont remplis', priority: 'high' },
        { action: 'verify_format', description: 'Vérifiez le format des adresses e-mail et numéros de téléphone', priority: 'medium' }
      ]
    }
  },
  
  de: {
    VALIDATION_ERROR: {
      title: 'Ungültige Informationen',
      message: 'Bitte überprüfen Sie die eingegebenen Informationen und versuchen Sie es erneut.',
      actions: [
        { action: 'check_required', description: 'Stellen Sie sicher, dass alle Pflichtfelder ausgefüllt sind', priority: 'high' }
      ]
    }
  },
  
  it: {
    VALIDATION_ERROR: {
      title: 'Informazioni Non Valide',
      message: 'Controlla le informazioni inserite e riprova.',
      actions: [
        { action: 'check_required', description: 'Assicurati che tutti i campi obbligatori siano compilati', priority: 'high' }
      ]
    }
  },
  
  pt: {
    VALIDATION_ERROR: {
      title: 'Informações Inválidas',
      message: 'Verifique as informações inseridas e tente novamente.',
      actions: [
        { action: 'check_required', description: 'Certifique-se de preencher todos os campos obrigatórios', priority: 'high' }
      ]
    }
  }
}

// Role-specific message customizations
const roleCustomizations: Record<UserRole, Record<string, Partial<UserFriendlyMessage>>> = {
  owner: {
    AUTHORIZATION_ERROR: {
      message: 'This action is restricted. As an owner, you might need to adjust permissions or contact support.'
    },
    RATE_LIMIT_ERROR: {
      message: 'Your organization has reached its usage limit. Consider upgrading your plan for higher limits.'
    }
  },
  
  admin: {
    DATABASE_ERROR: {
      message: 'There was a database issue. Check the admin logs or contact technical support.'
    },
    INTEGRATION_ERROR: {
      message: 'An external service integration failed. Check the integrations page for status.'
    }
  },
  
  staff: {
    AUTHORIZATION_ERROR: {
      message: 'You don\'t have permission for this action. Contact your admin if you need access.'
    }
  },
  
  viewer: {
    AUTHORIZATION_ERROR: {
      message: 'This is a view-only account. Contact your administrator to request additional permissions.'
    }
  },
  
  client: {
    AUTHENTICATION_ERROR: {
      title: 'Please Sign In',
      message: 'Sign in to your client portal to access your information.'
    },
    NOT_FOUND_ERROR: {
      message: 'The information you\'re looking for isn\'t available or doesn\'t belong to your account.'
    }
  }
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyMessage(
  error: AppError,
  userRole: UserRole = 'staff',
  locale: Locale = 'en',
  config?: Partial<MessageConfig>
): UserFriendlyMessage {
  const fullConfig: MessageConfig = {
    ...defaultConfig,
    userRole,
    locale,
    ...config
  }

  // Get base message template
  const localeMessages = messages[locale] || messages.en
  const baseMessage = localeMessages[error.errorCode] || localeMessages.INTERNAL_ERROR
  
  // Apply role-specific customizations
  const roleCustomization = roleCustomizations[userRole]?.[error.errorCode] || {}
  
  // Build user-friendly message
  const userMessage: UserFriendlyMessage = {
    title: roleCustomization.title || baseMessage.title,
    message: roleCustomization.message || baseMessage.message,
    recoveryActions: fullConfig.includeRecoverySteps 
      ? (roleCustomization.recoveryActions || baseMessage.actions || [])
      : undefined
  }

  // Add specific error details for certain error types
  if (error instanceof ValidationError && error.field) {
    userMessage.message = getValidationMessage(error, locale)
  } else if (error instanceof RateLimitError && error.retryAfter) {
    userMessage.message = getRateLimitMessage(error, locale)
  } else if (error instanceof NotFoundError && error.resource) {
    userMessage.message = getNotFoundMessage(error, locale)
  }

  // Add technical details if enabled
  if (fullConfig.showTechnicalDetails) {
    userMessage.technicalDetails = getTechnicalDetails(error)
  }

  // Add support information
  if (fullConfig.includeSupportInfo) {
    userMessage.supportCode = generateSupportCode(error)
    userMessage.learnMoreUrl = getLearnMoreUrl(error.errorCode)
  }

  return userMessage
}

/**
 * Get validation-specific message
 */
function getValidationMessage(error: ValidationError, locale: Locale): string {
  const field = error.field || 'field'
  const localeMessages = messages[locale] || messages.en
  
  if (error.validationRules?.includes('required')) {
    return localeMessages.validation?.required 
      ? localeMessages.validation.required.replace('{field}', field)
      : `The ${field} field is required.`
  }
  
  if (error.validationRules?.includes('format')) {
    return localeMessages.validation?.format
      ? localeMessages.validation.format.replace('{field}', field)
      : `The ${field} field has an invalid format.`
  }
  
  if (error.validationRules?.includes('maxLength')) {
    return localeMessages.validation?.maxLength
      ? localeMessages.validation.maxLength.replace('{field}', field)
      : `The ${field} field is too long.`
  }
  
  return error.message
}

/**
 * Get rate limit specific message
 */
function getRateLimitMessage(error: RateLimitError, locale: Locale): string {
  const localeMessages = messages[locale] || messages.en
  
  if (error.retryAfter) {
    const minutes = Math.ceil(error.retryAfter / 60)
    const timeText = minutes > 1 ? `${minutes} minutes` : '1 minute'
    
    return localeMessages.rateLimit?.withTime
      ? localeMessages.rateLimit.withTime.replace('{time}', timeText)
      : `You've made too many requests. Please wait ${timeText} before trying again.`
  }
  
  return error.message
}

/**
 * Get not found specific message
 */
function getNotFoundMessage(error: NotFoundError, locale: Locale): string {
  const localeMessages = messages[locale] || messages.en
  const resource = error.resource || 'item'
  
  return localeMessages.notFound?.resource
    ? localeMessages.notFound.resource.replace('{resource}', resource)
    : `The ${resource} you're looking for couldn't be found.`
}

/**
 * Get technical details for developers
 */
function getTechnicalDetails(error: AppError): string {
  const details: string[] = []
  
  details.push(`Error Code: ${error.errorCode}`)
  details.push(`Status Code: ${error.statusCode}`)
  
  if (error.organizationId) {
    details.push(`Organization: ${error.organizationId}`)
  }
  
  if (error.context) {
    details.push(`Context: ${JSON.stringify(error.context, null, 2)}`)
  }
  
  return details.join('\n')
}

/**
 * Generate support reference code
 */
function generateSupportCode(error: AppError): string {
  const timestamp = Math.floor(error.timestamp.getTime() / 1000).toString(36)
  const errorCode = error.errorCode.slice(0, 3)
  const orgId = error.organizationId?.slice(-4) || 'XXXX'
  const randomSuffix = Math.random().toString(36).substr(2, 4).toUpperCase()
  
  return `${errorCode}-${timestamp}-${orgId}-${randomSuffix}`
}

/**
 * Get learn more URL for error type
 */
function getLearnMoreUrl(errorCode: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_HELP_URL || 'https://help.atlasfitness.com'
  
  const urlMap: Record<string, string> = {
    'VALIDATION_ERROR': `${baseUrl}/troubleshooting/validation-errors`,
    'AUTHENTICATION_ERROR': `${baseUrl}/account/login-issues`,
    'AUTHORIZATION_ERROR': `${baseUrl}/account/permissions`,
    'NOT_FOUND_ERROR': `${baseUrl}/troubleshooting/not-found`,
    'RATE_LIMIT_ERROR': `${baseUrl}/billing/usage-limits`,
    'INTEGRATION_ERROR': `${baseUrl}/integrations/troubleshooting`,
    'DATABASE_ERROR': `${baseUrl}/troubleshooting/data-issues`,
    'AI_SERVICE_ERROR': `${baseUrl}/features/ai-assistant`,
    'MULTI_TENANT_ERROR': `${baseUrl}/security/organization-access`
  }
  
  return urlMap[errorCode] || `${baseUrl}/support`
}

/**
 * Get error message for API responses
 */
export function getApiErrorMessage(
  error: AppError,
  userRole: UserRole = 'staff',
  locale: Locale = 'en'
): { message: string; userMessage: string; code: string } {
  const friendlyMessage = getUserFriendlyMessage(error, userRole, locale, {
    showTechnicalDetails: false,
    includeRecoverySteps: false
  })
  
  return {
    message: error.message, // Technical message
    userMessage: friendlyMessage.message, // User-friendly message
    code: error.errorCode
  }
}

/**
 * Get error summary for dashboards
 */
export function getErrorSummary(
  errors: AppError[],
  locale: Locale = 'en'
): { 
  totalErrors: number
  criticalErrors: number
  commonErrors: { code: string; count: number; message: string }[]
  suggestions: string[]
} {
  const errorCounts = new Map<string, number>()
  let criticalErrors = 0
  
  errors.forEach(error => {
    errorCounts.set(error.errorCode, (errorCounts.get(error.errorCode) || 0) + 1)
    
    if (error.statusCode >= 500 || !error.isOperational) {
      criticalErrors++
    }
  })
  
  const commonErrors = Array.from(errorCounts.entries())
    .map(([code, count]) => ({
      code,
      count,
      message: getUserFriendlyMessage(
        new AppError('', 500, code), 
        'admin', 
        locale, 
        { includeRecoverySteps: false }
      ).title
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
  
  const suggestions = generateSuggestions(commonErrors, locale)
  
  return {
    totalErrors: errors.length,
    criticalErrors,
    commonErrors,
    suggestions
  }
}

/**
 * Generate suggestions based on common errors
 */
function generateSuggestions(
  commonErrors: { code: string; count: number }[],
  locale: Locale
): string[] {
  const suggestions: string[] = []
  const localeMessages = messages[locale] || messages.en
  
  commonErrors.forEach(({ code, count }) => {
    if (code === 'VALIDATION_ERROR' && count > 5) {
      suggestions.push(localeMessages.suggestions?.validation || 'Review form validation to reduce input errors')
    }
    
    if (code === 'AUTHENTICATION_ERROR' && count > 3) {
      suggestions.push(localeMessages.suggestions?.authentication || 'Consider implementing password reset reminders')
    }
    
    if (code === 'RATE_LIMIT_ERROR' && count > 2) {
      suggestions.push(localeMessages.suggestions?.rateLimit || 'Review API usage patterns and consider increasing limits')
    }
  })
  
  return suggestions
}

/**
 * Export default configuration
 */
export const errorMessageConfig = {
  defaultLocale: 'en' as Locale,
  supportedLocales: ['en', 'es', 'fr', 'de', 'it', 'pt'] as Locale[],
  defaultUserRole: 'staff' as UserRole
}