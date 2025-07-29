import { Resend } from 'resend'
import { logger } from '../logger/logger'
import { activityLogger } from '../logger/activity-logger'
import { createClient } from '../supabase/server'
import { render } from '@react-email/render'

// Import email templates
import WelcomeLeadEmail from '@/emails/templates/WelcomeLead'
import ClientWelcomeEmail from '@/emails/templates/ClientWelcome'
import StaffTaskNotificationEmail from '@/emails/templates/StaffTaskNotification'

// Initialize Resend (will be created when needed)
let resend: Resend | null = null

function getResendClient() {
  if (!resend && process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY)
  }
  if (!resend) {
    throw new Error('Resend API key not configured')
  }
  return resend
}

// Email template types
export type EmailTemplate = 
  | 'welcome-lead'
  | 'client-welcome'
  | 'staff-task'
  | 'password-reset'
  | 'class-reminder'
  | 'payment-receipt'
  | 'membership-expiring'

// Email send options
export interface SendEmailOptions {
  to: string | string[]
  template: EmailTemplate
  subject?: string
  variables: Record<string, any>
  replyTo?: string
  attachments?: Array<{
    filename: string
    content: Buffer | string
  }>
  userId?: string
  entityId?: string
  entityType?: 'lead' | 'client' | 'task'
}

// Email send result
export interface SendEmailResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Get email template component and default subject
 */
function getEmailTemplate(template: EmailTemplate, variables: Record<string, any>) {
  switch (template) {
    case 'welcome-lead':
      return {
        component: WelcomeLeadEmail(variables as any),
        defaultSubject: `Welcome to ${variables.gymName || 'Atlas Fitness'}! Book Your Free Tour`,
      }
    
    case 'client-welcome':
      return {
        component: ClientWelcomeEmail(variables as any),
        defaultSubject: `Welcome to the ${variables.gymName || 'Atlas Fitness'} Family!`,
      }
    
    case 'staff-task':
      const priority = variables.taskPriority || 'medium'
      const emoji = priority === 'urgent' ? '🚨' : priority === 'high' ? '⚡' : '📋'
      return {
        component: StaffTaskNotificationEmail(variables as any),
        defaultSubject: `${emoji} New Task: ${variables.taskTitle}`,
      }
    
    default:
      throw new Error(`Unknown email template: ${template}`)
  }
}

/**
 * Send an email using Resend
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const startTime = Date.now()
  
  try {
    // Validate required fields
    if (!options.to || !options.template) {
      throw new Error('Missing required fields: to and template')
    }
    
    // Get template and render
    const { component, defaultSubject } = getEmailTemplate(options.template, options.variables)
    const subject = options.subject || defaultSubject
    
    // Render email to HTML and text
    const html = await render(component)
    const text = await render(component, { plainText: true })
    
    // Check for from email configuration
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
    
    // Prepare email data
    const emailData = {
      from: `${options.variables.gymName || 'Atlas Fitness'} <${fromEmail}>`,
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject,
      html,
      text,
      replyTo: options.replyTo,
      attachments: options.attachments,
    }
    
    console.log('Sending email with:', {
      from: emailData.from,
      to: emailData.to,
      subject: emailData.subject,
      hasHtml: !!emailData.html,
      hasText: !!emailData.text
    })
    
    // Send email
    const result = await getResendClient().emails.send(emailData)
    
    // Check if the send was successful
    if ('error' in result && result.error) {
      throw new Error(result.error.message || 'Failed to send email')
    }
    
    // Log success
    const duration = Date.now() - startTime
    logger.info('Email sent successfully', {
      metadata: {
        template: options.template,
        to: Array.isArray(options.to) ? options.to.length + ' recipients' : options.to,
        messageId: result.data?.id,
        duration,
      }
    })
    
    // Log activity if user context provided
    if (options.userId && options.entityId) {
      activityLogger.emailSent(
        options.userId,
        options.entityId,
        options.variables.recipientName || 'Recipient',
        subject
      )
    }
    
    // Save to database for tracking
    await saveEmailRecord({
      messageId: result.data?.id,
      template: options.template,
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject,
      status: 'sent',
      sentAt: new Date(),
      userId: options.userId,
      entityId: options.entityId,
      entityType: options.entityType,
    })
    
    return {
      success: true,
      messageId: result.data?.id,
    }
    
  } catch (error) {
    // Log error
    logger.error('Failed to send email', error as Error, {
      metadata: {
        template: options.template,
        to: options.to,
      }
    })
    
    // Save failed attempt
    await saveEmailRecord({
      template: options.template,
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject || 'Failed to send',
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      sentAt: new Date(),
      userId: options.userId,
      entityId: options.entityId,
      entityType: options.entityType,
    })
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    }
  }
}

/**
 * Send bulk emails with rate limiting
 */
export async function sendBulkEmails(
  recipients: Array<{ email: string; variables: Record<string, any> }>,
  template: EmailTemplate,
  options?: {
    subject?: string
    replyTo?: string
    batchSize?: number
    delayMs?: number
    userId?: string
  }
): Promise<{
  sent: number
  failed: number
  results: SendEmailResult[]
}> {
  const batchSize = options?.batchSize || 10
  const delayMs = options?.delayMs || 1000
  const results: SendEmailResult[] = []
  let sent = 0
  let failed = 0
  
  // Process in batches
  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize)
    
    // Send emails in parallel within batch
    const batchPromises = batch.map(recipient =>
      sendEmail({
        to: recipient.email,
        template,
        subject: options?.subject,
        variables: recipient.variables,
        replyTo: options?.replyTo,
        userId: options?.userId,
      })
    )
    
    const batchResults = await Promise.allSettled(batchPromises)
    
    // Process results
    batchResults.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.success) {
        sent++
        results.push(result.value)
      } else {
        failed++
        results.push({
          success: false,
          error: result.status === 'rejected' 
            ? result.reason?.message || 'Unknown error'
            : result.value.error || 'Failed to send',
        })
      }
    })
    
    // Delay between batches (except for last batch)
    if (i + batchSize < recipients.length) {
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
    
    // Log progress
    logger.info(`Bulk email progress: ${i + batch.length}/${recipients.length}`, {
      metadata: {
        template,
        sent,
        failed,
        total: recipients.length,
      }
    })
  }
  
  return { sent, failed, results }
}

/**
 * Save email record to database
 */
async function saveEmailRecord(record: {
  messageId?: string
  template: string
  to: string[]
  subject: string
  status: 'sent' | 'failed'
  error?: string
  sentAt: Date
  userId?: string
  entityId?: string
  entityType?: string
}) {
  try {
    const supabase = await createClient()
    
    const { error } = await supabase
      .from('email_logs')
      .insert({
        message_id: record.messageId,
        template: record.template,
        to_addresses: record.to,
        subject: record.subject,
        status: record.status,
        error: record.error,
        sent_at: record.sentAt,
        user_id: record.userId,
        entity_id: record.entityId,
        entity_type: record.entityType,
      })
    
    if (error) {
      logger.warn('Failed to save email record', {
        metadata: { error: error.message }
      })
    }
  } catch (error) {
    // Don't throw - logging failure shouldn't break email sending
    logger.warn('Failed to save email record', {
      metadata: { error: error instanceof Error ? error.message : 'Unknown error' }
    })
  }
}

// Retry configuration for critical emails
export async function sendEmailWithRetry(
  options: SendEmailOptions,
  maxRetries: number = 3,
  retryDelay: number = 1000
): Promise<SendEmailResult> {
  let lastError: Error | undefined
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await sendEmail(options)
      if (result.success) {
        return result
      }
      
      // If it failed but not an error, don't retry
      if (!result.error?.includes('rate limit') && !result.error?.includes('timeout')) {
        return result
      }
      
      lastError = new Error(result.error)
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error')
    }
    
    // Wait before retry (exponential backoff)
    if (attempt < maxRetries) {
      const delay = retryDelay * Math.pow(2, attempt)
      logger.info(`Retrying email send in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  return {
    success: false,
    error: lastError?.message || 'Failed after retries',
  }
}

// Example usage:
/*
// Send a welcome email to a new lead
await sendEmail({
  to: 'lead@example.com',
  template: 'welcome-lead',
  variables: {
    leadName: 'John Doe',
    gymName: 'Atlas Fitness Downtown',
    tourBookingUrl: 'https://app.atlasfitness.com/book-tour',
    contactPhone: '(555) 123-4567',
    contactEmail: 'info@atlasfitness.com',
    gymAddress: '123 Main St, City, State 12345',
  },
  userId: currentUser.id,
  entityId: lead.id,
  entityType: 'lead',
})

// Send bulk welcome emails
const newLeads = [...] // Array of leads
await sendBulkEmails(
  newLeads.map(lead => ({
    email: lead.email,
    variables: {
      leadName: lead.name,
      gymName: 'Atlas Fitness',
      // ... other variables
    }
  })),
  'welcome-lead',
  {
    batchSize: 20,
    delayMs: 500,
    userId: currentUser.id,
  }
)
*/