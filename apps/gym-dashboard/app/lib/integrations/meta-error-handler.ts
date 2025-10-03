import { createClient } from '@/app/lib/supabase/server'

export interface MetaIntegrationLog {
  organization_id: string
  integration_type: 'oauth' | 'api_call' | 'webhook' | 'sync'
  action: string
  status: 'success' | 'error' | 'warning'
  details?: any
  error_code?: string
  error_message?: string
  user_id?: string
  duration_ms?: number
  metadata?: any
}

export class MetaIntegrationLogger {
  private static async log(logData: MetaIntegrationLog) {
    try {
      const supabase = await createClient()
      
      // Store in a generic integrations log table
      await supabase
        .from('integration_logs')
        .insert({
          organization_id: logData.organization_id,
          integration_name: 'meta_ads',
          integration_type: logData.integration_type,
          action: logData.action,
          status: logData.status,
          details: logData.details,
          error_code: logData.error_code,
          error_message: logData.error_message,
          user_id: logData.user_id,
          duration_ms: logData.duration_ms,
          metadata: logData.metadata,
          created_at: new Date().toISOString()
        })
    } catch (error) {
      // Fallback to console if database logging fails
      console.error('Failed to log Meta integration event:', error)
      console.log('Original log data:', logData)
    }
  }

  static async logSuccess(data: Omit<MetaIntegrationLog, 'status'>) {
    await this.log({ ...data, status: 'success' })
  }

  static async logError(data: Omit<MetaIntegrationLog, 'status'>) {
    await this.log({ ...data, status: 'error' })
  }

  static async logWarning(data: Omit<MetaIntegrationLog, 'status'>) {
    await this.log({ ...data, status: 'warning' })
  }

  static async logAPICall(
    organizationId: string,
    endpoint: string,
    duration: number,
    success: boolean,
    error?: any,
    metadata?: any
  ) {
    const logData: Omit<MetaIntegrationLog, 'status'> = {
      organization_id: organizationId,
      integration_type: 'api_call',
      action: `api_call_${endpoint.replace(/\//g, '_')}`,
      duration_ms: duration,
      metadata: { endpoint, ...metadata }
    }

    if (success) {
      await this.logSuccess(logData)
    } else {
      await this.logError({
        ...logData,
        error_code: error?.code || 'API_ERROR',
        error_message: error?.message || 'Unknown API error',
        details: error
      })
    }
  }

  static async logOAuthFlow(
    organizationId: string,
    step: string,
    success: boolean,
    error?: any,
    userId?: string
  ) {
    const logData: Omit<MetaIntegrationLog, 'status'> = {
      organization_id: organizationId,
      integration_type: 'oauth',
      action: `oauth_${step}`,
      user_id: userId
    }

    if (success) {
      await this.logSuccess(logData)
    } else {
      await this.logError({
        ...logData,
        error_code: error?.code || 'OAUTH_ERROR',
        error_message: error?.message || 'OAuth flow error',
        details: error
      })
    }
  }

  static async logWebhookEvent(
    organizationId: string,
    webhookType: string,
    success: boolean,
    processingTimeMs?: number,
    error?: any,
    eventData?: any
  ) {
    const logData: Omit<MetaIntegrationLog, 'status'> = {
      organization_id: organizationId,
      integration_type: 'webhook',
      action: `webhook_${webhookType}`,
      duration_ms: processingTimeMs,
      metadata: eventData
    }

    if (success) {
      await this.logSuccess(logData)
    } else {
      await this.logError({
        ...logData,
        error_code: error?.code || 'WEBHOOK_ERROR',
        error_message: error?.message || 'Webhook processing error',
        details: error
      })
    }
  }

  static async logSyncOperation(
    organizationId: string,
    syncType: 'pages' | 'forms' | 'leads' | 'campaigns' | 'ad_accounts',
    result: {
      total: number
      successful: number
      failed: number
      duration: number
    },
    error?: any
  ) {
    const success = result.failed === 0 && !error
    
    const logData: Omit<MetaIntegrationLog, 'status'> = {
      organization_id: organizationId,
      integration_type: 'sync',
      action: `sync_${syncType}`,
      duration_ms: result.duration,
      details: result,
      metadata: {
        sync_type: syncType,
        total_items: result.total,
        success_rate: result.total > 0 ? (result.successful / result.total) * 100 : 0
      }
    }

    if (success) {
      await this.logSuccess(logData)
    } else if (result.successful > 0) {
      // Partial success
      await this.logWarning({
        ...logData,
        error_message: `Partial sync: ${result.failed} of ${result.total} items failed`,
        details: { ...result, error }
      })
    } else {
      await this.logError({
        ...logData,
        error_code: error?.code || 'SYNC_ERROR',
        error_message: error?.message || `Full sync failure for ${syncType}`,
        details: { ...result, error }
      })
    }
  }
}

export class MetaErrorHandler {
  static handleAPIError(error: any): {
    isRetryable: boolean
    userMessage: string
    logLevel: 'error' | 'warning'
    shouldNotifyUser: boolean
  } {
    // Facebook API specific error codes
    switch (error.code) {
      case 1:
        return {
          isRetryable: false,
          userMessage: 'Invalid API request. Please check your integration settings.',
          logLevel: 'error',
          shouldNotifyUser: true
        }

      case 2:
        return {
          isRetryable: true,
          userMessage: 'Facebook service temporarily unavailable. We\'ll retry automatically.',
          logLevel: 'warning',
          shouldNotifyUser: false
        }

      case 4:
        return {
          isRetryable: true,
          userMessage: 'Rate limit exceeded. Slowing down requests.',
          logLevel: 'warning',
          shouldNotifyUser: false
        }

      case 10:
        return {
          isRetryable: false,
          userMessage: 'Permission denied. Please reconnect your Facebook account with proper permissions.',
          logLevel: 'error',
          shouldNotifyUser: true
        }

      case 17:
        return {
          isRetryable: true,
          userMessage: 'Request limit reached. Will retry later.',
          logLevel: 'warning',
          shouldNotifyUser: false
        }

      case 100:
        return {
          isRetryable: false,
          userMessage: 'Invalid parameter in request. Please contact support.',
          logLevel: 'error',
          shouldNotifyUser: true
        }

      case 190:
        return {
          isRetryable: false,
          userMessage: 'Access token expired. Please reconnect your Facebook account.',
          logLevel: 'error',
          shouldNotifyUser: true
        }

      case 200:
        return {
          isRetryable: false,
          userMessage: 'Insufficient permissions. Please reconnect with required permissions.',
          logLevel: 'error',
          shouldNotifyUser: true
        }

      case 613:
        return {
          isRetryable: true,
          userMessage: 'Calls to this API are temporarily restricted.',
          logLevel: 'warning',
          shouldNotifyUser: false
        }

      default:
        return {
          isRetryable: false,
          userMessage: 'An unexpected error occurred with the Facebook integration.',
          logLevel: 'error',
          shouldNotifyUser: true
        }
    }
  }

  static async handleWebhookError(
    error: any,
    organizationId: string,
    eventData: any
  ): Promise<boolean> {
    const errorInfo = this.handleAPIError(error)

    await MetaIntegrationLogger.logWebhookEvent(
      organizationId,
      eventData.field || 'unknown',
      false,
      undefined,
      error,
      eventData
    )

    // Store failed webhook for retry if it's retryable
    if (errorInfo.isRetryable) {
      try {
        const supabase = await createClient()
        await supabase
          .from('failed_webhook_events')
          .insert({
            organization_id: organizationId,
            integration_name: 'meta_ads',
            event_data: eventData,
            error_message: error.message,
            retry_count: 0,
            next_retry_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // Retry in 5 minutes
            max_retries: 3
          })
      } catch (dbError) {
        console.error('Failed to store webhook for retry:', dbError)
      }
    }

    return errorInfo.isRetryable
  }

  static formatErrorForUser(error: any): string {
    if (error.name === 'MetaAdsAPIError') {
      const errorInfo = this.handleAPIError(error)
      return errorInfo.userMessage
    }

    // Generic error messages
    if (error.message?.includes('fetch')) {
      return 'Network error. Please check your internet connection and try again.'
    }

    if (error.message?.includes('timeout')) {
      return 'Request timed out. Please try again.'
    }

    if (error.message?.includes('permission')) {
      return 'Permission denied. Please check your Facebook account permissions.'
    }

    return 'An unexpected error occurred. Please try again or contact support.'
  }
}

// Utility function to wrap API calls with error handling and logging
export async function withMetaErrorHandling<T>(
  organizationId: string,
  operation: string,
  apiCall: () => Promise<T>,
  options: {
    retryable?: boolean
    maxRetries?: number
    logDetails?: any
  } = {}
): Promise<T> {
  const { retryable = true, maxRetries = 3, logDetails = {} } = options
  const startTime = Date.now()

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await apiCall()
      const duration = Date.now() - startTime

      await MetaIntegrationLogger.logAPICall(
        organizationId,
        operation,
        duration,
        true,
        null,
        { ...logDetails, attempt, total_attempts: attempt }
      )

      return result
    } catch (error: any) {
      const duration = Date.now() - startTime
      const errorInfo = MetaErrorHandler.handleAPIError(error)

      if (!retryable || !errorInfo.isRetryable || attempt === maxRetries) {
        await MetaIntegrationLogger.logAPICall(
          organizationId,
          operation,
          duration,
          false,
          error,
          { ...logDetails, attempt, total_attempts: attempt, final_attempt: true }
        )
        throw error
      }

      // Wait before retry with exponential backoff
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw new Error('Max retries exceeded')
}