import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

interface EmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    contentType?: string;
  }>;
  tags?: Record<string, string>;
  organizationId?: string;
  templateId?: string;
  variables?: Record<string, any>;
}

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider?: 'resend' | 'test' | 'fallback';
}

class UnifiedEmailService {
  private resend: Resend | null = null;
  private supabase: any;
  private testMode: boolean = false;
  private fromEmail: string;

  constructor() {
    // Initialize Resend if API key is available
    if (process.env.RESEND_API_KEY) {
      this.resend = new Resend(process.env.RESEND_API_KEY);
    }

    // Initialize Supabase for logging
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      this.supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
    }

    // Set from email
    this.fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@atlas-fitness.com';

    // Enable test mode if no API key
    this.testMode = !process.env.RESEND_API_KEY || process.env.EMAIL_TEST_MODE === 'true';
  }

  async send(options: EmailOptions): Promise<EmailResult> {
    try {
      // Validate required fields
      if (!options.to || !options.subject) {
        throw new Error('To and subject are required');
      }

      // Prepare email data
      const emailData = {
        from: options.from || this.fromEmail,
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        html: options.html || options.text || '',
        text: options.text,
        reply_to: options.replyTo,
        cc: options.cc,
        bcc: options.bcc,
        attachments: options.attachments,
        tags: options.tags,
      };

      let result: EmailResult;

      if (this.testMode) {
        // Test mode - log to database but don't send
        result = await this.sendTestEmail(emailData, options);
      } else if (this.resend) {
        // Production mode - send via Resend
        result = await this.sendViaResend(emailData, options);
      } else {
        // Fallback mode - log error
        result = {
          success: false,
          error: 'No email provider configured',
          provider: 'fallback'
        };
      }

      // Log to database
      await this.logEmail({
        ...emailData,
        ...result,
        organizationId: options.organizationId,
        templateId: options.templateId,
      });

      return result;
    } catch (error: any) {
      console.error('Email send error:', error);
      
      // Log failed attempt
      await this.logEmail({
        to: options.to,
        subject: options.subject,
        success: false,
        error: error.message,
        organizationId: options.organizationId,
      });

      return {
        success: false,
        error: error.message,
        provider: 'fallback'
      };
    }
  }

  private async sendViaResend(emailData: any, options: EmailOptions): Promise<EmailResult> {
    try {
      if (!this.resend) {
        throw new Error('Resend not initialized');
      }

      const response = await this.resend.emails.send({
        from: emailData.from,
        to: emailData.to,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text,
        reply_to: emailData.reply_to,
        cc: emailData.cc,
        bcc: emailData.bcc,
        attachments: emailData.attachments,
        tags: emailData.tags,
      });

      return {
        success: true,
        messageId: response.data?.id,
        provider: 'resend'
      };
    } catch (error: any) {
      console.error('Resend error:', error);
      return {
        success: false,
        error: error.message,
        provider: 'resend'
      };
    }
  }

  private async sendTestEmail(emailData: any, options: EmailOptions): Promise<EmailResult> {
    // In test mode, generate a fake message ID and log the email
    const messageId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log('📧 TEST MODE - Email would be sent:', {
      to: emailData.to,
      subject: emailData.subject,
      from: emailData.from,
      messageId
    });

    return {
      success: true,
      messageId,
      provider: 'test'
    };
  }

  private async logEmail(data: any): Promise<void> {
    if (!this.supabase) return;

    try {
      await this.supabase.from('email_logs').insert({
        to_email: Array.isArray(data.to) ? data.to[0] : data.to,
        from_email: data.from || this.fromEmail,
        subject: data.subject,
        body: data.html || data.text,
        status: data.success ? 'sent' : 'failed',
        error: data.error,
        provider: data.provider,
        message_id: data.messageId,
        organization_id: data.organizationId,
        template_id: data.templateId,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to log email:', error);
    }
  }

  async sendBulk(emails: EmailOptions[]): Promise<EmailResult[]> {
    const results: EmailResult[] = [];
    
    // Process emails in batches to avoid rate limits
    const batchSize = 10;
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(email => this.send(email))
      );
      results.push(...batchResults);
      
      // Small delay between batches
      if (i + batchSize < emails.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return results;
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (this.testMode) {
      return {
        success: true,
        message: 'Running in test mode - emails will be logged but not sent'
      };
    }

    if (!this.resend) {
      return {
        success: false,
        message: 'No email provider configured. Add RESEND_API_KEY to environment variables.'
      };
    }

    try {
      // Try to send a test email to verify configuration
      const result = await this.send({
        to: 'test@example.com',
        subject: 'Email Configuration Test',
        text: 'This is a test email to verify configuration.',
      });

      return {
        success: result.success,
        message: result.success 
          ? 'Email service configured successfully'
          : `Email service error: ${result.error}`
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Connection test failed: ${error.message}`
      };
    }
  }

  // Get email stats for an organization
  async getStats(organizationId: string, days: number = 30): Promise<any> {
    if (!this.supabase) return null;

    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await this.supabase
        .from('email_logs')
        .select('status, created_at')
        .eq('organization_id', organizationId)
        .gte('created_at', startDate.toISOString());

      if (error) throw error;

      const stats = {
        total: data.length,
        sent: data.filter((e: any) => e.status === 'sent').length,
        failed: data.filter((e: any) => e.status === 'failed').length,
        delivered: data.filter((e: any) => e.status === 'delivered').length,
        bounced: data.filter((e: any) => e.status === 'bounced').length,
      };

      return stats;
    } catch (error) {
      console.error('Failed to get email stats:', error);
      return null;
    }
  }

  // Check if running in test mode
  isTestMode(): boolean {
    return this.testMode;
  }

  // Enable/disable test mode
  setTestMode(enabled: boolean): void {
    this.testMode = enabled;
  }
}

// Export singleton instance
export const emailService = new UnifiedEmailService();

// Export types
export type { EmailOptions, EmailResult };