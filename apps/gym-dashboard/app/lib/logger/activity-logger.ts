import { logger, LogContext } from './logger'

export type ActivityType = 
  | 'lead_created'
  | 'lead_updated'
  | 'lead_deleted'
  | 'lead_converted'
  | 'email_sent'
  | 'sms_sent'
  | 'whatsapp_sent'
  | 'call_made'
  | 'meeting_scheduled'
  | 'task_created'
  | 'task_completed'
  | 'campaign_created'
  | 'campaign_updated'
  | 'automation_triggered'
  | 'member_checkin'
  | 'payment_received'
  | 'class_booked'
  | 'class_cancelled'
  | 'form_submitted'
  | 'document_uploaded'
  | 'user_login'
  | 'user_logout'
  | 'settings_changed'

export interface ActivityLogEntry {
  activityType: ActivityType
  userId: string
  organizationId?: string
  entityType?: 'lead' | 'client' | 'campaign' | 'task' | 'class' | 'user'
  entityId?: string
  entityName?: string
  description: string
  metadata?: Record<string, any>
  importance?: 'low' | 'medium' | 'high'
  timestamp?: Date
}

class ActivityLogger {
  /**
   * Format activity for consistent logging
   */
  private formatActivity(activity: ActivityLogEntry): LogContext {
    return {
      userId: activity.userId,
      organizationId: activity.organizationId,
      metadata: {
        activityType: activity.activityType,
        entityType: activity.entityType,
        entityId: activity.entityId,
        entityName: activity.entityName,
        importance: activity.importance || 'medium',
        timestamp: (activity.timestamp || new Date()).toISOString(),
        ...activity.metadata
      }
    }
  }
  
  /**
   * Log a user activity
   */
  log(activity: ActivityLogEntry): void {
    const context = this.formatActivity(activity)
    
    // Log at appropriate level based on importance
    switch (activity.importance) {
      case 'high':
        logger.info(`[ACTIVITY] ${activity.description}`, context)
        break
      case 'low':
        logger.debug(`[ACTIVITY] ${activity.description}`, context)
        break
      default:
        logger.info(`[ACTIVITY] ${activity.description}`, context)
    }
    
    // In the future, also save to database for analytics
    // await saveActivityToDatabase(activity)
  }
  
  /**
   * Convenience methods for common activities
   */
  
  leadCreated(userId: string, leadId: string, leadName: string, source: string): void {
    this.log({
      activityType: 'lead_created',
      userId,
      entityType: 'lead',
      entityId: leadId,
      entityName: leadName,
      description: `New lead "${leadName}" created from ${source}`,
      metadata: { source },
      importance: 'high'
    })
  }
  
  leadConverted(userId: string, leadId: string, leadName: string): void {
    this.log({
      activityType: 'lead_converted',
      userId,
      entityType: 'lead',
      entityId: leadId,
      entityName: leadName,
      description: `Lead "${leadName}" converted to client`,
      importance: 'high'
    })
  }
  
  emailSent(userId: string, recipientId: string, recipientName: string, subject: string): void {
    this.log({
      activityType: 'email_sent',
      userId,
      entityType: 'lead',
      entityId: recipientId,
      entityName: recipientName,
      description: `Email sent to ${recipientName}: "${subject}"`,
      metadata: { subject },
      importance: 'medium'
    })
  }
  
  smsSent(userId: string, recipientId: string, recipientName: string, preview: string): void {
    this.log({
      activityType: 'sms_sent',
      userId,
      entityType: 'lead',
      entityId: recipientId,
      entityName: recipientName,
      description: `SMS sent to ${recipientName}`,
      metadata: { preview: preview.substring(0, 50) + '...' },
      importance: 'medium'
    })
  }
  
  taskCompleted(userId: string, taskId: string, taskTitle: string): void {
    this.log({
      activityType: 'task_completed',
      userId,
      entityType: 'task',
      entityId: taskId,
      entityName: taskTitle,
      description: `Task completed: "${taskTitle}"`,
      importance: 'medium'
    })
  }
  
  classBooked(userId: string, classId: string, className: string, memberName: string): void {
    this.log({
      activityType: 'class_booked',
      userId,
      entityType: 'class',
      entityId: classId,
      entityName: className,
      description: `${memberName} booked for ${className}`,
      importance: 'medium'
    })
  }
  
  automationTriggered(automationId: string, automationName: string, triggerType: string, targetId: string): void {
    this.log({
      activityType: 'automation_triggered',
      userId: 'system', // System-triggered activity
      entityType: 'lead',
      entityId: targetId,
      description: `Automation "${automationName}" triggered by ${triggerType}`,
      metadata: { automationId, triggerType },
      importance: 'low'
    })
  }
  
  userLogin(userId: string, userEmail: string, ip?: string): void {
    this.log({
      activityType: 'user_login',
      userId,
      entityType: 'user',
      entityId: userId,
      description: `User ${userEmail} logged in`,
      metadata: { ip },
      importance: 'low'
    })
  }
  
  settingsChanged(userId: string, settingName: string, oldValue: any, newValue: any): void {
    this.log({
      activityType: 'settings_changed',
      userId,
      description: `Settings changed: ${settingName}`,
      metadata: {
        settingName,
        oldValue: oldValue === undefined ? 'not set' : oldValue,
        newValue
      },
      importance: 'medium'
    })
  }
  
  /**
   * Batch log multiple activities (useful for bulk operations)
   */
  logBatch(activities: ActivityLogEntry[]): void {
    activities.forEach(activity => this.log(activity))
  }
  
  /**
   * Get activity summary for analytics
   * In the future, this would query the database
   */
  async getActivitySummary(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Record<ActivityType, number>> {
    // TODO: Implement database query
    // For now, return mock data
    logger.debug('Activity summary requested', {
      organizationId,
      metadata: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      }
    })
    
    return {
      lead_created: 0,
      lead_updated: 0,
      lead_deleted: 0,
      lead_converted: 0,
      email_sent: 0,
      sms_sent: 0,
      whatsapp_sent: 0,
      call_made: 0,
      meeting_scheduled: 0,
      task_created: 0,
      task_completed: 0,
      campaign_created: 0,
      campaign_updated: 0,
      automation_triggered: 0,
      member_checkin: 0,
      payment_received: 0,
      class_booked: 0,
      class_cancelled: 0,
      form_submitted: 0,
      document_uploaded: 0,
      user_login: 0,
      user_logout: 0,
      settings_changed: 0
    }
  }
}

// Export singleton instance
export const activityLogger = new ActivityLogger()

// Example usage:
/*
// In your API routes or server actions:
import { activityLogger } from '@/app/lib/logger/activity-logger'

// When a lead is created
activityLogger.leadCreated(
  user.id,
  lead.id,
  lead.name,
  'facebook_ads'
)

// When an email is sent
activityLogger.emailSent(
  user.id,
  recipient.id,
  recipient.name,
  'Welcome to our gym!'
)

// For custom activities
activityLogger.log({
  activityType: 'custom_event',
  userId: user.id,
  description: 'Custom event occurred',
  metadata: { customData: 'value' }
})
*/