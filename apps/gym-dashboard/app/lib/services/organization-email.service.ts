import { Resend } from 'resend';
import { createAdminClient } from '../supabase/admin';

interface OrganizationEmailConfig {
  id: string;
  organization_id: string;
  service_type: 'shared' | 'dedicated';
  subdomain?: string;
  shared_domain?: string;
  custom_domain?: string;
  from_name: string;
  from_email: string;
  reply_to_email?: string;
  resend_api_key?: string;
  daily_limit?: number;
  is_active: boolean;
}

interface EmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    contentType?: string;
  }>;
  tags?: Record<string, string>;
  templateId?: string;
  variables?: Record<string, any>;
}

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider?: 'resend' | 'shared' | 'dedicated' | 'fallback';
}

export class OrganizationEmailService {
  private organizationId: string;
  private emailConfig: OrganizationEmailConfig | null = null;
  private resendClient: Resend | null = null;
  private sharedResend: Resend | null = null;
  private supabase: any;

  constructor(organizationId: string) {
    this.organizationId = organizationId;
    this.supabase = createAdminClient();
    
    // Initialize shared Resend client for GymLeadHub's shared server
    if (process.env.RESEND_API_KEY) {
      this.sharedResend = new Resend(process.env.RESEND_API_KEY);
    }
  }

  async initialize(): Promise<void> {
    // Fetch organization's email configuration
    const { data, error } = await this.supabase
      .from('email_configurations')
      .select('*')
      .eq('organization_id', this.organizationId)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      console.warn(`No email configuration found for organization ${this.organizationId}`);
      // Create default shared configuration if none exists
      await this.createDefaultConfiguration();
      return;
    }

    this.emailConfig = data;

    // Initialize dedicated Resend client if organization has their own API key
    if (data.service_type === 'dedicated' && data.resend_api_key) {
      this.resendClient = new Resend(data.resend_api_key);
    }
  }

  private async createDefaultConfiguration(): Promise<void> {
    // Get organization details
    const { data: org } = await this.supabase
      .from('organizations')
      .select('name')
      .eq('id', this.organizationId)
      .single();

    if (!org) return;

    // Generate unique subdomain
    const { data: subdomain } = await this.supabase
      .rpc('generate_unique_subdomain', { org_name: org.name });

    // Create shared email configuration
    const { data, error } = await this.supabase
      .from('email_configurations')
      .insert({
        organization_id: this.organizationId,
        service_type: 'shared',
        subdomain: subdomain,
        shared_domain: 'mail.gymleadhub.com',
        from_name: org.name,
        from_email: `${subdomain}@mail.gymleadhub.com`,
        reply_to_email: `${subdomain}@mail.gymleadhub.com`,
        daily_limit: 100,
        is_active: true,
        setup_completed: true
      })
      .select()
      .single();

    if (!error && data) {
      this.emailConfig = data;
    }
  }

  async send(options: EmailOptions): Promise<EmailResult> {
    // Initialize if not already done
    if (!this.emailConfig) {
      await this.initialize();
    }

    if (!this.emailConfig) {
      return {
        success: false,
        error: 'Email configuration not found',
        provider: 'fallback'
      };
    }

    // Check daily limit for shared accounts
    if (this.emailConfig.service_type === 'shared') {
      const canSend = await this.checkDailyLimit();
      if (!canSend) {
        return {
          success: false,
          error: 'Daily email limit reached. Please upgrade to a dedicated email service.',
          provider: 'shared'
        };
      }
    }

    try {
      let result: EmailResult;

      if (this.emailConfig.service_type === 'dedicated' && this.resendClient) {
        // Use organization's own Resend account
        result = await this.sendViaDedicatedResend(options);
      } else if (this.emailConfig.service_type === 'shared' && this.sharedResend) {
        // Use GymLeadHub's shared Resend account
        result = await this.sendViaSharedResend(options);
      } else {
        // Fallback - log only
        result = {
          success: false,
          error: 'No email service available',
          provider: 'fallback'
        };
      }

      // Log email
      await this.logEmail(options, result);

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.logEmail(options, { success: false, error: errorMessage });
      
      return {
        success: false,
        error: errorMessage,
        provider: 'fallback'
      };
    }
  }

  private async sendViaDedicatedResend(options: EmailOptions): Promise<EmailResult> {
    if (!this.resendClient || !this.emailConfig) {
      throw new Error('Dedicated Resend client not initialized');
    }

    try {
      const response = await this.resendClient.emails.send({
        from: `${this.emailConfig.from_name} <${this.emailConfig.from_email}>`,
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text,
        reply_to: options.replyTo || this.emailConfig.reply_to_email,
        cc: options.cc,
        bcc: options.bcc,
        attachments: options.attachments,
        tags: options.tags,
      });

      return {
        success: true,
        messageId: response.data?.id,
        provider: 'dedicated'
      };
    } catch (error) {
      throw error;
    }
  }

  private async sendViaSharedResend(options: EmailOptions): Promise<EmailResult> {
    if (!this.sharedResend || !this.emailConfig) {
      throw new Error('Shared Resend client not initialized');
    }

    try {
      // For shared server, use subdomain email address
      const fromEmail = this.emailConfig.subdomain 
        ? `${this.emailConfig.subdomain}@${this.emailConfig.shared_domain || 'mail.gymleadhub.com'}`
        : this.emailConfig.from_email;

      const response = await this.sharedResend.emails.send({
        from: `${this.emailConfig.from_name} <${fromEmail}>`,
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text,
        reply_to: options.replyTo || fromEmail,
        cc: options.cc,
        bcc: options.bcc,
        attachments: options.attachments,
        tags: options.tags,
      });

      return {
        success: true,
        messageId: response.data?.id,
        provider: 'shared'
      };
    } catch (error) {
      throw error;
    }
  }

  private async checkDailyLimit(): Promise<boolean> {
    if (!this.emailConfig || this.emailConfig.service_type !== 'shared') {
      return true;
    }

    const { data } = await this.supabase
      .rpc('check_email_limit', { p_organization_id: this.organizationId });

    return data || false;
  }

  private async logEmail(options: EmailOptions, result: EmailResult): Promise<void> {
    try {
      await this.supabase.from('email_usage_logs').insert({
        organization_id: this.organizationId,
        email_configuration_id: this.emailConfig?.id,
        to_email: Array.isArray(options.to) ? options.to[0] : options.to,
        from_email: this.emailConfig?.from_email || 'unknown',
        subject: options.subject,
        template_id: options.templateId,
        status: result.success ? 'sent' : 'failed',
        error_message: result.error,
        provider_message_id: result.messageId,
        provider_response: { provider: result.provider },
        sent_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to log email:', error);
    }
  }

  async getConfiguration(): Promise<OrganizationEmailConfig | null> {
    if (!this.emailConfig) {
      await this.initialize();
    }
    return this.emailConfig;
  }

  async updateConfiguration(updates: Partial<OrganizationEmailConfig>): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('email_configurations')
        .update(updates)
        .eq('organization_id', this.organizationId);

      if (!error) {
        // Refresh configuration
        await this.initialize();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to update email configuration:', error);
      return false;
    }
  }

  async upgradeToDedicated(apiKey: string, customDomain: string, fromEmail: string): Promise<boolean> {
    try {
      const updates = {
        service_type: 'dedicated',
        resend_api_key: apiKey,
        custom_domain: customDomain,
        from_email: fromEmail,
        daily_limit: null // Remove limit for dedicated accounts
      };

      return await this.updateConfiguration(updates);
    } catch (error) {
      console.error('Failed to upgrade to dedicated email:', error);
      return false;
    }
  }

  async getUsageStats(days: number = 30): Promise<any> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await this.supabase
      .from('email_usage_logs')
      .select('status, sent_at')
      .eq('organization_id', this.organizationId)
      .gte('sent_at', startDate.toISOString());

    if (error) {
      console.error('Failed to get usage stats:', error);
      return null;
    }

    return {
      total: data.length,
      sent: data.filter(e => e.status === 'sent').length,
      failed: data.filter(e => e.status === 'failed').length,
      delivered: data.filter(e => e.status === 'delivered').length,
      bounced: data.filter(e => e.status === 'bounced').length,
      dailyLimit: this.emailConfig?.daily_limit,
      serviceType: this.emailConfig?.service_type
    };
  }
}

// Factory function to create organization-specific email service
export async function createOrganizationEmailService(organizationId: string): Promise<OrganizationEmailService> {
  const service = new OrganizationEmailService(organizationId);
  await service.initialize();
  return service;
}