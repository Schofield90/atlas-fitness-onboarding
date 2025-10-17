import { createClient } from '@/app/lib/supabase/client'
import { createAdminClient } from '@/app/lib/supabase/admin'
import { Resend } from 'resend'

// Email service types
export interface EmailConfiguration {
  id: string
  organization_id: string
  service_type: 'shared' | 'dedicated'
  subdomain?: string
  shared_domain?: string
  custom_domain?: string
  dns_verified: boolean
  from_name: string
  from_email: string
  reply_to_email?: string
  resend_api_key?: string
  daily_limit: number
  is_active: boolean
  setup_completed: boolean
  setup_step: number
}

export interface EmailTemplate {
  id: string
  organization_id: string
  name: string
  description?: string
  category: 'marketing' | 'transactional' | 'automation' | 'general'
  subject: string
  html_content: string
  text_content?: string
  variables: string[]
  is_active: boolean
  usage_count: number
}

export interface SendEmailOptions {
  to: string
  subject: string
  html?: string
  text?: string
  templateId?: string
  variables?: Record<string, string>
  tags?: string[]
  metadata?: Record<string, any>
}

export class EmailService {
  private supabase = createClient()
  private adminSupabase = createAdminClient()
  private resend: Resend | null = null

  constructor(private organizationId: string) {}

  // Initialize Resend client with appropriate API key
  private async initializeResend(): Promise<Resend | null> {
    if (this.resend) return this.resend

    const config = await this.getEmailConfiguration()
    if (!config) return null

    let apiKey: string | undefined

    if (config.service_type === 'dedicated' && config.resend_api_key) {
      // Use gym's dedicated API key
      apiKey = config.resend_api_key
    } else {
      // Use shared server API key
      apiKey = process.env.RESEND_API_KEY
    }

    if (!apiKey) {
      console.error('No Resend API key available for email service')
      return null
    }

    this.resend = new Resend(apiKey)
    return this.resend
  }

  // Get email configuration for organization
  async getEmailConfiguration(): Promise<EmailConfiguration | null> {
    const { data, error } = await this.supabase
      .from('email_configurations')
      .select('*')
      .eq('organization_id', this.organizationId)
      .eq('is_active', true)
      .single()

    if (error) {
      console.error('Error fetching email configuration:', error)
      return null
    }

    return data
  }

  // Create or update email configuration
  async saveEmailConfiguration(config: Partial<EmailConfiguration>): Promise<boolean> {
    try {
      const existingConfig = await this.getEmailConfiguration()

      if (existingConfig) {
        // Update existing configuration
        const { error } = await this.supabase
          .from('email_configurations')
          .update({
            ...config,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingConfig.id)

        if (error) throw error
      } else {
        // Create new configuration
        const { error } = await this.supabase
          .from('email_configurations')
          .insert({
            organization_id: this.organizationId,
            ...config,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })

        if (error) throw error
      }

      return true
    } catch (error) {
      console.error('Error saving email configuration:', error)
      return false
    }
  }

  // Check if daily email limit is exceeded
  async checkDailyLimit(): Promise<boolean> {
    const { data } = await this.adminSupabase
      .rpc('check_email_limit', { p_organization_id: this.organizationId })

    return data || false
  }

  // Send email
  async sendEmail(options: SendEmailOptions): Promise<boolean> {
    try {
      // Check configuration and limits
      const config = await this.getEmailConfiguration()
      if (!config || !config.setup_completed) {
        throw new Error('Email service not configured')
      }

      // Check daily limit for shared servers
      if (config.service_type === 'shared') {
        const withinLimit = await this.checkDailyLimit()
        if (!withinLimit) {
          throw new Error('Daily email limit exceeded')
        }
      }

      // Initialize Resend client
      const resend = await this.initializeResend()
      if (!resend) {
        throw new Error('Failed to initialize email service')
      }

      // Prepare email data
      let htmlContent = options.html
      let textContent = options.text
      let subject = options.subject

      // Use template if provided
      if (options.templateId) {
        const template = await this.getEmailTemplate(options.templateId)
        if (template) {
          subject = this.replaceVariables(template.subject, options.variables || {})
          htmlContent = this.replaceVariables(template.html_content, options.variables || {})
          textContent = template.text_content 
            ? this.replaceVariables(template.text_content, options.variables || {})
            : undefined

          // Update template usage count
          await this.incrementTemplateUsage(options.templateId)
        }
      }

      // Determine from email
      const fromEmail = config.service_type === 'dedicated' && config.custom_domain
        ? `${config.from_name} <${config.from_email}>`
        : `${config.from_name} <${config.subdomain}@${config.shared_domain}>`

      // Send email via Resend
      const { data, error } = await resend.emails.send({
        from: fromEmail,
        to: options.to,
        subject,
        html: htmlContent,
        text: textContent,
        replyTo: config.reply_to_email,
        tags: options.tags ? options.tags.map(tag => ({ name: tag, value: 'true' })) : undefined
      })

      if (error) throw error

      // Log email usage
      await this.logEmailUsage({
        to_email: options.to,
        from_email: fromEmail,
        subject,
        template_id: options.templateId,
        status: 'sent',
        provider_message_id: data?.id,
        provider_response: data,
        tags: options.tags,
        metadata: options.metadata
      })

      return true
    } catch (error) {
      console.error('Error sending email:', error)
      
      // Log failed email attempt
      await this.logEmailUsage({
        to_email: options.to,
        from_email: 'system',
        subject: options.subject,
        template_id: options.templateId,
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        tags: options.tags,
        metadata: options.metadata
      })

      return false
    }
  }

  // Get email template
  async getEmailTemplate(templateId: string): Promise<EmailTemplate | null> {
    const { data, error } = await this.supabase
      .from('email_templates')
      .select('*')
      .eq('id', templateId)
      .eq('organization_id', this.organizationId)
      .eq('is_active', true)
      .single()

    if (error) {
      console.error('Error fetching email template:', error)
      return null
    }

    return data
  }

  // Get all email templates for organization
  async getEmailTemplates(category?: string): Promise<EmailTemplate[]> {
    let query = this.supabase
      .from('email_templates')
      .select('*')
      .eq('organization_id', this.organizationId)
      .eq('is_active', true)
      .order('name')

    if (category) {
      query = query.eq('category', category)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching email templates:', error)
      return []
    }

    return data || []
  }

  // Create or update email template
  async saveEmailTemplate(template: Partial<EmailTemplate>): Promise<boolean> {
    try {
      if (template.id) {
        // Update existing template
        const { error } = await this.supabase
          .from('email_templates')
          .update({
            ...template,
            updated_at: new Date().toISOString()
          })
          .eq('id', template.id)
          .eq('organization_id', this.organizationId)

        if (error) throw error
      } else {
        // Create new template
        const { error } = await this.supabase
          .from('email_templates')
          .insert({
            organization_id: this.organizationId,
            ...template,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })

        if (error) throw error
      }

      return true
    } catch (error) {
      console.error('Error saving email template:', error)
      return false
    }
  }

  // Generate unique subdomain for shared server
  async generateUniqueSubdomain(orgName: string): Promise<string> {
    const { data, error } = await this.adminSupabase
      .rpc('generate_unique_subdomain', { org_name: orgName })

    if (error) {
      console.error('Error generating subdomain:', error)
      // Fallback to simple generation
      const base = orgName.toLowerCase().replace(/[^a-z0-9]/g, '')
      return base.length >= 3 ? base : `${base}gym`
    }

    return data
  }

  // Verify DNS records for custom domain
  async verifyDNSRecords(domain: string): Promise<{
    verified: boolean
    records: Array<{ type: string, name: string, value: string, status: 'verified' | 'pending' | 'failed' }>
  }> {
    // This would integrate with a DNS verification service
    // For now, return mock data
    return {
      verified: false,
      records: [
        { type: 'TXT', name: `_resend.${domain}`, value: 'resend-verification-token', status: 'pending' },
        { type: 'CNAME', name: `mail.${domain}`, value: 'mail.resend.com', status: 'pending' }
      ]
    }
  }

  // Replace variables in template content
  private replaceVariables(content: string, variables: Record<string, string>): string {
    let result = content
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g')
      result = result.replace(regex, value)
    })
    return result
  }

  // Increment template usage count
  private async incrementTemplateUsage(templateId: string): Promise<void> {
    // Get current usage count
    const { data: template } = await this.supabase
      .from('email_templates')
      .select('usage_count')
      .eq('id', templateId)
      .single()

    if (template) {
      await this.supabase
        .from('email_templates')
        .update({
          usage_count: template.usage_count + 1,
          last_used_at: new Date().toISOString()
        })
        .eq('id', templateId)
    }
  }

  // Log email usage
  private async logEmailUsage(logData: {
    to_email: string
    from_email: string
    subject: string
    template_id?: string
    status: string
    error_message?: string
    provider_message_id?: string
    provider_response?: any
    tags?: string[]
    metadata?: Record<string, any>
  }): Promise<void> {
    const config = await this.getEmailConfiguration()
    
    await this.adminSupabase
      .from('email_usage_logs')
      .insert({
        organization_id: this.organizationId,
        email_configuration_id: config?.id,
        ...logData,
        sent_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      })
  }

  // Get email usage statistics
  async getUsageStatistics(startDate?: Date, endDate?: Date): Promise<{
    totalSent: number
    delivered: number
    failed: number
    bounced: number
    dailyUsage: Array<{ date: string, count: number }>
  }> {
    let query = this.supabase
      .from('email_usage_logs')
      .select('status, sent_at')
      .eq('organization_id', this.organizationId)

    if (startDate) {
      query = query.gte('sent_at', startDate.toISOString())
    }
    if (endDate) {
      query = query.lte('sent_at', endDate.toISOString())
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching email statistics:', error)
      return { totalSent: 0, delivered: 0, failed: 0, bounced: 0, dailyUsage: [] }
    }

    const totalSent = data?.length || 0
    const delivered = data?.filter(log => log.status === 'delivered').length || 0
    const failed = data?.filter(log => log.status === 'failed').length || 0
    const bounced = data?.filter(log => log.status === 'bounced').length || 0

    // Group by date for daily usage
    const dailyUsage = data?.reduce((acc: Record<string, number>, log) => {
      const date = new Date(log.sent_at).toISOString().split('T')[0]
      acc[date] = (acc[date] || 0) + 1
      return acc
    }, {}) || {}

    const dailyUsageArray = Object.entries(dailyUsage).map(([date, count]) => ({
      date,
      count
    }))

    return {
      totalSent,
      delivered,
      failed,
      bounced,
      dailyUsage: dailyUsageArray
    }
  }
}