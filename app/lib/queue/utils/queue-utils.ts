import { enhancedQueueManager } from '../enhanced-queue-manager';
import { QUEUE_NAMES, JOB_TYPES, JOB_PRIORITIES } from '../enhanced-config';
import { healthMonitor } from '../monitoring/health-monitor';

// Workflow utilities
export async function triggerWorkflow(
  organizationId: string,
  triggerType: string,
  triggerData: any,
  metadata?: Record<string, any>
): Promise<{ jobId: string; queued: boolean }> {
  try {
    const job = await enhancedQueueManager.addJob(
      QUEUE_NAMES.WORKFLOW_TRIGGERS,
      JOB_TYPES.PROCESS_TRIGGER,
      {
        triggerType,
        triggerData,
        organizationId,
        metadata: {
          ...metadata,
          triggeredAt: new Date().toISOString(),
        },
      },
      {
        priority: JOB_PRIORITIES.HIGH,
      }
    );
    
    return {
      jobId: job.id!,
      queued: true,
    };
  } catch (error) {
    console.error('Failed to trigger workflow:', error);
    throw error;
  }
}

export async function executeWorkflow(
  workflowId: string,
  organizationId: string,
  triggerData: any,
  variables?: Record<string, any>
): Promise<{ jobId: string; executionId: string }> {
  try {
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const job = await enhancedQueueManager.addJob(
      QUEUE_NAMES.WORKFLOW_ACTIONS,
      JOB_TYPES.EXECUTE_WORKFLOW,
      {
        workflowId,
        organizationId,
        triggerData,
        context: {
          triggerType: 'manual',
          triggeredAt: new Date().toISOString(),
          executionId,
        },
        variables,
      },
      {
        priority: JOB_PRIORITIES.HIGH,
      }
    );
    
    return {
      jobId: job.id!,
      executionId,
    };
  } catch (error) {
    console.error('Failed to execute workflow:', error);
    throw error;
  }
}

export async function scheduleWorkflow(
  workflowId: string,
  organizationId: string,
  scheduledFor: Date,
  triggerData: any,
  variables?: Record<string, any>
): Promise<{ jobId: string; scheduledFor: Date }> {
  try {
    const delay = scheduledFor.getTime() - Date.now();
    
    if (delay < 0) {
      throw new Error('Scheduled time must be in the future');
    }
    
    const job = await enhancedQueueManager.addJob(
      QUEUE_NAMES.WORKFLOW_SCHEDULED,
      JOB_TYPES.EXECUTE_WORKFLOW,
      {
        workflowId,
        organizationId,
        triggerData,
        context: {
          triggerType: 'scheduled',
          scheduledFor: scheduledFor.toISOString(),
          triggeredAt: new Date().toISOString(),
        },
        variables,
      },
      {
        delay,
        priority: JOB_PRIORITIES.NORMAL,
      }
    );
    
    return {
      jobId: job.id!,
      scheduledFor,
    };
  } catch (error) {
    console.error('Failed to schedule workflow:', error);
    throw error;
  }
}

// Communication utilities
export async function sendEmail(
  organizationId: string,
  options: {
    to: string | string[];
    subject: string;
    template?: string;
    content?: string;
    variables?: Record<string, any>;
    attachments?: any[];
    replyTo?: string;
  }
): Promise<{ jobId: string }> {
  try {
    const job = await enhancedQueueManager.addJob(
      QUEUE_NAMES.EMAIL_QUEUE,
      JOB_TYPES.SEND_EMAIL,
      {
        type: 'email',
        organizationId,
        ...options,
      },
      {
        priority: JOB_PRIORITIES.HIGH,
      }
    );
    
    return { jobId: job.id! };
  } catch (error) {
    console.error('Failed to queue email:', error);
    throw error;
  }
}

export async function sendSMS(
  organizationId: string,
  options: {
    to: string | string[];
    content: string;
    variables?: Record<string, any>;
  }
): Promise<{ jobId: string }> {
  try {
    const job = await enhancedQueueManager.addJob(
      QUEUE_NAMES.SMS_QUEUE,
      JOB_TYPES.SEND_SMS,
      {
        type: 'sms',
        organizationId,
        ...options,
      },
      {
        priority: JOB_PRIORITIES.HIGH,
      }
    );
    
    return { jobId: job.id! };
  } catch (error) {
    console.error('Failed to queue SMS:', error);
    throw error;
  }
}

export async function sendWhatsApp(
  organizationId: string,
  options: {
    to: string | string[];
    template?: string;
    content?: string;
    variables?: Record<string, any>;
    mediaUrl?: string;
  }
): Promise<{ jobId: string }> {
  try {
    const job = await enhancedQueueManager.addJob(
      QUEUE_NAMES.WHATSAPP_QUEUE,
      JOB_TYPES.SEND_WHATSAPP,
      {
        type: 'whatsapp',
        organizationId,
        ...options,
      },
      {
        priority: JOB_PRIORITIES.HIGH,
      }
    );
    
    return { jobId: job.id! };
  } catch (error) {
    console.error('Failed to queue WhatsApp message:', error);
    throw error;
  }
}

export async function scheduleBulkCommunication(
  organizationId: string,
  type: 'email' | 'sms' | 'whatsapp',
  recipients: Array<{
    to: string;
    variables?: Record<string, any>;
  }>,
  template: string,
  scheduledFor?: Date
): Promise<{ jobId: string; recipientCount: number }> {
  try {
    const delay = scheduledFor ? scheduledFor.getTime() - Date.now() : 0;
    
    const job = await enhancedQueueManager.addJob(
      type === 'email' ? QUEUE_NAMES.EMAIL_QUEUE :
      type === 'sms' ? QUEUE_NAMES.SMS_QUEUE :
      QUEUE_NAMES.WHATSAPP_QUEUE,
      type === 'email' ? JOB_TYPES.BULK_EMAIL :
      type === 'sms' ? JOB_TYPES.BULK_SMS :
      'bulk-whatsapp',
      {
        organizationId,
        recipients,
        template,
        type,
      },
      {
        delay: delay > 0 ? delay : undefined,
        priority: JOB_PRIORITIES.LOW,
      }
    );
    
    return {
      jobId: job.id!,
      recipientCount: recipients.length,
    };
  } catch (error) {
    console.error('Failed to schedule bulk communication:', error);
    throw error;
  }
}

// CRM utilities
export async function updateLead(
  organizationId: string,
  leadId: string,
  updates: Record<string, any>
): Promise<{ jobId: string }> {
  try {
    const job = await enhancedQueueManager.addJob(
      QUEUE_NAMES.WORKFLOW_ACTIONS,
      JOB_TYPES.UPDATE_LEAD,
      {
        organizationId,
        leadId,
        updates,
      },
      {
        priority: JOB_PRIORITIES.NORMAL,
      }
    );
    
    return { jobId: job.id! };
  } catch (error) {
    console.error('Failed to queue lead update:', error);
    throw error;
  }
}

export async function addTagToLead(
  organizationId: string,
  leadId: string,
  tagName: string
): Promise<{ jobId: string }> {
  try {
    const job = await enhancedQueueManager.addJob(
      QUEUE_NAMES.WORKFLOW_ACTIONS,
      JOB_TYPES.ADD_TAG,
      {
        organizationId,
        targetId: leadId,
        targetType: 'lead',
        tagName,
      },
      {
        priority: JOB_PRIORITIES.NORMAL,
      }
    );
    
    return { jobId: job.id! };
  } catch (error) {
    console.error('Failed to queue tag addition:', error);
    throw error;
  }
}

export async function removeTagFromLead(
  organizationId: string,
  leadId: string,
  tagName: string
): Promise<{ jobId: string }> {
  try {
    const job = await enhancedQueueManager.addJob(
      QUEUE_NAMES.WORKFLOW_ACTIONS,
      JOB_TYPES.REMOVE_TAG,
      {
        organizationId,
        targetId: leadId,
        targetType: 'lead',
        tagName,
      },
      {
        priority: JOB_PRIORITIES.NORMAL,
      }
    );
    
    return { jobId: job.id! };
  } catch (error) {
    console.error('Failed to queue tag removal:', error);
    throw error;
  }
}

export async function updateLeadScore(
  organizationId: string,
  leadId: string,
  scoreChange: number,
  reason?: string
): Promise<{ jobId: string }> {
  try {
    const job = await enhancedQueueManager.addJob(
      QUEUE_NAMES.WORKFLOW_ACTIONS,
      JOB_TYPES.UPDATE_SCORE,
      {
        organizationId,
        leadId,
        scoreChange,
        reason,
      },
      {
        priority: JOB_PRIORITIES.NORMAL,
      }
    );
    
    return { jobId: job.id! };
  } catch (error) {
    console.error('Failed to queue score update:', error);
    throw error;
  }
}

// Analytics utilities
export async function trackEvent(
  organizationId: string,
  event: string,
  data: any,
  userId?: string,
  sessionId?: string
): Promise<{ jobId: string }> {
  try {
    const job = await enhancedQueueManager.addJob(
      QUEUE_NAMES.WORKFLOW_ANALYTICS,
      JOB_TYPES.TRACK_EXECUTION,
      {
        event,
        organizationId,
        data,
        timestamp: new Date().toISOString(),
        type: 'custom',
        userId,
        sessionId,
      },
      {
        priority: JOB_PRIORITIES.BACKGROUND,
      }
    );
    
    return { jobId: job.id! };
  } catch (error) {
    console.error('Failed to track event:', error);
    throw error;
  }
}

export async function trackPerformance(
  organizationId: string,
  component: string,
  operation: string,
  duration: number,
  success: boolean,
  metadata?: Record<string, any>
): Promise<{ jobId: string }> {
  try {
    const job = await enhancedQueueManager.addJob(
      QUEUE_NAMES.WORKFLOW_ANALYTICS,
      JOB_TYPES.TRACK_PERFORMANCE,
      {
        organizationId,
        component,
        operation,
        duration,
        success,
        metadata,
        timestamp: new Date().toISOString(),
      },
      {
        priority: JOB_PRIORITIES.BACKGROUND,
      }
    );
    
    return { jobId: job.id! };
  } catch (error) {
    console.error('Failed to track performance:', error);
    throw error;
  }
}

export async function generateReport(
  organizationId: string,
  reportType: 'workflow_performance' | 'communication_stats' | 'system_health' | 'custom',
  dateRange: { start: string; end: string },
  options?: {
    filters?: Record<string, any>;
    recipients?: string[];
    format?: 'json' | 'csv' | 'pdf';
    metadata?: Record<string, any>;
  }
): Promise<{ jobId: string }> {
  try {
    const job = await enhancedQueueManager.addJob(
      QUEUE_NAMES.WORKFLOW_ANALYTICS,
      JOB_TYPES.GENERATE_REPORT,
      {
        organizationId,
        reportType,
        dateRange,
        ...options,
      },
      {
        priority: JOB_PRIORITIES.LOW,
      }
    );
    
    return { jobId: job.id! };
  } catch (error) {
    console.error('Failed to queue report generation:', error);
    throw error;
  }
}

// System utilities
export async function performHealthCheck(): Promise<{
  status: 'healthy' | 'warning' | 'critical';
  issues: string[];
  recommendations: string[];
}> {
  try {
    const health = await healthMonitor.getCurrentHealth();
    
    return {
      status: health.status,
      issues: health.issues,
      recommendations: health.recommendations,
    };
  } catch (error) {
    console.error('Failed to perform health check:', error);
    throw error;
  }
}

export async function getSystemHealth(): Promise<any> {
  try {
    return await healthMonitor.getCurrentHealth();
  } catch (error) {
    console.error('Failed to get system health:', error);
    throw error;
  }
}

export async function performEmergencyRecovery(): Promise<void> {
  try {
    await healthMonitor.performEmergencyRecovery();
  } catch (error) {
    console.error('Failed to perform emergency recovery:', error);
    throw error;
  }
}

export async function getQueueStats(queueName?: string): Promise<any> {
  try {
    if (!enhancedQueueManager) {
      console.warn('Queue manager not initialized');
      return queueName ? {} : {};
    }
    
    if (queueName) {
      return await enhancedQueueManager.getQueueStats(queueName as any);
    } else {
      return await enhancedQueueManager.getAllQueueStats();
    }
  } catch (error) {
    console.error('Failed to get queue stats:', error);
    throw error;
  }
}

export async function pauseQueue(queueName: string): Promise<void> {
  try {
    await enhancedQueueManager.pauseQueue(queueName as any);
  } catch (error) {
    console.error('Failed to pause queue:', error);
    throw error;
  }
}

export async function resumeQueue(queueName: string): Promise<void> {
  try {
    await enhancedQueueManager.resumeQueue(queueName as any);
  } catch (error) {
    console.error('Failed to resume queue:', error);
    throw error;
  }
}

export async function cleanQueue(
  queueName: string,
  grace?: number,
  limit?: number,
  status?: 'completed' | 'wait' | 'active' | 'paused' | 'delayed' | 'failed'
): Promise<string[]> {
  try {
    return await enhancedQueueManager.cleanQueue(queueName as any, grace, limit, status);
  } catch (error) {
    console.error('Failed to clean queue:', error);
    throw error;
  }
}

export async function retryFailedJobs(queueName: string): Promise<void> {
  try {
    await enhancedQueueManager.retryFailedJobs(queueName as any);
  } catch (error) {
    console.error('Failed to retry failed jobs:', error);
    throw error;
  }
}

// Error handling utilities
export async function handleError(
  organizationId: string,
  errorType: 'job_failure' | 'system_error' | 'validation_error' | 'timeout_error',
  component: string,
  operation: string,
  error: Error,
  context?: Record<string, any>,
  severity?: 'low' | 'medium' | 'high' | 'critical'
): Promise<{ jobId: string }> {
  try {
    const job = await enhancedQueueManager.addJob(
      QUEUE_NAMES.RETRY_QUEUE,
      JOB_TYPES.HANDLE_ERROR,
      {
        organizationId,
        errorType,
        component,
        operation,
        errorMessage: error.message,
        errorStack: error.stack,
        context,
        severity: severity || 'medium',
      },
      {
        priority: JOB_PRIORITIES.HIGH,
      }
    );
    
    return { jobId: job.id! };
  } catch (err) {
    console.error('Failed to handle error:', err);
    throw err;
  }
}

export async function escalateError(
  organizationId: string,
  alertType: 'error_threshold' | 'performance_issue' | 'system_health' | 'custom',
  title: string,
  description: string,
  severity: 'warning' | 'critical',
  data: any,
  recipients: string[],
  channels: ('email' | 'sms' | 'webhook' | 'slack')[]
): Promise<{ jobId: string }> {
  try {
    const job = await enhancedQueueManager.addJob(
      QUEUE_NAMES.RETRY_QUEUE,
      JOB_TYPES.ESCALATE_ERROR,
      {
        organizationId,
        alertType,
        title,
        description,
        severity,
        data,
        recipients,
        channels,
      },
      {
        priority: JOB_PRIORITIES.CRITICAL,
      }
    );
    
    return { jobId: job.id! };
  } catch (error) {
    console.error('Failed to escalate error:', error);
    throw error;
  }
}

// Export all utilities
export const QueueUtils = {
  // Workflow
  triggerWorkflow,
  executeWorkflow,
  scheduleWorkflow,
  
  // Communication
  sendEmail,
  sendSMS,
  sendWhatsApp,
  scheduleBulkCommunication,
  
  // CRM
  updateLead,
  addTagToLead,
  removeTagFromLead,
  updateLeadScore,
  
  // Analytics
  trackEvent,
  trackPerformance,
  generateReport,
  
  // System
  performHealthCheck,
  getSystemHealth,
  performEmergencyRecovery,
  getQueueStats,
  pauseQueue,
  resumeQueue,
  cleanQueue,
  retryFailedJobs,
  
  // Error handling
  handleError,
  escalateError,
};