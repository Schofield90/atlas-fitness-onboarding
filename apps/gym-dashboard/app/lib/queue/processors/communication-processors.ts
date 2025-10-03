import { Job } from 'bullmq';
import { createAdminClient } from '@/app/lib/supabase/admin';
import { enhancedQueueManager } from '../enhanced-queue-manager';
import { QUEUE_NAMES, JOB_TYPES, JOB_PRIORITIES } from '../enhanced-config';

// Import existing communication services
import { sendEmail } from '@/app/lib/email/send-email';
import { sendSMS } from '@/app/lib/sms';
import { sendWhatsAppMessage } from '@/app/lib/whatsapp';

interface EmailJobData {
  organizationId: string;
  to: string | string[];
  subject: string;
  template?: string;
  templateData?: Record<string, any>;
  htmlContent?: string;
  textContent?: string;
  from?: string;
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    encoding?: string;
    contentType?: string;
  }>;
  priority?: 'high' | 'normal' | 'low';
  sendAt?: string; // ISO date string for scheduled sending
  trackingId?: string; // For analytics
  metadata?: Record<string, any>;
}

interface SMSJobData {
  organizationId: string;
  to: string | string[];
  message: string;
  from?: string;
  mediaUrls?: string[];
  priority?: 'high' | 'normal' | 'low';
  sendAt?: string;
  trackingId?: string;
  metadata?: Record<string, any>;
}

interface WhatsAppJobData {
  organizationId: string;
  to: string | string[];
  message?: string;
  templateName?: string;
  templateParams?: Record<string, any>;
  mediaUrl?: string;
  mediaType?: 'image' | 'document' | 'video' | 'audio';
  priority?: 'high' | 'normal' | 'low';
  sendAt?: string;
  trackingId?: string;
  metadata?: Record<string, any>;
}

interface BulkCommunicationJobData {
  organizationId: string;
  type: 'email' | 'sms' | 'whatsapp';
  recipients: Array<{
    to: string;
    personalizedData?: Record<string, any>;
  }>;
  template: {
    subject?: string; // For email
    message?: string; // For SMS/WhatsApp
    templateName?: string;
    templateData?: Record<string, any>;
  };
  settings: {
    batchSize?: number;
    delayBetweenBatches?: number; // milliseconds
    priority?: 'high' | 'normal' | 'low';
  };
  trackingId?: string;
  metadata?: Record<string, any>;
}

export class CommunicationProcessor {
  private supabase = createAdminClient();

  // Email Processing
  async processEmailJob(job: Job<EmailJobData>): Promise<any> {
    const { 
      organizationId, 
      to, 
      subject, 
      template, 
      templateData, 
      htmlContent, 
      textContent, 
      from, 
      replyTo, 
      attachments,
      trackingId,
      metadata 
    } = job.data;
    
    console.log(`📧 Processing email job for ${Array.isArray(to) ? to.length + ' recipients' : to}`);
    
    try {
      // Get organization settings
      const orgSettings = await this.getOrganizationSettings(organizationId, 'email');
      
      // Prepare email data
      const emailData = {
        to,
        subject,
        template: template || 'default',
        templateData: templateData || {},
        htmlContent,
        textContent,
        from: from || orgSettings.fromEmail || process.env.DEFAULT_FROM_EMAIL,
        replyTo: replyTo || orgSettings.replyToEmail,
        attachments,
        organizationId,
      };
      
      // Send email
      const result = await sendEmail(emailData);
      
      // Log communication
      await this.logCommunication(organizationId, {
        type: 'email',
        to: Array.isArray(to) ? to : [to],
        subject,
        status: 'sent',
        messageId: result.messageId,
        trackingId,
        metadata: {
          ...metadata,
          jobId: job.id,
          processingTime: Date.now() - job.timestamp,
        },
      });
      
      // Track analytics
      if (trackingId) {
        await this.trackCommunicationAnalytics(organizationId, 'email', 'sent', {
          trackingId,
          recipientCount: Array.isArray(to) ? to.length : 1,
          template,
        });
      }
      
      console.log(`✅ Email sent successfully: ${result.messageId}`);
      
      return {
        success: true,
        messageId: result.messageId,
        recipientCount: Array.isArray(to) ? to.length : 1,
      };
      
    } catch (error) {
      console.error('❌ Email sending failed:', error);
      
      // Log failure
      await this.logCommunication(organizationId, {
        type: 'email',
        to: Array.isArray(to) ? to : [to],
        subject,
        status: 'failed',
        error: error.message,
        trackingId,
        metadata,
      });
      
      throw error;
    }
  }

  // SMS Processing
  async processSMSJob(job: Job<SMSJobData>): Promise<any> {
    const { 
      organizationId, 
      to, 
      message, 
      from, 
      mediaUrls,
      trackingId,
      metadata 
    } = job.data;
    
    console.log(`📱 Processing SMS job for ${Array.isArray(to) ? to.length + ' recipients' : to}`);
    
    try {
      // Get organization settings
      const orgSettings = await this.getOrganizationSettings(organizationId, 'sms');
      
      const results = [];
      const recipients = Array.isArray(to) ? to : [to];
      
      for (const recipient of recipients) {
        try {
          const result = await sendSMS({
            to: recipient,
            message,
            from: from || orgSettings.fromNumber || process.env.TWILIO_PHONE_NUMBER,
            mediaUrls,
            organizationId,
          });
          
          results.push({
            to: recipient,
            messageId: result.sid,
            success: true,
          });
          
        } catch (error) {
          console.error(`❌ SMS failed for ${recipient}:`, error);
          results.push({
            to: recipient,
            success: false,
            error: error.message,
          });
        }
      }
      
      // Log communication
      await this.logCommunication(organizationId, {
        type: 'sms',
        to: recipients,
        message: message.substring(0, 100) + '...', // Truncate for logging
        status: results.every(r => r.success) ? 'sent' : 'partial',
        results,
        trackingId,
        metadata: {
          ...metadata,
          jobId: job.id,
          processingTime: Date.now() - job.timestamp,
        },
      });
      
      // Track analytics
      if (trackingId) {
        await this.trackCommunicationAnalytics(organizationId, 'sms', 'sent', {
          trackingId,
          recipientCount: recipients.length,
          successCount: results.filter(r => r.success).length,
          failureCount: results.filter(r => !r.success).length,
        });
      }
      
      const successCount = results.filter(r => r.success).length;
      console.log(`✅ SMS sent: ${successCount}/${recipients.length} successful`);
      
      return {
        success: successCount > 0,
        results,
        successCount,
        totalCount: recipients.length,
      };
      
    } catch (error) {
      console.error('❌ SMS processing failed:', error);
      
      // Log failure
      await this.logCommunication(organizationId, {
        type: 'sms',
        to: Array.isArray(to) ? to : [to],
        message,
        status: 'failed',
        error: error.message,
        trackingId,
        metadata,
      });
      
      throw error;
    }
  }

  // WhatsApp Processing
  async processWhatsAppJob(job: Job<WhatsAppJobData>): Promise<any> {
    const { 
      organizationId, 
      to, 
      message, 
      templateName, 
      templateParams,
      mediaUrl,
      mediaType,
      trackingId,
      metadata 
    } = job.data;
    
    console.log(`💬 Processing WhatsApp job for ${Array.isArray(to) ? to.length + ' recipients' : to}`);
    
    try {
      const results = [];
      const recipients = Array.isArray(to) ? to : [to];
      
      for (const recipient of recipients) {
        try {
          const result = await sendWhatsAppMessage({
            to: recipient,
            message,
            templateName,
            templateParams,
            mediaUrl,
            mediaType,
            organizationId,
          });
          
          results.push({
            to: recipient,
            messageId: result.messageId,
            success: true,
          });
          
        } catch (error) {
          console.error(`❌ WhatsApp failed for ${recipient}:`, error);
          results.push({
            to: recipient,
            success: false,
            error: error.message,
          });
        }
      }
      
      // Log communication
      await this.logCommunication(organizationId, {
        type: 'whatsapp',
        to: recipients,
        message: message ? message.substring(0, 100) + '...' : templateName,
        status: results.every(r => r.success) ? 'sent' : 'partial',
        results,
        trackingId,
        metadata: {
          ...metadata,
          jobId: job.id,
          processingTime: Date.now() - job.timestamp,
        },
      });
      
      // Track analytics
      if (trackingId) {
        await this.trackCommunicationAnalytics(organizationId, 'whatsapp', 'sent', {
          trackingId,
          recipientCount: recipients.length,
          successCount: results.filter(r => r.success).length,
          failureCount: results.filter(r => !r.success).length,
          templateName,
        });
      }
      
      const successCount = results.filter(r => r.success).length;
      console.log(`✅ WhatsApp sent: ${successCount}/${recipients.length} successful`);
      
      return {
        success: successCount > 0,
        results,
        successCount,
        totalCount: recipients.length,
      };
      
    } catch (error) {
      console.error('❌ WhatsApp processing failed:', error);
      
      // Log failure
      await this.logCommunication(organizationId, {
        type: 'whatsapp',
        to: Array.isArray(to) ? to : [to],
        message,
        status: 'failed',
        error: error.message,
        trackingId,
        metadata,
      });
      
      throw error;
    }
  }

  // Bulk Communication Processing
  async processBulkCommunication(job: Job<BulkCommunicationJobData>): Promise<any> {
    const { 
      organizationId, 
      type, 
      recipients, 
      template, 
      settings,
      trackingId,
      metadata 
    } = job.data;
    
    console.log(`📢 Processing bulk ${type} job for ${recipients.length} recipients`);
    
    try {
      const batchSize = settings.batchSize || 50;
      const delayBetweenBatches = settings.delayBetweenBatches || 1000;
      const batches = this.chunkArray(recipients, batchSize);
      
      const results = [];
      
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        console.log(`📦 Processing batch ${i + 1}/${batches.length} (${batch.length} recipients)`);
        
        try {
          // Process batch based on communication type
          const batchResults = await this.processBatch(
            type, 
            organizationId, 
            batch, 
            template, 
            trackingId,
            metadata
          );
          
          results.push(...batchResults);
          
          // Delay between batches (except for the last batch)
          if (i < batches.length - 1 && delayBetweenBatches > 0) {
            await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
          }
          
        } catch (error) {
          console.error(`❌ Batch ${i + 1} failed:`, error);
          
          // Add failure results for this batch
          batch.forEach(recipient => {
            results.push({
              to: recipient.to,
              success: false,
              error: error.message,
            });
          });
        }
      }
      
      // Aggregate results
      const successCount = results.filter(r => r.success).length;
      const totalCount = results.length;
      
      // Log bulk communication
      await this.logCommunication(organizationId, {
        type: `bulk_${type}`,
        to: recipients.map(r => r.to),
        message: template.message || template.subject,
        status: successCount > 0 ? (successCount === totalCount ? 'sent' : 'partial') : 'failed',
        results: { successCount, totalCount, batches: batches.length },
        trackingId,
        metadata: {
          ...metadata,
          jobId: job.id,
          processingTime: Date.now() - job.timestamp,
          batchSize,
        },
      });
      
      // Track analytics
      if (trackingId) {
        await this.trackCommunicationAnalytics(organizationId, `bulk_${type}`, 'sent', {
          trackingId,
          recipientCount: totalCount,
          successCount,
          failureCount: totalCount - successCount,
          batchCount: batches.length,
        });
      }
      
      console.log(`✅ Bulk ${type} completed: ${successCount}/${totalCount} successful`);
      
      return {
        success: successCount > 0,
        successCount,
        totalCount,
        batchCount: batches.length,
        results,
      };
      
    } catch (error) {
      console.error(`❌ Bulk ${type} processing failed:`, error);
      
      // Log failure
      await this.logCommunication(organizationId, {
        type: `bulk_${type}`,
        to: recipients.map(r => r.to),
        message: template.message || template.subject,
        status: 'failed',
        error: error.message,
        trackingId,
        metadata,
      });
      
      throw error;
    }
  }

  private async processBatch(
    type: 'email' | 'sms' | 'whatsapp',
    organizationId: string,
    batch: Array<{ to: string; personalizedData?: Record<string, any> }>,
    template: any,
    trackingId?: string,
    metadata?: Record<string, any>
  ): Promise<Array<{ to: string; success: boolean; messageId?: string; error?: string }>> {
    
    const jobs = batch.map(recipient => {
      const personalizedTemplate = this.personalizeTemplate(template, recipient.personalizedData || {});
      
      let jobData: any = {
        organizationId,
        to: recipient.to,
        trackingId,
        metadata,
      };
      
      if (type === 'email') {
        jobData = {
          ...jobData,
          subject: personalizedTemplate.subject,
          template: personalizedTemplate.templateName,
          templateData: personalizedTemplate.templateData,
          htmlContent: personalizedTemplate.htmlContent,
          textContent: personalizedTemplate.textContent,
        };
      } else if (type === 'sms') {
        jobData = {
          ...jobData,
          message: personalizedTemplate.message,
        };
      } else if (type === 'whatsapp') {
        jobData = {
          ...jobData,
          message: personalizedTemplate.message,
          templateName: personalizedTemplate.templateName,
          templateParams: personalizedTemplate.templateParams,
        };
      }
      
      return jobData;
    });
    
    // Process jobs in parallel with concurrency limit
    const concurrency = 10;
    const results = [];
    
    for (let i = 0; i < jobs.length; i += concurrency) {
      const jobBatch = jobs.slice(i, i + concurrency);
      
      const batchPromises = jobBatch.map(async (jobData) => {
        try {
          let result;
          
          if (type === 'email') {
            result = await this.processEmailJob({ data: jobData } as Job<EmailJobData>);
          } else if (type === 'sms') {
            result = await this.processSMSJob({ data: jobData } as Job<SMSJobData>);
          } else if (type === 'whatsapp') {
            result = await this.processWhatsAppJob({ data: jobData } as Job<WhatsAppJobData>);
          }
          
          return {
            to: jobData.to,
            success: true,
            messageId: result?.messageId,
          };
          
        } catch (error) {
          return {
            to: jobData.to,
            success: false,
            error: error.message,
          };
        }
      });
      
      const batchResults = await Promise.allSettled(batchPromises);
      results.push(...batchResults.map(r => r.status === 'fulfilled' ? r.value : {
        to: 'unknown',
        success: false,
        error: 'Promise rejected',
      }));
    }
    
    return results;
  }

  private personalizeTemplate(template: any, personalizedData: Record<string, any>): any {
    const personalized = { ...template };
    
    // Simple template interpolation
    for (const [key, value] of Object.entries(personalized)) {
      if (typeof value === 'string') {
        personalized[key] = this.interpolateString(value, personalizedData);
      }
    }
    
    return personalized;
  }

  private interpolateString(str: string, data: Record<string, any>): string {
    return str.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
      return data[key.trim()] || match;
    });
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private async getOrganizationSettings(organizationId: string, type: 'email' | 'sms' | 'whatsapp'): Promise<any> {
    try {
      const { data: org } = await this.supabase
        .from('organizations')
        .select(`${type}_settings`)
        .eq('id', organizationId)
        .single();
      
      return org?.[`${type}_settings`] || {};
    } catch (error) {
      console.warn(`Failed to fetch ${type} settings for org ${organizationId}:`, error);
      return {};
    }
  }

  private async logCommunication(organizationId: string, logData: any) {
    try {
      await this.supabase
        .from('communication_logs')
        .insert({
          organization_id: organizationId,
          ...logData,
          created_at: new Date().toISOString(),
        });
    } catch (error) {
      console.error('Failed to log communication:', error);
    }
  }

  private async trackCommunicationAnalytics(
    organizationId: string,
    type: string,
    event: string,
    data: Record<string, any>
  ) {
    try {
      await enhancedQueueManager.addJob(
        QUEUE_NAMES.WORKFLOW_ANALYTICS,
        JOB_TYPES.TRACK_EXECUTION,
        {
          event: `communication_${event}`,
          type,
          organizationId,
          data,
          timestamp: new Date().toISOString(),
        },
        {
          priority: JOB_PRIORITIES.LOW,
        }
      );
    } catch (error) {
      console.error('Failed to track communication analytics:', error);
    }
  }
}

// Create and export processor instance
export const communicationProcessor = new CommunicationProcessor();

// Export individual processing functions for the job queue
export async function processEmailJob(job: Job<EmailJobData>) {
  return communicationProcessor.processEmailJob(job);
}

export async function processSMSJob(job: Job<SMSJobData>) {
  return communicationProcessor.processSMSJob(job);
}

export async function processWhatsAppJob(job: Job<WhatsAppJobData>) {
  return communicationProcessor.processWhatsAppJob(job);
}

export async function processBulkEmailJob(job: Job<BulkCommunicationJobData>) {
  return communicationProcessor.processBulkCommunication(job);
}

export async function processBulkSMSJob(job: Job<BulkCommunicationJobData>) {
  return communicationProcessor.processBulkCommunication(job);
}