// Automation Trigger System

import { createClient } from '@/app/lib/supabase/server'
import type { TriggerDefinition, Workflow } from '@/app/lib/types/automation'

// Base Trigger Class
export abstract class BaseTrigger {
  protected id: string
  protected config: Record<string, any>
  
  constructor(id: string, config: Record<string, any> = {}) {
    this.id = id
    this.config = config
  }
  
  abstract subscribe(workflowId: string): Promise<void>
  abstract unsubscribe(workflowId: string): Promise<void>
  abstract test(data?: any): Promise<any>
}

// Lead Triggers
export class NewLeadTrigger extends BaseTrigger {
  async subscribe(workflowId: string): Promise<void> {
    const supabase = await createClient()
    
    // Create trigger subscription
    await supabase.from('workflow_triggers').upsert({
      workflow_id: workflowId,
      trigger_type: 'new_lead',
      trigger_config: this.config,
      is_active: true,
    })
    
    // Set up real-time subscription
    const channel = supabase
      .channel(`workflow-${workflowId}-new-lead`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'leads',
          filter: this.buildFilter(),
        },
        async (payload) => {
          // Trigger workflow execution
          await this.triggerWorkflow(workflowId, {
            lead: payload.new,
            source: payload.new.source,
          })
        }
      )
      .subscribe()
  }
  
  async unsubscribe(workflowId: string): Promise<void> {
    const supabase = await createClient()
    
    // Remove trigger subscription
    await supabase
      .from('workflow_triggers')
      .delete()
      .eq('workflow_id', workflowId)
      .eq('trigger_type', 'new_lead')
    
    // Remove real-time subscription
    const channelName = `workflow-${workflowId}-new-lead`
    const channel = supabase.channel(channelName)
    await supabase.removeChannel(channel)
  }
  
  async test(data?: any): Promise<any> {
    return {
      lead: {
        id: 'test-lead-123',
        name: 'Test Lead',
        email: 'test@example.com',
        phone: '+1234567890',
        source: data?.source || 'website',
        created_at: new Date().toISOString(),
      },
      source: data?.source || 'website',
    }
  }
  
  private buildFilter(): string {
    if (this.config.source) {
      return `source=eq.${this.config.source}`
    }
    if (this.config.tags?.length > 0) {
      return `tags@>${JSON.stringify(this.config.tags)}`
    }
    return ''
  }
  
  protected async triggerWorkflow(workflowId: string, data: any) {
    const { enqueueWorkflowExecution } = await import('../execution/queue')
    await enqueueWorkflowExecution(workflowId, data)
  }
}

export class LeadUpdatedTrigger extends BaseTrigger {
  async subscribe(workflowId: string): Promise<void> {
    const supabase = await createClient()
    
    await supabase.from('workflow_triggers').upsert({
      workflow_id: workflowId,
      trigger_type: 'lead_updated',
      trigger_config: this.config,
      is_active: true,
    })
    
    const channel = supabase
      .channel(`workflow-${workflowId}-lead-updated`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'leads',
        },
        async (payload) => {
          // Check if specific fields were updated
          if (this.shouldTrigger(payload.old, payload.new)) {
            await this.triggerWorkflow(workflowId, {
              lead: payload.new,
              changes: this.getChanges(payload.old, payload.new),
            })
          }
        }
      )
      .subscribe()
  }
  
  async unsubscribe(workflowId: string): Promise<void> {
    const supabase = await createClient()
    
    await supabase
      .from('workflow_triggers')
      .delete()
      .eq('workflow_id', workflowId)
      .eq('trigger_type', 'lead_updated')
    
    const channelName = `workflow-${workflowId}-lead-updated`
    const channel = supabase.channel(channelName)
    await supabase.removeChannel(channel)
  }
  
  async test(data?: any): Promise<any> {
    return {
      lead: {
        id: 'test-lead-123',
        name: 'Updated Lead',
        email: 'updated@example.com',
        stage: 'qualified',
      },
      changes: {
        stage: { old: 'new', new: 'qualified' },
      },
    }
  }
  
  private shouldTrigger(oldData: any, newData: any): boolean {
    if (!this.config.fields || this.config.fields.length === 0) {
      return true
    }
    
    return this.config.fields.some((field: string) => 
      oldData[field] !== newData[field]
    )
  }
  
  private getChanges(oldData: any, newData: any): Record<string, any> {
    const changes: Record<string, any> = {}
    
    Object.keys(newData).forEach(key => {
      if (oldData[key] !== newData[key]) {
        changes[key] = {
          old: oldData[key],
          new: newData[key],
        }
      }
    })
    
    return changes
  }
  
  protected async triggerWorkflow(workflowId: string, data: any) {
    const { enqueueWorkflowExecution } = await import('../execution/queue')
    await enqueueWorkflowExecution(workflowId, data)
  }
}

// Communication Triggers
export class EmailOpenedTrigger extends BaseTrigger {
  async subscribe(workflowId: string): Promise<void> {
    const supabase = await createClient()
    
    await supabase.from('workflow_triggers').upsert({
      workflow_id: workflowId,
      trigger_type: 'email_opened',
      trigger_config: this.config,
      is_active: true,
    })
    
    // Listen for email tracking events
    const channel = supabase
      .channel(`workflow-${workflowId}-email-opened`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'email_events',
          filter: 'event_type=eq.opened',
        },
        async (payload) => {
          if (this.matchesCampaign(payload.new)) {
            await this.triggerWorkflow(workflowId, {
              email: payload.new.email,
              openedAt: payload.new.created_at,
              campaignId: payload.new.campaign_id,
            })
          }
        }
      )
      .subscribe()
  }
  
  async unsubscribe(workflowId: string): Promise<void> {
    const supabase = await createClient()
    
    await supabase
      .from('workflow_triggers')
      .delete()
      .eq('workflow_id', workflowId)
      .eq('trigger_type', 'email_opened')
    
    const channelName = `workflow-${workflowId}-email-opened`
    const channel = supabase.channel(channelName)
    await supabase.removeChannel(channel)
  }
  
  async test(data?: any): Promise<any> {
    return {
      email: 'test@example.com',
      openedAt: new Date().toISOString(),
      campaignId: data?.campaignId || 'test-campaign',
    }
  }
  
  private matchesCampaign(event: any): boolean {
    if (!this.config.campaignId) return true
    return event.campaign_id === this.config.campaignId
  }
  
  protected async triggerWorkflow(workflowId: string, data: any) {
    const { enqueueWorkflowExecution } = await import('../execution/queue')
    await enqueueWorkflowExecution(workflowId, data)
  }
}

export class FormSubmittedTrigger extends BaseTrigger {
  async subscribe(workflowId: string): Promise<void> {
    const supabase = await createClient()
    
    await supabase.from('workflow_triggers').upsert({
      workflow_id: workflowId,
      trigger_type: 'form_submitted',
      trigger_config: this.config,
      is_active: true,
    })
    
    const channel = supabase
      .channel(`workflow-${workflowId}-form-submitted`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'form_submissions',
          filter: this.config.formId ? `form_id=eq.${this.config.formId}` : '',
        },
        async (payload) => {
          await this.triggerWorkflow(workflowId, {
            formData: payload.new.data,
            formId: payload.new.form_id,
            submittedAt: payload.new.created_at,
          })
        }
      )
      .subscribe()
  }
  
  async unsubscribe(workflowId: string): Promise<void> {
    const supabase = await createClient()
    
    await supabase
      .from('workflow_triggers')
      .delete()
      .eq('workflow_id', workflowId)
      .eq('trigger_type', 'form_submitted')
    
    const channelName = `workflow-${workflowId}-form-submitted`
    const channel = supabase.channel(channelName)
    await supabase.removeChannel(channel)
  }
  
  async test(data?: any): Promise<any> {
    return {
      formData: {
        name: 'Test User',
        email: 'test@example.com',
        message: 'Test form submission',
        ...data?.formData,
      },
      formId: data?.formId || 'test-form',
      submittedAt: new Date().toISOString(),
    }
  }
  
  protected async triggerWorkflow(workflowId: string, data: any) {
    const { enqueueWorkflowExecution } = await import('../execution/queue')
    await enqueueWorkflowExecution(workflowId, data)
  }
}

// Schedule Triggers
export class ScheduleTrigger extends BaseTrigger {
  async subscribe(workflowId: string): Promise<void> {
    const supabase = await createClient()
    
    // Create schedule trigger record
    const { data: trigger } = await supabase
      .from('schedule_triggers')
      .upsert({
        workflow_id: workflowId,
        schedule_type: this.config.scheduleType || 'cron',
        schedule_config: {
          cronExpression: this.config.cronExpression,
          interval: this.config.interval,
          timezone: this.config.timezone || 'Europe/London',
        },
        timezone: this.config.timezone || 'Europe/London',
        next_run_at: this.calculateNextRun(),
        is_active: true,
      })
      .select()
      .single()
    
    if (trigger) {
      // Register with scheduler service
      await this.registerSchedule(trigger.id, workflowId)
    }
  }
  
  async unsubscribe(workflowId: string): Promise<void> {
    const supabase = await createClient()
    
    const { data: trigger } = await supabase
      .from('schedule_triggers')
      .select('id')
      .eq('workflow_id', workflowId)
      .single()
    
    if (trigger) {
      // Unregister from scheduler service
      await this.unregisterSchedule(trigger.id)
      
      // Delete trigger record
      await supabase
        .from('schedule_triggers')
        .delete()
        .eq('id', trigger.id)
    }
  }
  
  async test(data?: any): Promise<any> {
    return {
      scheduledTime: new Date().toISOString(),
      timezone: this.config.timezone || 'Europe/London',
    }
  }
  
  private calculateNextRun(): string {
    // TODO: Implement cron expression parsing
    const next = new Date()
    next.setHours(next.getHours() + 1)
    return next.toISOString()
  }
  
  private async registerSchedule(triggerId: string, workflowId: string) {
    // TODO: Register with BullMQ scheduler
    const { scheduleWorkflow } = await import('../execution/scheduler')
    await scheduleWorkflow(triggerId, workflowId, this.config as any)
  }
  
  private async unregisterSchedule(triggerId: string) {
    // TODO: Unregister from BullMQ scheduler
    const { unscheduleWorkflow } = await import('../execution/scheduler')
    await unscheduleWorkflow(triggerId)
  }
}

// Webhook Trigger
export class WebhookTrigger extends BaseTrigger {
  async subscribe(workflowId: string): Promise<void> {
    const supabase = await createClient()
    
    // Generate unique endpoint
    const endpointId = `wh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const secret = this.generateSecret()
    
    const { data: webhook } = await supabase
      .from('webhook_triggers')
      .upsert({
        workflow_id: workflowId,
        name: this.config.name || 'Webhook Trigger',
        endpoint_id: endpointId,
        secret: secret,
        is_active: true,
      })
      .select()
      .single()
    
    if (webhook) {
      // Store webhook config for the workflow
      await supabase.from('workflow_triggers').upsert({
        workflow_id: workflowId,
        trigger_type: 'webhook',
        trigger_config: {
          ...this.config,
          webhookId: webhook.id,
          endpoint: `/api/webhooks/automation/${endpointId}`,
          secret: secret,
        },
        is_active: true,
      })
    }
  }
  
  async unsubscribe(workflowId: string): Promise<void> {
    const supabase = await createClient()
    
    // Delete webhook trigger
    await supabase
      .from('webhook_triggers')
      .delete()
      .eq('workflow_id', workflowId)
    
    // Delete workflow trigger
    await supabase
      .from('workflow_triggers')
      .delete()
      .eq('workflow_id', workflowId)
      .eq('trigger_type', 'webhook')
  }
  
  async test(data?: any): Promise<any> {
    return {
      body: data?.body || { test: true },
      headers: data?.headers || { 'content-type': 'application/json' },
      method: data?.method || 'POST',
    }
  }
  
  private generateSecret(): string {
    return `whsec_${Math.random().toString(36).substr(2, 32)}`
  }
}

// AI Triggers
export class ChurnRiskTrigger extends BaseTrigger {
  async subscribe(workflowId: string): Promise<void> {
    const supabase = await createClient()
    
    await supabase.from('workflow_triggers').upsert({
      workflow_id: workflowId,
      trigger_type: 'ai_churn_risk',
      trigger_config: this.config,
      is_active: true,
    })
    
    // Listen for AI analysis events
    const channel = supabase
      .channel(`workflow-${workflowId}-churn-risk`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ai_insights',
          filter: 'type=eq.churn_risk',
        },
        async (payload) => {
          const threshold = this.config.threshold || 0.7
          if (payload.new.score >= threshold) {
            await this.triggerWorkflow(workflowId, {
              client: payload.new.client_data,
              riskScore: payload.new.score,
              factors: payload.new.factors,
            })
          }
        }
      )
      .subscribe()
  }
  
  async unsubscribe(workflowId: string): Promise<void> {
    const supabase = await createClient()
    
    await supabase
      .from('workflow_triggers')
      .delete()
      .eq('workflow_id', workflowId)
      .eq('trigger_type', 'ai_churn_risk')
    
    const channelName = `workflow-${workflowId}-churn-risk`
    const channel = supabase.channel(channelName)
    await supabase.removeChannel(channel)
  }
  
  async test(data?: any): Promise<any> {
    return {
      client: {
        id: 'test-client-123',
        name: 'Test Client',
        lastActivity: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
      riskScore: data?.riskScore || 0.85,
      factors: [
        'No activity in 30 days',
        'Declined last renewal',
        'Support tickets increased',
      ],
    }
  }
  
  protected async triggerWorkflow(workflowId: string, data: any) {
    const { enqueueWorkflowExecution } = await import('../execution/queue')
    await enqueueWorkflowExecution(workflowId, data)
  }
}

// Trigger Factory
export class TriggerFactory {
  private static triggers: Map<string, any> = new Map()
  
  static {
    // Initialize triggers
    this.triggers.set('new_lead', NewLeadTrigger)    
    this.triggers.set('lead_updated', LeadUpdatedTrigger)
    this.triggers.set('email_opened', EmailOpenedTrigger)
    this.triggers.set('form_submitted', FormSubmittedTrigger)
    this.triggers.set('scheduled', ScheduleTrigger)
    this.triggers.set('webhook', WebhookTrigger)
    this.triggers.set('ai_churn_risk', ChurnRiskTrigger)
  }
  
  static create(type: string, config: Record<string, any>): BaseTrigger {
    const TriggerClass = this.triggers.get(type)
    if (!TriggerClass) {
      throw new Error(`Unknown trigger type: ${type}`)
    }
    return new TriggerClass(type, config)
  }
  
  static register(type: string, triggerClass: any) {
    this.triggers.set(type, triggerClass)
  }
}