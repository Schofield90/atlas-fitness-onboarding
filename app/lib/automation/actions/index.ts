// Automation Action Library

import { createClient } from '@/app/lib/supabase/server'
import type { ActionDefinition, ExecutionContext } from '@/app/lib/types/automation'

// Base Action Class
export abstract class BaseAction {
  protected id: string
  protected config: Record<string, any>
  protected context: ExecutionContext
  
  constructor(id: string, config: Record<string, any> = {}, context: ExecutionContext) {
    this.id = id
    this.config = config
    this.context = context
  }
  
  abstract execute(input: Record<string, any>): Promise<Record<string, any>>
  abstract validate(): Promise<boolean>
  
  protected resolveVariables(value: any): any {
    if (typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}')) {
      const varName = value.slice(2, -2).trim()
      return this.getVariable(varName)
    }
    
    if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        return value.map(item => this.resolveVariables(item))
      }
      
      const resolved: Record<string, any> = {}
      for (const [key, val] of Object.entries(value)) {
        resolved[key] = this.resolveVariables(val)
      }
      return resolved
    }
    
    return value
  }
  
  protected getVariable(path: string): any {
    const parts = path.split('.')
    let value: any = this.context.variables
    
    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = value[part]
      } else {
        return undefined
      }
    }
    
    return value
  }
  
  protected setVariable(name: string, value: any) {
    this.context.variables[name] = value
  }
}

// Communication Actions
export class SendEmailAction extends BaseAction {
  async execute(input: Record<string, any>): Promise<Record<string, any>> {
    const to = this.resolveVariables(this.config.to || input.to)
    const subject = this.resolveVariables(this.config.subject || input.subject)
    const body = this.resolveVariables(this.config.body || input.body)
    const templateId = this.config.templateId || input.templateId
    
    if (!to || (!body && !templateId)) {
      throw new Error('Email recipient and content are required')
    }
    
    // TODO: Integrate with email service
    const emailData = {
      to,
      subject,
      body,
      templateId,
      templateVariables: this.resolveVariables(this.config.templateVariables || {}),
    }
    
    // Simulate email sending
    const messageId = `msg_${Date.now()}`
    
    // Log email activity
    const supabase = await createClient()
    await supabase.from('email_logs').insert({
      message_id: messageId,
      to: to,
      subject: subject,
      status: 'sent',
      workflow_execution_id: this.context.executionPath[0],
    })
    
    return {
      messageId,
      status: 'sent',
      to,
      subject,
    }
  }
  
  async validate(): Promise<boolean> {
    return !!(this.config.to && (this.config.body || this.config.templateId))
  }
}

export class SendSMSAction extends BaseAction {
  async execute(input: Record<string, any>): Promise<Record<string, any>> {
    const to = this.resolveVariables(this.config.to || input.to)
    const message = this.resolveVariables(this.config.message || input.message)
    
    if (!to || !message) {
      throw new Error('Phone number and message are required')
    }
    
    // TODO: Integrate with SMS service (Twilio, etc.)
    const messageId = `sms_${Date.now()}`
    
    // Log SMS activity
    const supabase = await createClient()
    await supabase.from('sms_logs').insert({
      message_id: messageId,
      to: to,
      message: message,
      status: 'sent',
      workflow_execution_id: this.context.executionPath[0],
    })
    
    return {
      messageId,
      status: 'sent',
      to,
      charactersCount: message.length,
    }
  }
  
  async validate(): Promise<boolean> {
    return !!(this.config.to && this.config.message)
  }
}

export class SendWhatsAppAction extends BaseAction {
  async execute(input: Record<string, any>): Promise<Record<string, any>> {
    const to = this.resolveVariables(this.config.to || input.to)
    const message = this.resolveVariables(this.config.message || input.message)
    const mediaUrl = this.resolveVariables(this.config.mediaUrl || input.mediaUrl)
    
    if (!to || !message) {
      throw new Error('Phone number and message are required')
    }
    
    // TODO: Integrate with WhatsApp Business API
    const messageId = `wa_${Date.now()}`
    
    return {
      messageId,
      status: 'sent',
      to,
      hasMedia: !!mediaUrl,
    }
  }
  
  async validate(): Promise<boolean> {
    return !!(this.config.to && this.config.message)
  }
}

export class SendSlackAction extends BaseAction {
  async execute(input: Record<string, any>): Promise<Record<string, any>> {
    const channel = this.resolveVariables(this.config.channel || input.channel)
    const message = this.resolveVariables(this.config.message || input.message)
    const webhook = this.config.webhookUrl
    
    if (!webhook || !message) {
      throw new Error('Slack webhook URL and message are required')
    }
    
    // Send to Slack webhook
    const response = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel,
        text: message,
        username: 'Gymleadhub Automation',
      }),
    })
    
    return {
      status: response.ok ? 'sent' : 'failed',
      channel,
    }
  }
  
  async validate(): Promise<boolean> {
    return !!(this.config.webhookUrl && this.config.message)
  }
}

// CRM Actions
export class UpdateLeadAction extends BaseAction {
  async execute(input: Record<string, any>): Promise<Record<string, any>> {
    const leadId = this.resolveVariables(this.config.leadId || input.leadId)
    const updates = this.resolveVariables(this.config.updates || input.updates)
    
    if (!leadId || !updates) {
      throw new Error('Lead ID and updates are required')
    }
    
    const supabase = await createClient()
    const { data: lead, error } = await supabase
      .from('leads')
      .update(updates)
      .eq('id', leadId)
      .select()
      .single()
    
    if (error) {
      throw new Error(`Failed to update lead: ${error.message}`)
    }
    
    return {
      lead,
      updated: true,
      updatedFields: Object.keys(updates),
    }
  }
  
  async validate(): Promise<boolean> {
    return !!(this.config.leadId && this.config.updates)
  }
}

export class AddTagAction extends BaseAction {
  async execute(input: Record<string, any>): Promise<Record<string, any>> {
    const entityId = this.resolveVariables(this.config.entityId || input.entityId)
    const entityType = this.config.entityType || input.entityType || 'lead'
    const tag = this.resolveVariables(this.config.tag || input.tag)
    
    if (!entityId || !tag) {
      throw new Error('Entity ID and tag are required')
    }
    
    const supabase = await createClient()
    const table = entityType === 'lead' ? 'leads' : 'clients'
    
    // Get current tags
    const { data: entity, error: fetchError } = await supabase
      .from(table)
      .select('tags')
      .eq('id', entityId)
      .single()
    
    if (fetchError) {
      throw new Error(`Failed to fetch ${entityType}: ${fetchError.message}`)
    }
    
    const currentTags = entity.tags || []
    if (!currentTags.includes(tag)) {
      currentTags.push(tag)
      
      const { error: updateError } = await supabase
        .from(table)
        .update({ tags: currentTags })
        .eq('id', entityId)
      
      if (updateError) {
        throw new Error(`Failed to add tag: ${updateError.message}`)
      }
    }
    
    return {
      success: true,
      entityId,
      tag,
      allTags: currentTags,
    }
  }
  
  async validate(): Promise<boolean> {
    return !!(this.config.entityId && this.config.tag)
  }
}

export class ChangeStageAction extends BaseAction {
  async execute(input: Record<string, any>): Promise<Record<string, any>> {
    const leadId = this.resolveVariables(this.config.leadId || input.leadId)
    const stage = this.resolveVariables(this.config.stage || input.stage)
    
    if (!leadId || !stage) {
      throw new Error('Lead ID and stage are required')
    }
    
    const supabase = await createClient()
    
    // Get current stage
    const { data: lead, error: fetchError } = await supabase
      .from('leads')
      .select('stage')
      .eq('id', leadId)
      .single()
    
    if (fetchError) {
      throw new Error(`Failed to fetch lead: ${fetchError.message}`)
    }
    
    const previousStage = lead.stage
    
    // Update stage
    const { error: updateError } = await supabase
      .from('leads')
      .update({ stage, stage_changed_at: new Date().toISOString() })
      .eq('id', leadId)
    
    if (updateError) {
      throw new Error(`Failed to change stage: ${updateError.message}`)
    }
    
    // Log stage change
    await supabase.from('lead_stage_history').insert({
      lead_id: leadId,
      from_stage: previousStage,
      to_stage: stage,
      changed_by: 'automation',
      workflow_execution_id: this.context.executionPath[0],
    })
    
    return {
      previousStage,
      newStage: stage,
      leadId,
    }
  }
  
  async validate(): Promise<boolean> {
    return !!(this.config.leadId && this.config.stage)
  }
}

export class AssignToUserAction extends BaseAction {
  async execute(input: Record<string, any>): Promise<Record<string, any>> {
    const entityId = this.resolveVariables(this.config.entityId || input.entityId)
    const entityType = this.config.entityType || input.entityType || 'lead'
    const userId = this.resolveVariables(this.config.userId || input.userId)
    
    if (!entityId || !userId) {
      throw new Error('Entity ID and user ID are required')
    }
    
    const supabase = await createClient()
    const table = entityType === 'lead' ? 'leads' : 'clients'
    
    const { error } = await supabase
      .from(table)
      .update({ assigned_to: userId })
      .eq('id', entityId)
    
    if (error) {
      throw new Error(`Failed to assign ${entityType}: ${error.message}`)
    }
    
    // Send notification to assigned user
    await supabase.from('notifications').insert({
      user_id: userId,
      type: 'assignment',
      title: `New ${entityType} assigned`,
      message: `You have been assigned a new ${entityType}`,
      data: { entityId, entityType },
    })
    
    return {
      success: true,
      entityId,
      assignedTo: userId,
    }
  }
  
  async validate(): Promise<boolean> {
    return !!(this.config.entityId && this.config.userId)
  }
}

// Task Actions
export class CreateTaskAction extends BaseAction {
  async execute(input: Record<string, any>): Promise<Record<string, any>> {
    const title = this.resolveVariables(this.config.title || input.title)
    const description = this.resolveVariables(this.config.description || input.description)
    const assignTo = this.resolveVariables(this.config.assignTo || input.assignTo)
    const dueDate = this.resolveVariables(this.config.dueDate || input.dueDate)
    const priority = this.config.priority || input.priority || 'medium'
    
    if (!title) {
      throw new Error('Task title is required')
    }
    
    const supabase = await createClient()
    const { data: task, error } = await supabase
      .from('tasks')
      .insert({
        title,
        description,
        assigned_to: assignTo,
        due_date: dueDate,
        priority,
        status: 'pending',
        created_by: 'automation',
        workflow_execution_id: this.context.executionPath[0],
      })
      .select()
      .single()
    
    if (error) {
      throw new Error(`Failed to create task: ${error.message}`)
    }
    
    return {
      taskId: task.id,
      task,
    }
  }
  
  async validate(): Promise<boolean> {
    return !!this.config.title
  }
}

// Calendar Actions
export class BookAppointmentAction extends BaseAction {
  async execute(input: Record<string, any>): Promise<Record<string, any>> {
    const title = this.resolveVariables(this.config.title || input.title)
    const startTime = this.resolveVariables(this.config.startTime || input.startTime)
    const duration = this.config.duration || input.duration || 30
    const attendees = this.resolveVariables(this.config.attendees || input.attendees || [])
    
    if (!title || !startTime) {
      throw new Error('Title and start time are required')
    }
    
    const endTime = new Date(new Date(startTime).getTime() + duration * 60000).toISOString()
    
    const supabase = await createClient()
    const { data: event, error } = await supabase
      .from('calendar_events')
      .insert({
        title,
        start_time: startTime,
        end_time: endTime,
        attendees,
        status: 'confirmed',
        created_by: 'automation',
        workflow_execution_id: this.context.executionPath[0],
      })
      .select()
      .single()
    
    if (error) {
      throw new Error(`Failed to book appointment: ${error.message}`)
    }
    
    return {
      eventId: event.id,
      event,
    }
  }
  
  async validate(): Promise<boolean> {
    return !!(this.config.title && this.config.startTime)
  }
}

// AI Actions
export class AIAnalyzeAction extends BaseAction {
  async execute(input: Record<string, any>): Promise<Record<string, any>> {
    const data = this.resolveVariables(this.config.data || input.data)
    const analysisType = this.config.analysisType || input.analysisType || 'general'
    
    if (!data) {
      throw new Error('Data for analysis is required')
    }
    
    // TODO: Integrate with AI service
    // For now, simulate AI analysis
    const analysis = {
      sentiment: 'positive',
      confidence: 0.85,
      insights: [
        'High engagement potential',
        'Likely to convert',
        'Recommend follow-up within 24 hours',
      ],
      recommendations: {
        nextAction: 'send_personalized_offer',
        priority: 'high',
      },
    }
    
    return {
      analysis,
      analysisType,
      processedAt: new Date().toISOString(),
    }
  }
  
  async validate(): Promise<boolean> {
    return !!this.config.data
  }
}

export class AIGenerateContentAction extends BaseAction {
  async execute(input: Record<string, any>): Promise<Record<string, any>> {
    const prompt = this.resolveVariables(this.config.prompt || input.prompt)
    const contentType = this.config.contentType || input.contentType || 'email'
    const variables = this.resolveVariables(this.config.variables || input.variables || {})
    
    if (!prompt) {
      throw new Error('Prompt is required')
    }
    
    // TODO: Integrate with OpenAI or other AI service
    // For now, simulate content generation
    let content = ''
    
    switch (contentType) {
      case 'email':
        content = `Subject: Exclusive Offer for ${variables.name || 'You'}!\n\nDear ${variables.name || 'Valued Customer'},\n\nWe have an exciting opportunity tailored just for you...`
        break
      case 'sms':
        content = `Hi ${variables.name || 'there'}! Don't miss out on our special offer. Reply YES to learn more.`
        break
      case 'social':
        content = `🎯 Transform your fitness journey today! Join thousands who've already started. #FitnessGoals #GymLife`
        break
    }
    
    return {
      content,
      contentType,
      metadata: {
        wordCount: content.split(' ').length,
        generatedAt: new Date().toISOString(),
      },
    }
  }
  
  async validate(): Promise<boolean> {
    return !!this.config.prompt
  }
}

// Data Actions
export class HTTPRequestAction extends BaseAction {
  async execute(input: Record<string, any>): Promise<Record<string, any>> {
    const url = this.resolveVariables(this.config.url || input.url)
    const method = this.config.method || input.method || 'GET'
    const headers = this.resolveVariables(this.config.headers || input.headers || {})
    const body = this.resolveVariables(this.config.body || input.body)
    
    if (!url) {
      throw new Error('URL is required')
    }
    
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    }
    
    if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
      options.body = typeof body === 'string' ? body : JSON.stringify(body)
    }
    
    const response = await fetch(url, options)
    const responseData = await response.json().catch(() => ({}))
    
    return {
      status: response.status,
      statusText: response.statusText,
      body: responseData,
      headers: Object.fromEntries(response.headers.entries()),
    }
  }
  
  async validate(): Promise<boolean> {
    return !!this.config.url
  }
}

export class TransformDataAction extends BaseAction {
  async execute(input: Record<string, any>): Promise<Record<string, any>> {
    const inputData = this.resolveVariables(this.config.input || input)
    const code = this.config.code
    
    if (!code) {
      throw new Error('Transformation code is required')
    }
    
    try {
      // Create a safe execution context
      const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor
      const transform = new AsyncFunction('data', 'variables', code)
      
      const output = await transform(inputData, this.context.variables)
      
      return { output }
    } catch (error) {
      throw new Error(`Transformation error: ${error.message}`)
    }
  }
  
  async validate(): Promise<boolean> {
    return !!this.config.code
  }
}

// Integration Actions
export class GoogleSheetsAction extends BaseAction {
  async execute(input: Record<string, any>): Promise<Record<string, any>> {
    const spreadsheetId = this.config.spreadsheetId || input.spreadsheetId
    const range = this.config.range || input.range || 'Sheet1!A:Z'
    const values = this.resolveVariables(this.config.values || input.values)
    const operation = this.config.operation || input.operation || 'append'
    
    if (!spreadsheetId || !values) {
      throw new Error('Spreadsheet ID and values are required')
    }
    
    // TODO: Integrate with Google Sheets API
    // For now, simulate the operation
    return {
      spreadsheetId,
      range,
      updatedRows: Array.isArray(values) ? values.length : 1,
      updatedCells: Array.isArray(values) ? values.flat().length : Object.keys(values).length,
    }
  }
  
  async validate(): Promise<boolean> {
    return !!(this.config.spreadsheetId && this.config.values)
  }
}

// Control Flow Actions
export class WaitAction extends BaseAction {
  async execute(input: Record<string, any>): Promise<Record<string, any>> {
    const duration = this.resolveVariables(this.config.duration || input.duration)
    const unit = this.config.unit || input.unit || 'seconds'
    
    if (!duration) {
      throw new Error('Duration is required')
    }
    
    let milliseconds = 0
    switch (unit) {
      case 'seconds':
        milliseconds = duration * 1000
        break
      case 'minutes':
        milliseconds = duration * 60 * 1000
        break
      case 'hours':
        milliseconds = duration * 60 * 60 * 1000
        break
      case 'days':
        milliseconds = duration * 24 * 60 * 60 * 1000
        break
    }
    
    // In real implementation, this would schedule a delayed job
    // For now, we'll just return the wait time
    return {
      waited: true,
      duration,
      unit,
      milliseconds,
      resumeAt: new Date(Date.now() + milliseconds).toISOString(),
    }
  }
  
  async validate(): Promise<boolean> {
    return !!this.config.duration
  }
}

// Action Factory
export class ActionFactory {
  private static actions: Map<string, typeof BaseAction> = new Map([
    // Communication
    ['send_email', SendEmailAction],
    ['send_sms', SendSMSAction],
    ['send_whatsapp', SendWhatsAppAction],
    ['send_slack', SendSlackAction],
    
    // CRM
    ['update_lead', UpdateLeadAction],
    ['add_tag', AddTagAction],
    ['change_stage', ChangeStageAction],
    ['assign_to_user', AssignToUserAction],
    
    // Tasks
    ['create_task', CreateTaskAction],
    
    // Calendar
    ['book_appointment', BookAppointmentAction],
    
    // AI
    ['ai_analyze', AIAnalyzeAction],
    ['ai_generate_content', AIGenerateContentAction],
    
    // Data
    ['http_request', HTTPRequestAction],
    ['transform_data', TransformDataAction],
    
    // Integrations
    ['google_sheets', GoogleSheetsAction],
    
    // Control Flow
    ['wait_delay', WaitAction],
  ])
  
  static create(type: string, config: Record<string, any>, context: ExecutionContext): BaseAction {
    const ActionClass = this.actions.get(type)
    if (!ActionClass) {
      throw new Error(`Unknown action type: ${type}`)
    }
    return new ActionClass(type, config, context)
  }
  
  static register(type: string, actionClass: typeof BaseAction) {
    this.actions.set(type, actionClass)
  }
  
  static getAvailableActions(): string[] {
    return Array.from(this.actions.keys())
  }
}