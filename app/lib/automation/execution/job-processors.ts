// Job Processors for Different Automation Types

import { createClient } from '@/app/lib/supabase/server'
import { WorkflowExecutor } from './executor'
import { sendEmail } from '@/app/lib/email'
import { sendSMS } from '@/app/lib/sms'
import { sendWhatsApp } from '@/app/lib/whatsapp'
import { JobType, JobData, JobPriority } from './queue'
import type { ExecutionStatus } from '@/app/lib/types/automation'

// Base Job Processor Interface
export interface JobProcessor {
  type: JobType
  validate(data: JobData): Promise<boolean>
  execute(data: JobData): Promise<any>
  onFailure?(data: JobData, error: Error): Promise<void>
  onSuccess?(data: JobData, result: any): Promise<void>
}

// Abstract Base Job Processor
export abstract class BaseJobProcessor implements JobProcessor {
  abstract type: JobType

  async validate(data: JobData): Promise<boolean> {
    // Basic validation
    if (!data.executionId || !data.organizationId) {
      return false
    }
    return true
  }

  abstract execute(data: JobData): Promise<any>

  async onFailure(data: JobData, error: Error): Promise<void> {
    console.error(`Job processor ${this.type} failed for execution ${data.executionId}:`, error)
    
    // Log failure to database
    const supabase = await createClient()
    try {
      await supabase
        .from('job_execution_logs')
        .insert({
          job_type: this.type,
          execution_id: data.executionId,
          organization_id: data.organizationId,
          status: 'failed',
          error_message: error.message,
          error_stack: error.stack,
          job_data: data,
          created_at: new Date().toISOString()
        })
    } catch (logError) {
      console.error('Failed to log job failure:', logError)
    }
  }

  async onSuccess(data: JobData, result: any): Promise<void> {
    console.log(`Job processor ${this.type} succeeded for execution ${data.executionId}`)
    
    // Log success to database
    const supabase = await createClient()
    try {
      await supabase
        .from('job_execution_logs')
        .insert({
          job_type: this.type,
          execution_id: data.executionId,
          organization_id: data.organizationId,
          status: 'completed',
          result_data: result,
          job_data: data,
          created_at: new Date().toISOString()
        })
    } catch (logError) {
      console.error('Failed to log job success:', logError)
    }
  }

  protected async updateExecutionProgress(
    executionId: string,
    progress: number,
    message?: string
  ): Promise<void> {
    const supabase = await createClient()
    
    try {
      await supabase
        .from('workflow_executions')
        .update({
          progress: Math.max(0, Math.min(100, progress)),
          progress_message: message,
          updated_at: new Date().toISOString()
        })
        .eq('id', executionId)
    } catch (error) {
      console.error('Failed to update execution progress:', error)
    }
  }
}

// Workflow Execution Processor
export class WorkflowExecutionProcessor extends BaseJobProcessor {
  type = JobType.WORKFLOW_EXECUTION

  async validate(data: JobData): Promise<boolean> {
    if (!await super.validate(data)) return false
    
    if (!data.workflowId || !data.triggerData) {
      return false
    }

    // Validate workflow exists and is active
    const supabase = await createClient()
    const { data: workflow, error } = await supabase
      .from('workflows')
      .select('id, status')
      .eq('id', data.workflowId)
      .eq('organization_id', data.organizationId)
      .single()

    return !error && workflow && workflow.status === 'active'
  }

  async execute(data: JobData): Promise<any> {
    const { executionId, workflowId, organizationId, triggerData, context } = data

    await this.updateExecutionProgress(executionId, 10, 'Loading workflow definition')

    // Get workflow
    const supabase = await createClient()
    const { data: workflow, error } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', workflowId)
      .eq('organization_id', organizationId)
      .single()

    if (error || !workflow) {
      throw new Error(`Workflow not found: ${workflowId}`)
    }

    await this.updateExecutionProgress(executionId, 20, 'Initializing workflow executor')

    // Create and execute workflow
    const executor = new WorkflowExecutor(workflow, executionId)
    
    await this.updateExecutionProgress(executionId, 30, 'Starting workflow execution')
    
    const result = await executor.execute(triggerData)

    await this.updateExecutionProgress(executionId, 100, 'Workflow execution completed')

    return result
  }
}

// Lead Qualification Processor
export class LeadQualificationProcessor extends BaseJobProcessor {
  type = JobType.LEAD_QUALIFICATION

  async validate(data: JobData): Promise<boolean> {
    if (!await super.validate(data)) return false
    
    const leadId = data.triggerData?.leadId
    if (!leadId) return false

    // Validate lead exists
    const supabase = await createClient()
    const { data: lead, error } = await supabase
      .from('leads')
      .select('id, organization_id')
      .eq('id', leadId)
      .eq('organization_id', data.organizationId)
      .single()

    return !error && lead
  }

  async execute(data: JobData): Promise<any> {
    const { executionId, organizationId, triggerData } = data
    const leadId = triggerData.leadId

    await this.updateExecutionProgress(executionId, 10, 'Loading lead data')

    const supabase = await createClient()
    
    // Get lead data
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .eq('organization_id', organizationId)
      .single()

    if (leadError || !lead) {
      throw new Error(`Lead not found: ${leadId}`)
    }

    await this.updateExecutionProgress(executionId, 30, 'Analyzing lead data')

    // Perform lead qualification
    const qualificationScore = await this.calculateQualificationScore(lead)
    const qualificationTags = await this.generateQualificationTags(lead, qualificationScore)

    await this.updateExecutionProgress(executionId, 70, 'Updating lead with qualification results')

    // Update lead with qualification results
    const { error: updateError } = await supabase
      .from('leads')
      .update({
        qualification_score: qualificationScore,
        tags: [...(lead.tags || []), ...qualificationTags],
        qualified_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', leadId)

    if (updateError) {
      throw new Error(`Failed to update lead qualification: ${updateError.message}`)
    }

    await this.updateExecutionProgress(executionId, 100, 'Lead qualification completed')

    return {
      leadId,
      qualificationScore,
      qualificationTags,
      qualifiedAt: new Date().toISOString()
    }
  }

  private async calculateQualificationScore(lead: any): Promise<number> {
    let score = 0

    // Basic information score (0-30 points)
    if (lead.name) score += 10
    if (lead.email) score += 10  
    if (lead.phone) score += 10

    // Source quality score (0-20 points)
    const highQualitySources = ['website', 'referral', 'organic_search']
    if (highQualitySources.includes(lead.source)) score += 20
    else if (lead.source) score += 10

    // Engagement score (0-30 points)
    if (lead.form_responses && Object.keys(lead.form_responses).length > 3) score += 20
    if (lead.utm_source || lead.utm_campaign) score += 10

    // Timing score (0-20 points)
    const leadAge = Date.now() - new Date(lead.created_at).getTime()
    const hoursOld = leadAge / (1000 * 60 * 60)
    if (hoursOld < 1) score += 20
    else if (hoursOld < 24) score += 15
    else if (hoursOld < 72) score += 10

    return Math.min(100, score)
  }

  private async generateQualificationTags(lead: any, score: number): Promise<string[]> {
    const tags: string[] = []

    // Score-based tags
    if (score >= 80) tags.push('hot-lead')
    else if (score >= 60) tags.push('warm-lead')
    else if (score >= 40) tags.push('cold-lead')
    else tags.push('unqualified')

    // Source-based tags
    if (lead.source === 'website') tags.push('website-lead')
    if (lead.source === 'facebook') tags.push('social-lead')
    if (lead.source === 'referral') tags.push('referral-lead')

    // Content-based tags
    const responses = lead.form_responses || {}
    if (responses.interests) {
      const interests = Array.isArray(responses.interests) ? responses.interests : [responses.interests]
      interests.forEach((interest: string) => {
        if (interest.toLowerCase().includes('personal training')) tags.push('pt-interested')
        if (interest.toLowerCase().includes('group class')) tags.push('classes-interested')
        if (interest.toLowerCase().includes('nutrition')) tags.push('nutrition-interested')
      })
    }

    // Timing-based tags
    const leadAge = Date.now() - new Date(lead.created_at).getTime()
    const hoursOld = leadAge / (1000 * 60 * 60)
    if (hoursOld < 1) tags.push('immediate-response')
    else if (hoursOld > 72) tags.push('delayed-response')

    return tags.filter((tag, index, self) => self.indexOf(tag) === index) // Remove duplicates
  }
}

// Email Sequence Processor
export class EmailSequenceProcessor extends BaseJobProcessor {
  type = JobType.EMAIL_SEQUENCE

  async validate(data: JobData): Promise<boolean> {
    if (!await super.validate(data)) return false
    
    const { sequenceId, recipientId } = data.triggerData
    if (!sequenceId || !recipientId) return false

    // Validate sequence and recipient exist
    const supabase = await createClient()
    const [sequenceResult, recipientResult] = await Promise.all([
      supabase
        .from('email_sequences')
        .select('id, status')
        .eq('id', sequenceId)
        .eq('organization_id', data.organizationId)
        .single(),
      supabase
        .from('leads')
        .select('id, email')
        .eq('id', recipientId)
        .eq('organization_id', data.organizationId)
        .single()
    ])

    return !sequenceResult.error && !recipientResult.error && 
           sequenceResult.data?.status === 'active' && 
           recipientResult.data?.email
  }

  async execute(data: JobData): Promise<any> {
    const { executionId, organizationId, triggerData } = data
    const { sequenceId, recipientId } = triggerData

    await this.updateExecutionProgress(executionId, 10, 'Loading email sequence')

    const supabase = await createClient()
    
    // Get sequence and recipient
    const [sequenceResult, recipientResult] = await Promise.all([
      supabase
        .from('email_sequences')
        .select('*')
        .eq('id', sequenceId)
        .eq('organization_id', organizationId)
        .single(),
      supabase
        .from('leads')
        .select('*')
        .eq('id', recipientId)
        .eq('organization_id', organizationId)
        .single()
    ])

    if (sequenceResult.error || recipientResult.error) {
      throw new Error('Sequence or recipient not found')
    }

    const sequence = sequenceResult.data
    const recipient = recipientResult.data

    await this.updateExecutionProgress(executionId, 30, 'Processing email sequence steps')

    const results = []
    const emails = sequence.emails || []

    for (let i = 0; i < emails.length; i++) {
      const email = emails[i]
      const progress = 30 + ((i + 1) / emails.length) * 60

      await this.updateExecutionProgress(executionId, progress, `Sending email ${i + 1} of ${emails.length}`)

      try {
        // Check if email should be sent based on conditions
        if (await this.shouldSendEmail(email, recipient, organizationId)) {
          await this.sendSequenceEmail(email, recipient, organizationId)
          
          results.push({
            emailIndex: i,
            emailId: email.id,
            status: 'sent',
            sentAt: new Date().toISOString()
          })

          // Add delay between emails if specified
          if (email.delay && i < emails.length - 1) {
            await new Promise(resolve => setTimeout(resolve, email.delay * 1000))
          }
        } else {
          results.push({
            emailIndex: i,
            emailId: email.id,
            status: 'skipped',
            reason: 'Conditions not met'
          })
        }
      } catch (emailError) {
        results.push({
          emailIndex: i,
          emailId: email.id,
          status: 'failed',
          error: emailError.message
        })
        
        // Continue with next email unless sequence is set to stop on error
        if (sequence.stop_on_error) {
          throw emailError
        }
      }
    }

    await this.updateExecutionProgress(executionId, 100, 'Email sequence completed')

    return {
      sequenceId,
      recipientId,
      emailsSent: results.filter(r => r.status === 'sent').length,
      emailsSkipped: results.filter(r => r.status === 'skipped').length,
      emailsFailed: results.filter(r => r.status === 'failed').length,
      results,
      completedAt: new Date().toISOString()
    }
  }

  private async shouldSendEmail(email: any, recipient: any, organizationId: string): Promise<boolean> {
    if (!email.conditions || email.conditions.length === 0) {
      return true
    }

    // Evaluate email conditions
    for (const condition of email.conditions) {
      const fieldValue = recipient[condition.field]
      
      switch (condition.operator) {
        case 'equals':
          if (fieldValue !== condition.value) return false
          break
        case 'not_equals':
          if (fieldValue === condition.value) return false
          break
        case 'contains':
          if (!fieldValue || !fieldValue.includes(condition.value)) return false
          break
        case 'not_contains':
          if (fieldValue && fieldValue.includes(condition.value)) return false
          break
        case 'has_tag':
          if (!recipient.tags || !recipient.tags.includes(condition.value)) return false
          break
        case 'not_has_tag':
          if (recipient.tags && recipient.tags.includes(condition.value)) return false
          break
        default:
          console.warn(`Unknown email condition operator: ${condition.operator}`)
          return true
      }
    }

    return true
  }

  private async sendSequenceEmail(email: any, recipient: any, organizationId: string): Promise<void> {
    // Replace variables in email content
    const personalizedSubject = this.replaceVariables(email.subject, recipient)
    const personalizedContent = this.replaceVariables(email.content, recipient)

    await sendEmail({
      to: recipient.email,
      subject: personalizedSubject,
      html: personalizedContent,
      organizationId,
      metadata: {
        type: 'sequence',
        sequenceId: email.sequence_id,
        recipientId: recipient.id,
        emailId: email.id
      }
    })

    // Log email sent
    const supabase = await createClient()
    await supabase
      .from('email_logs')
      .insert({
        organization_id: organizationId,
        recipient_id: recipient.id,
        email_id: email.id,
        sequence_id: email.sequence_id,
        to_email: recipient.email,
        subject: personalizedSubject,
        status: 'sent',
        sent_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      })
  }

  private replaceVariables(template: string, recipient: any): string {
    return template
      .replace(/{{name}}/g, recipient.name || 'there')
      .replace(/{{firstName}}/g, (recipient.name || '').split(' ')[0] || 'there')
      .replace(/{{lastName}}/g, (recipient.name || '').split(' ').slice(1).join(' ') || '')
      .replace(/{{email}}/g, recipient.email || '')
      .replace(/{{phone}}/g, recipient.phone || '')
      .replace(/{{source}}/g, recipient.source || 'unknown')
  }
}

// SMS Campaign Processor
export class SMSCampaignProcessor extends BaseJobProcessor {
  type = JobType.SMS_CAMPAIGN

  async validate(data: JobData): Promise<boolean> {
    if (!await super.validate(data)) return false
    
    const { campaignId, recipientId } = data.triggerData
    if (!campaignId || !recipientId) return false

    // Validate campaign and recipient exist
    const supabase = await createClient()
    const [campaignResult, recipientResult] = await Promise.all([
      supabase
        .from('sms_campaigns')
        .select('id, status')
        .eq('id', campaignId)
        .eq('organization_id', data.organizationId)
        .single(),
      supabase
        .from('leads')
        .select('id, phone')
        .eq('id', recipientId)
        .eq('organization_id', data.organizationId)
        .single()
    ])

    return !campaignResult.error && !recipientResult.error && 
           campaignResult.data?.status === 'active' && 
           recipientResult.data?.phone
  }

  async execute(data: JobData): Promise<any> {
    const { executionId, organizationId, triggerData } = data
    const { campaignId, recipientId } = triggerData

    await this.updateExecutionProgress(executionId, 20, 'Loading SMS campaign')

    const supabase = await createClient()
    
    // Get campaign and recipient
    const [campaignResult, recipientResult] = await Promise.all([
      supabase
        .from('sms_campaigns')
        .select('*')
        .eq('id', campaignId)
        .eq('organization_id', organizationId)
        .single(),
      supabase
        .from('leads')
        .select('*')
        .eq('id', recipientId)
        .eq('organization_id', organizationId)
        .single()
    ])

    if (campaignResult.error || recipientResult.error) {
      throw new Error('Campaign or recipient not found')
    }

    const campaign = campaignResult.data
    const recipient = recipientResult.data

    await this.updateExecutionProgress(executionId, 50, 'Personalizing SMS content')

    // Personalize SMS content
    const personalizedMessage = this.replaceVariables(campaign.message, recipient)

    await this.updateExecutionProgress(executionId, 80, 'Sending SMS')

    // Send SMS
    await sendSMS({
      to: recipient.phone,
      body: personalizedMessage,
      organizationId
    })

    // Log SMS sent
    await supabase
      .from('sms_logs')
      .insert({
        organization_id: organizationId,
        campaign_id: campaignId,
        recipient_id: recipientId,
        to_phone: recipient.phone,
        message: personalizedMessage,
        status: 'sent',
        sent_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      })

    await this.updateExecutionProgress(executionId, 100, 'SMS sent successfully')

    return {
      campaignId,
      recipientId,
      message: personalizedMessage,
      sentAt: new Date().toISOString()
    }
  }

  private replaceVariables(template: string, recipient: any): string {
    return template
      .replace(/{{name}}/g, recipient.name || 'there')
      .replace(/{{firstName}}/g, (recipient.name || '').split(' ')[0] || 'there')
      .replace(/{{phone}}/g, recipient.phone || '')
      .replace(/{{source}}/g, recipient.source || 'unknown')
  }
}

// WhatsApp Message Processor
export class WhatsAppMessageProcessor extends BaseJobProcessor {
  type = JobType.WHATSAPP_MESSAGE

  async validate(data: JobData): Promise<boolean> {
    if (!await super.validate(data)) return false
    
    const { recipientId, message } = data.triggerData
    if (!recipientId || !message) return false

    // Validate recipient exists and has phone
    const supabase = await createClient()
    const { data: recipient, error } = await supabase
      .from('leads')
      .select('id, phone')
      .eq('id', recipientId)
      .eq('organization_id', data.organizationId)
      .single()

    return !error && recipient?.phone
  }

  async execute(data: JobData): Promise<any> {
    const { executionId, organizationId, triggerData } = data
    const { recipientId, message, templateName } = triggerData

    await this.updateExecutionProgress(executionId, 20, 'Loading recipient data')

    const supabase = await createClient()
    
    // Get recipient
    const { data: recipient, error } = await supabase
      .from('leads')
      .select('*')
      .eq('id', recipientId)
      .eq('organization_id', organizationId)
      .single()

    if (error || !recipient) {
      throw new Error(`Recipient not found: ${recipientId}`)
    }

    await this.updateExecutionProgress(executionId, 50, 'Personalizing WhatsApp message')

    // Personalize message
    const personalizedMessage = this.replaceVariables(message, recipient)

    await this.updateExecutionProgress(executionId, 80, 'Sending WhatsApp message')

    // Send WhatsApp message
    const result = await sendWhatsApp({
      to: recipient.phone,
      body: personalizedMessage,
      templateName,
      organizationId
    })

    // Log WhatsApp message sent
    await supabase
      .from('whatsapp_logs')
      .insert({
        organization_id: organizationId,
        recipient_id: recipientId,
        to_phone: recipient.phone,
        message: personalizedMessage,
        template_name: templateName,
        status: 'sent',
        external_id: result.id,
        sent_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      })

    await this.updateExecutionProgress(executionId, 100, 'WhatsApp message sent successfully')

    return {
      recipientId,
      message: personalizedMessage,
      templateName,
      externalId: result.id,
      sentAt: new Date().toISOString()
    }
  }

  private replaceVariables(template: string, recipient: any): string {
    return template
      .replace(/{{name}}/g, recipient.name || 'there')
      .replace(/{{firstName}}/g, (recipient.name || '').split(' ')[0] || 'there')
      .replace(/{{phone}}/g, recipient.phone || '')
      .replace(/{{source}}/g, recipient.source || 'unknown')
  }
}

// Data Sync Processor
export class DataSyncProcessor extends BaseJobProcessor {
  type = JobType.DATA_SYNC

  async validate(data: JobData): Promise<boolean> {
    if (!await super.validate(data)) return false
    
    const { syncType, targetId } = data.triggerData
    return syncType && targetId
  }

  async execute(data: JobData): Promise<any> {
    const { executionId, organizationId, triggerData } = data
    const { syncType, targetId, sourceData } = triggerData

    await this.updateExecutionProgress(executionId, 10, `Starting ${syncType} sync`)

    const supabase = await createClient()
    let result: any = {}

    switch (syncType) {
      case 'calendar':
        result = await this.syncCalendarData(organizationId, targetId, sourceData)
        break
      case 'crm':
        result = await this.syncCRMData(organizationId, targetId, sourceData)
        break
      case 'membership':
        result = await this.syncMembershipData(organizationId, targetId, sourceData)
        break
      default:
        throw new Error(`Unknown sync type: ${syncType}`)
    }

    await this.updateExecutionProgress(executionId, 100, `${syncType} sync completed`)

    return {
      syncType,
      targetId,
      result,
      syncedAt: new Date().toISOString()
    }
  }

  private async syncCalendarData(organizationId: string, targetId: string, sourceData: any): Promise<any> {
    // Implement calendar data sync logic
    console.log(`Syncing calendar data for organization ${organizationId}`)
    
    // This would integrate with Google Calendar, Outlook, etc.
    return {
      eventsSync: 0,
      bookingsSync: 0,
      conflicts: 0
    }
  }

  private async syncCRMData(organizationId: string, targetId: string, sourceData: any): Promise<any> {
    // Implement CRM data sync logic
    console.log(`Syncing CRM data for organization ${organizationId}`)
    
    // This would integrate with external CRMs
    return {
      contactsSync: 0,
      dealsSync: 0,
      activitiesSync: 0
    }
  }

  private async syncMembershipData(organizationId: string, targetId: string, sourceData: any): Promise<any> {
    // Implement membership data sync logic
    console.log(`Syncing membership data for organization ${organizationId}`)
    
    // This would sync membership status, payments, etc.
    return {
      membershipsSync: 0,
      paymentsSync: 0,
      statusUpdates: 0
    }
  }
}

// Job Processor Factory
export class JobProcessorFactory {
  private static processors: Map<JobType, JobProcessor> = new Map()

  static {
    // Register all processors
    this.register(new WorkflowExecutionProcessor())
    this.register(new LeadQualificationProcessor())
    this.register(new EmailSequenceProcessor())
    this.register(new SMSCampaignProcessor())
    this.register(new WhatsAppMessageProcessor())
    this.register(new DataSyncProcessor())
  }

  static register(processor: JobProcessor): void {
    this.processors.set(processor.type, processor)
  }

  static get(type: JobType): JobProcessor | null {
    return this.processors.get(type) || null
  }

  static getAll(): JobProcessor[] {
    return Array.from(this.processors.values())
  }

  static async processJob(data: JobData): Promise<any> {
    const processor = this.get(data.type)
    
    if (!processor) {
      throw new Error(`No processor found for job type: ${data.type}`)
    }

    // Validate job data
    const isValid = await processor.validate(data)
    if (!isValid) {
      throw new Error(`Job validation failed for type: ${data.type}`)
    }

    try {
      // Execute job
      const result = await processor.execute(data)
      
      // Call success handler
      if (processor.onSuccess) {
        await processor.onSuccess(data, result)
      }
      
      return result
    } catch (error) {
      // Call failure handler
      if (processor.onFailure) {
        await processor.onFailure(data, error)
      }
      
      throw error
    }
  }
}

// All processors are already exported above