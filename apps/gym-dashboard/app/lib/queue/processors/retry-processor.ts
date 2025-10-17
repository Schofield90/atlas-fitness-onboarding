import { Job } from 'bullmq';
import { createAdminClient } from '@/app/lib/supabase/admin';
import { enhancedQueueManager } from '../enhanced-queue-manager';
import { QUEUE_NAMES, JOB_TYPES, JOB_PRIORITIES, RETRY_STRATEGIES } from '../enhanced-config';

interface RetryJobData {
  originalQueue: string;
  originalJobId: string;
  originalJobName: string;
  originalJobData: any;
  failureReason: string;
  attemptsMade: number;
  maxAttempts: number;
  retryStrategy?: {
    type: 'exponential' | 'fixed' | 'custom';
    baseDelay: number;
    maxDelay?: number;
    backoffMultiplier?: number;
  };
  organizationId: string;
  metadata?: Record<string, any>;
}

interface ErrorHandlingJobData {
  organizationId: string;
  errorType: 'job_failure' | 'system_error' | 'validation_error' | 'timeout_error';
  component: string;
  operation: string;
  errorMessage: string;
  errorStack?: string;
  context: {
    jobId?: string;
    userId?: string;
    workflowId?: string;
    executionId?: string;
    [key: string]: any;
  };
  severity: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, any>;
}

interface EscalationJobData {
  organizationId: string;
  alertType: 'error_threshold' | 'performance_issue' | 'system_health' | 'custom';
  title: string;
  description: string;
  severity: 'warning' | 'critical';
  data: Record<string, any>;
  recipients: string[];
  channels: ('email' | 'sms' | 'webhook' | 'slack')[];
  metadata?: Record<string, any>;
}

export class RetryProcessor {
  private supabase = createAdminClient();
  private errorCounts: Map<string, { count: number; resetTime: number }> = new Map();
  private alertThrottling: Map<string, number> = new Map();

  // Process retry attempts for failed jobs
  async processRetryFailed(job: Job<RetryJobData>): Promise<any> {
    const { 
      originalQueue, 
      originalJobId, 
      originalJobName, 
      originalJobData, 
      failureReason,
      attemptsMade,
      maxAttempts,
      retryStrategy,
      organizationId,
      metadata 
    } = job.data;
    
    console.log(`🔄 Processing retry for job ${originalJobId} (attempt ${attemptsMade}/${maxAttempts})`);
    
    try {
      // Check if retry is still valid
      if (attemptsMade >= maxAttempts) {
        console.log(`❌ Max retry attempts exceeded for job ${originalJobId}`);
        await this.handleMaxRetriesExceeded(job.data);
        return { retried: false, reason: 'max_attempts_exceeded' };
      }
      
      // Check if the original job should be retried
      const shouldRetry = await this.shouldRetryJob(originalJobName, failureReason, attemptsMade);
      
      if (!shouldRetry) {
        console.log(`⏭️  Job ${originalJobId} should not be retried: ${failureReason}`);
        await this.handleJobNotRetriable(job.data);
        return { retried: false, reason: 'not_retriable' };
      }
      
      // Calculate retry delay
      const retryDelay = this.calculateRetryDelay(
        retryStrategy || RETRY_STRATEGIES.default,
        attemptsMade
      );
      
      // Log retry attempt
      await this.logRetryAttempt(organizationId, {
        originalJobId,
        originalJobName,
        attemptsMade: attemptsMade + 1,
        retryDelay,
        failureReason,
      });
      
      // Re-queue the original job with retry metadata
      const retryJobData = {
        ...originalJobData,
        _retry: {
          attempt: attemptsMade + 1,
          maxAttempts,
          previousFailure: failureReason,
          retryJobId: job.id,
        },
      };
      
      await enhancedQueueManager.addJob(
        originalQueue as any,
        originalJobName as any,
        retryJobData,
        {
          delay: retryDelay,
          attempts: 1, // Single attempt for retry
          priority: JOB_PRIORITIES.HIGH, // Prioritize retries
        }
      );
      
      console.log(`✅ Job ${originalJobId} requeued for retry in ${retryDelay}ms`);
      
      return {
        retried: true,
        retryDelay,
        nextAttempt: attemptsMade + 1,
        scheduledFor: new Date(Date.now() + retryDelay).toISOString(),
      };
      
    } catch (error) {
      console.error(`❌ Retry processing failed for job ${originalJobId}:`, error);
      
      // Handle retry processing failure
      await this.handleRetryProcessingFailure(job.data, error);
      
      throw error;
    }
  }

  // Handle general errors in the system
  async processHandleError(job: Job<ErrorHandlingJobData>): Promise<any> {
    const { 
      organizationId, 
      errorType, 
      component, 
      operation, 
      errorMessage, 
      errorStack,
      context,
      severity,
      metadata 
    } = job.data;
    
    console.log(`🚨 Processing error: ${errorType} in ${component}.${operation} (${severity})`);
    
    try {
      // Log error to database
      await this.logError(organizationId, {
        error_type: errorType,
        component,
        operation,
        message: errorMessage,
        stack: errorStack,
        context,
        severity,
        metadata,
      });
      
      // Update error counts for threshold monitoring
      await this.updateErrorCounts(organizationId, errorType, component);
      
      // Check if error requires immediate attention
      if (severity === 'critical' || this.isSystemCriticalError(errorType, component)) {
        await this.escalateError(organizationId, {
          alertType: 'error_threshold',
          title: `Critical Error in ${component}`,
          description: `${operation} failed with: ${errorMessage}`,
          severity: 'critical',
          data: {
            errorType,
            component,
            operation,
            errorMessage,
            context,
          },
          recipients: await this.getErrorRecipients(organizationId, 'critical'),
          channels: ['email', 'webhook'],
        });
      }
      
      // Check error thresholds
      await this.checkErrorThresholds(organizationId, errorType, component);
      
      // Attempt automatic error resolution
      const resolutionResult = await this.attemptAutomaticResolution(errorType, component, context);
      
      return {
        processed: true,
        severity,
        escalated: severity === 'critical',
        autoResolution: resolutionResult,
      };
      
    } catch (error) {
      console.error(`❌ Error handling failed for ${errorType}:`, error);
      throw error;
    }
  }

  // Process error escalations
  async processEscalateError(job: Job<EscalationJobData>): Promise<any> {
    const { 
      organizationId, 
      alertType, 
      title, 
      description, 
      severity, 
      data, 
      recipients, 
      channels,
      metadata 
    } = job.data;
    
    console.log(`🚨 Processing escalation: ${alertType} (${severity})`);
    
    try {
      // Check alert throttling to prevent spam
      const throttleKey = `${organizationId}:${alertType}:${title}`;
      const lastAlertTime = this.alertThrottling.get(throttleKey) || 0;
      const throttleWindow = 15 * 60 * 1000; // 15 minutes
      
      if (Date.now() - lastAlertTime < throttleWindow) {
        console.log(`⏭️  Alert throttled: ${title}`);
        return { escalated: false, reason: 'throttled' };
      }
      
      // Update throttling map
      this.alertThrottling.set(throttleKey, Date.now());
      
      // Log escalation
      await this.logEscalation(organizationId, {
        alert_type: alertType,
        title,
        description,
        severity,
        data,
        recipients,
        channels,
        metadata,
      });
      
      const results = [];
      
      // Send alerts through specified channels
      for (const channel of channels) {
        try {
          const result = await this.sendAlert(channel, {
            organizationId,
            title,
            description,
            severity,
            data,
            recipients,
          });
          
          results.push({
            channel,
            success: true,
            result,
          });
          
        } catch (error) {
          console.error(`❌ Failed to send alert via ${channel}:`, error);
          results.push({
            channel,
            success: false,
            error: error.message,
          });
        }
      }
      
      const successCount = results.filter(r => r.success).length;
      
      console.log(`✅ Alert sent: ${successCount}/${channels.length} channels successful`);
      
      return {
        escalated: true,
        channels: results,
        successCount,
        totalChannels: channels.length,
      };
      
    } catch (error) {
      console.error(`❌ Error escalation failed for ${alertType}:`, error);
      throw error;
    }
  }

  // Private methods

  private async shouldRetryJob(jobName: string, failureReason: string, attemptsMade: number): Promise<boolean> {
    // Define non-retriable error patterns
    const nonRetriablePatterns = [
      /validation error/i,
      /authentication failed/i,
      /authorization denied/i,
      /not found/i,
      /bad request/i,
      /invalid input/i,
      /malformed/i,
    ];
    
    // Check if error is non-retriable
    if (nonRetriablePatterns.some(pattern => pattern.test(failureReason))) {
      return false;
    }
    
    // Check job-specific retry rules
    const jobRetryRules = {
      'send-email': true,
      'send-sms': true,
      'send-whatsapp': true,
      'execute-workflow': true,
      'execute-node': true,
      'update-lead': true,
      'webhook': true,
    };
    
    return jobRetryRules[jobName] !== false;
  }

  private calculateRetryDelay(retryStrategy: any, attemptsMade: number): number {
    const { type, baseDelay, maxDelay = 300000, backoffMultiplier = 2 } = retryStrategy;
    
    let delay = baseDelay;
    
    switch (type) {
      case 'exponential':
        delay = baseDelay * Math.pow(backoffMultiplier, attemptsMade - 1);
        break;
      case 'fixed':
        delay = baseDelay;
        break;
      case 'custom':
        // Custom retry logic would go here
        delay = baseDelay * (attemptsMade + 1);
        break;
    }
    
    // Apply jitter to prevent thundering herd
    const jitter = Math.random() * 0.1 * delay;
    delay += jitter;
    
    // Ensure delay doesn't exceed maximum
    return Math.min(delay, maxDelay);
  }

  private async handleMaxRetriesExceeded(retryData: RetryJobData) {
    const { originalJobId, originalJobName, organizationId, failureReason } = retryData;
    
    // Move to dead letter queue
    await enhancedQueueManager.addJob(
      QUEUE_NAMES.DEAD_LETTER,
      'max-retries-exceeded',
      {
        originalJobId,
        originalJobName,
        organizationId,
        finalFailureReason: failureReason,
        exhaustedAt: new Date().toISOString(),
        ...retryData,
      },
      {
        priority: JOB_PRIORITIES.LOW,
      }
    );
    
    // Send alert for max retries exceeded
    await this.escalateError(organizationId, {
      alertType: 'error_threshold',
      title: `Job Failed After Max Retries`,
      description: `Job ${originalJobName} (${originalJobId}) failed after maximum retry attempts: ${failureReason}`,
      severity: 'warning',
      data: retryData,
      recipients: await this.getErrorRecipients(organizationId, 'warning'),
      channels: ['email'],
    });
  }

  private async handleJobNotRetriable(retryData: RetryJobData) {
    const { originalJobId, organizationId } = retryData;
    
    // Log as non-retriable failure
    await this.supabase
      .from('job_failures')
      .insert({
        job_id: originalJobId,
        organization_id: organizationId,
        failure_type: 'non_retriable',
        data: retryData,
        failed_at: new Date().toISOString(),
      });
  }

  private async handleRetryProcessingFailure(retryData: RetryJobData, error: Error) {
    const { organizationId } = retryData;
    
    // Log retry processing failure
    await this.supabase
      .from('system_errors')
      .insert({
        organization_id: organizationId,
        error_type: 'retry_processing_failure',
        component: 'retry-processor',
        operation: 'processRetryFailed',
        message: error.message,
        stack: error.stack,
        context: retryData,
        severity: 'high',
        created_at: new Date().toISOString(),
      });
  }

  private async logRetryAttempt(organizationId: string, logData: any) {
    await this.supabase
      .from('retry_attempts')
      .insert({
        organization_id: organizationId,
        ...logData,
        attempted_at: new Date().toISOString(),
      });
  }

  private async logError(organizationId: string, errorData: any) {
    await this.supabase
      .from('system_errors')
      .insert({
        organization_id: organizationId,
        ...errorData,
        created_at: new Date().toISOString(),
      });
  }

  private async logEscalation(organizationId: string, escalationData: any) {
    await this.supabase
      .from('error_escalations')
      .insert({
        organization_id: organizationId,
        ...escalationData,
        escalated_at: new Date().toISOString(),
      });
  }

  private async updateErrorCounts(organizationId: string, errorType: string, component: string) {
    const key = `${organizationId}:${errorType}:${component}`;
    const now = Date.now();
    const windowSize = 5 * 60 * 1000; // 5 minutes
    
    let errorCount = this.errorCounts.get(key);
    
    if (!errorCount || now - errorCount.resetTime > windowSize) {
      errorCount = { count: 1, resetTime: now };
    } else {
      errorCount.count++;
    }
    
    this.errorCounts.set(key, errorCount);
  }

  private isSystemCriticalError(errorType: string, component: string): boolean {
    const criticalComponents = ['database', 'redis', 'queue-system', 'authentication'];
    const criticalErrorTypes = ['system_error', 'timeout_error'];
    
    return criticalComponents.includes(component) || criticalErrorTypes.includes(errorType);
  }

  private async checkErrorThresholds(organizationId: string, errorType: string, component: string) {
    const key = `${organizationId}:${errorType}:${component}`;
    const errorCount = this.errorCounts.get(key);
    
    if (!errorCount) return;
    
    // Define error thresholds
    const thresholds = {
      warning: 10,
      critical: 25,
    };
    
    if (errorCount.count >= thresholds.critical) {
      await this.escalateError(organizationId, {
        alertType: 'error_threshold',
        title: `Critical Error Threshold Exceeded`,
        description: `${errorType} in ${component} has occurred ${errorCount.count} times in the last 5 minutes`,
        severity: 'critical',
        data: {
          errorType,
          component,
          count: errorCount.count,
          threshold: thresholds.critical,
        },
        recipients: await this.getErrorRecipients(organizationId, 'critical'),
        channels: ['email', 'webhook'],
      });
    } else if (errorCount.count >= thresholds.warning) {
      await this.escalateError(organizationId, {
        alertType: 'error_threshold',
        title: `Error Threshold Warning`,
        description: `${errorType} in ${component} has occurred ${errorCount.count} times in the last 5 minutes`,
        severity: 'warning',
        data: {
          errorType,
          component,
          count: errorCount.count,
          threshold: thresholds.warning,
        },
        recipients: await this.getErrorRecipients(organizationId, 'warning'),
        channels: ['email'],
      });
    }
  }

  private async attemptAutomaticResolution(errorType: string, component: string, context: any): Promise<any> {
    // Implement automatic error resolution strategies
    switch (errorType) {
      case 'timeout_error':
        return this.resolveTimeoutError(component, context);
      case 'job_failure':
        return this.resolveJobFailure(component, context);
      default:
        return { resolved: false, reason: 'no_auto_resolution_available' };
    }
  }

  private async resolveTimeoutError(component: string, context: any): Promise<any> {
    // Attempt to resolve timeout errors
    if (component === 'database') {
      // Could restart connection pools, clear caches, etc.
      return { resolved: false, action: 'manual_intervention_required' };
    }
    
    return { resolved: false, reason: 'timeout_resolution_not_implemented' };
  }

  private async resolveJobFailure(component: string, context: any): Promise<any> {
    // Attempt to resolve job failures
    if (context.jobId && context.workflowId) {
      // Could reset workflow state, clear locks, etc.
      return { resolved: false, action: 'workflow_state_check_required' };
    }
    
    return { resolved: false, reason: 'job_failure_resolution_not_implemented' };
  }

  private async escalateError(organizationId: string, escalationData: Omit<EscalationJobData, 'organizationId'>) {
    await enhancedQueueManager.addJob(
      QUEUE_NAMES.RETRY_QUEUE,
      JOB_TYPES.ESCALATE_ERROR,
      {
        organizationId,
        ...escalationData,
      },
      {
        priority: JOB_PRIORITIES.HIGH,
      }
    );
  }

  private async sendAlert(channel: string, alertData: any): Promise<any> {
    switch (channel) {
      case 'email':
        return this.sendEmailAlert(alertData);
      case 'sms':
        return this.sendSMSAlert(alertData);
      case 'webhook':
        return this.sendWebhookAlert(alertData);
      case 'slack':
        return this.sendSlackAlert(alertData);
      default:
        throw new Error(`Unknown alert channel: ${channel}`);
    }
  }

  private async sendEmailAlert(alertData: any): Promise<any> {
    const { organizationId, title, description, severity, recipients } = alertData;
    
    for (const recipient of recipients) {
      await enhancedQueueManager.addJob(
        QUEUE_NAMES.EMAIL_QUEUE,
        JOB_TYPES.SEND_EMAIL,
        {
          organizationId,
          to: recipient,
          subject: `🚨 ${severity.toUpperCase()}: ${title}`,
          template: 'error_alert',
          templateData: {
            title,
            description,
            severity,
            timestamp: new Date().toISOString(),
          },
        },
        {
          priority: JOB_PRIORITIES.HIGH,
        }
      );
    }
    
    return { sent: recipients.length };
  }

  private async sendSMSAlert(alertData: any): Promise<any> {
    const { organizationId, title, description, severity, recipients } = alertData;
    
    const message = `🚨 ${severity.toUpperCase()}: ${title}\n\n${description}`;
    
    for (const recipient of recipients) {
      await enhancedQueueManager.addJob(
        QUEUE_NAMES.SMS_QUEUE,
        JOB_TYPES.SEND_SMS,
        {
          organizationId,
          to: recipient,
          message: message.substring(0, 160), // SMS length limit
        },
        {
          priority: JOB_PRIORITIES.HIGH,
        }
      );
    }
    
    return { sent: recipients.length };
  }

  private async sendWebhookAlert(alertData: any): Promise<any> {
    // Get organization webhook settings
    const { data: org } = await this.supabase
      .from('organizations')
      .select('alert_webhook_url')
      .eq('id', alertData.organizationId)
      .single();
    
    const webhookUrl = org?.alert_webhook_url;
    
    if (!webhookUrl) {
      throw new Error('No webhook URL configured for organization');
    }
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        alert: alertData,
        timestamp: new Date().toISOString(),
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Webhook failed with status ${response.status}`);
    }
    
    return { sent: true, status: response.status };
  }

  private async sendSlackAlert(alertData: any): Promise<any> {
    // Slack integration would be implemented here
    throw new Error('Slack alerts not implemented yet');
  }

  private async getErrorRecipients(organizationId: string, severity: 'warning' | 'critical'): Promise<string[]> {
    const { data: settings } = await this.supabase
      .from('organization_settings')
      .select('error_notification_settings')
      .eq('organization_id', organizationId)
      .single();
    
    const notificationSettings = settings?.error_notification_settings || {};
    
    return notificationSettings[severity] || ['admin@example.com']; // Fallback
  }
}

// Create and export processor instance
export const retryProcessor = new RetryProcessor();

// Export individual processing functions
export async function processRetryFailed(job: Job<RetryJobData>) {
  return retryProcessor.processRetryFailed(job);
}

export async function processHandleError(job: Job<ErrorHandlingJobData>) {
  return retryProcessor.processHandleError(job);
}

export async function processEscalateError(job: Job<EscalationJobData>) {
  return retryProcessor.processEscalateError(job);
}