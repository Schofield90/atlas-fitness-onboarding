import { createClient } from '@/app/lib/supabase/server';
import { z } from 'zod';
import { Redis } from 'ioredis';

// Initialize Redis if available
const redis = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL) : null;

// Workflow schemas
export const workflowSchema = z.object({
  name: z.string(),
  trigger_type: z.enum(['lead.created', 'lead.updated', 'lead.converted', 'booking.created', 'booking.cancelled', 'member.joined', 'custom', 'webhook', 'schedule']),
  trigger_config: z.record(z.any()),
  actions: z.array(z.object({
    type: z.string(),
    config: z.record(z.any()),
    conditions: z.array(z.any()).optional()
  })),
  conditions: z.array(z.any()).optional(),
  active: z.boolean().default(true)
});

export type Workflow = z.infer<typeof workflowSchema>;

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'running' | 'completed' | 'failed';
  startedAt: Date;
  completedAt?: Date;
  error?: string;
  actions: Array<{
    type: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    result?: any;
    error?: string;
  }>;
}

// Available triggers
export const WORKFLOW_TRIGGERS = {
  'lead.created': 'When a new lead is created',
  'lead.updated': 'When a lead is updated',
  'lead.converted': 'When a lead is converted to client',
  'booking.created': 'When a booking is made',
  'booking.cancelled': 'When a booking is cancelled',
  'member.joined': 'When a new member joins',
  'webhook': 'When webhook is received',
  'schedule': 'On a schedule',
  'custom': 'Custom trigger'
} as const;

// Available actions
export const WORKFLOW_ACTIONS = {
  'send_email': {
    name: 'Send Email',
    config: {
      to: { type: 'string', required: true },
      subject: { type: 'string', required: true },
      template_id: { type: 'string', required: false },
      body: { type: 'string', required: false }
    }
  },
  'send_sms': {
    name: 'Send SMS',
    config: {
      to: { type: 'string', required: true },
      body: { type: 'string', required: true, maxLength: 160 }
    }
  },
  'send_whatsapp': {
    name: 'Send WhatsApp',
    config: {
      to: { type: 'string', required: true },
      body: { type: 'string', required: true }
    }
  },
  'update_lead': {
    name: 'Update Lead',
    config: {
      status: { type: 'enum', values: ['new', 'contacted', 'qualified', 'converted', 'lost'] },
      tags: { type: 'array', items: 'string' },
      assignedTo: { type: 'string' },
      score: { type: 'number', min: 0, max: 100 }
    }
  },
  'create_task': {
    name: 'Create Task',
    config: {
      title: { type: 'string', required: true },
      description: { type: 'string' },
      assignedTo: { type: 'string' },
      dueDate: { type: 'date' }
    }
  },
  'add_to_sequence': {
    name: 'Add to Email Sequence',
    config: {
      sequenceId: { type: 'string', required: true }
    }
  },
  'remove_from_sequence': {
    name: 'Remove from Email Sequence',
    config: {
      sequenceId: { type: 'string', required: true }
    }
  },
  'webhook': {
    name: 'Call Webhook',
    config: {
      url: { type: 'string', required: true },
      method: { type: 'enum', values: ['GET', 'POST', 'PUT', 'DELETE'], default: 'POST' },
      headers: { type: 'object' },
      body: { type: 'object' }
    }
  },
  'delay': {
    name: 'Wait',
    config: {
      duration: { type: 'number', required: true },
      unit: { type: 'enum', values: ['minutes', 'hours', 'days'], required: true }
    }
  },
  'ai_score_lead': {
    name: 'AI Score Lead',
    config: {}
  }
} as const;

class WorkflowService {
  private executors: Map<string, (config: any, context: any) => Promise<any>> = new Map();

  constructor() {
    this.registerExecutors();
  }

  // Register action executors
  private registerExecutors() {
    // Email action
    this.executors.set('send_email', async (config, context) => {
      const { messageService } = await import('./message.service');
      
      const recipient = this.resolveVariable(config.to, context);
      const subject = this.resolveVariable(config.subject, context);
      const body = this.resolveVariable(config.body, context);
      
      return await messageService.sendEmail(
        context.orgId,
        recipient,
        subject,
        body,
        config.template_id
      );
    });

    // SMS action
    this.executors.set('send_sms', async (config, context) => {
      const { messageService } = await import('./message.service');
      
      const recipient = this.resolveVariable(config.to, context);
      const body = this.resolveVariable(config.body, context);
      
      return await messageService.sendSMS(
        context.orgId,
        recipient,
        body
      );
    });

    // WhatsApp action
    this.executors.set('send_whatsapp', async (config, context) => {
      const { messageService } = await import('./message.service');
      
      const recipient = this.resolveVariable(config.to, context);
      const body = this.resolveVariable(config.body, context);
      
      return await messageService.sendWhatsApp(
        context.orgId,
        recipient,
        body
      );
    });

    // Update lead action
    this.executors.set('update_lead', async (config, context) => {
      const { leadService } = await import('./lead.service');
      
      const leadId = context.trigger.lead_id;
      if (!leadId) throw new Error('No lead ID in context');
      
      const updates: any = {};
      if (config.status) updates.status = config.status;
      if (config.tags) updates.tags = config.tags;
      if (config.assignedTo) updates.assigned_to = config.assignedTo;
      if (config.score !== undefined) updates.score = config.score;
      
      await leadService.updateLead(leadId, updates);
    });

    // Create task action
    this.executors.set('create_task', async (config, context) => {
      const supabase = await createClient();
      
      await supabase
        .from('tasks')
        .insert({
          org_id: context.orgId,
          title: this.resolveVariable(config.title, context),
          description: this.resolveVariable(config.description, context),
          assigned_to: config.assignedTo,
          due_date: config.dueDate,
          related_type: context.trigger.type,
          related_id: context.trigger.id
        });
    });

    // Webhook action
    this.executors.set('webhook', async (config, context) => {
      const url = this.resolveVariable(config.url, context);
      const headers = this.resolveVariables(config.headers || {}, context);
      const body = this.resolveVariables(config.body || {}, context);
      
      const response = await fetch(url, {
        method: config.method || 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: JSON.stringify(body)
      });
      
      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.statusText}`);
      }
      
      return await response.json();
    });

    // Delay action
    this.executors.set('delay', async (config) => {
      const ms = config.unit === 'minutes' ? config.duration * 60 * 1000
                : config.unit === 'hours' ? config.duration * 60 * 60 * 1000
                : config.duration * 24 * 60 * 60 * 1000;
                
      await new Promise(resolve => setTimeout(resolve, ms));
    });

    // AI score lead action
    this.executors.set('ai_score_lead', async (config, context) => {
      const { leadService } = await import('./lead.service');
      
      const leadId = context.trigger.lead_id;
      if (!leadId) throw new Error('No lead ID in context');
      
      return await leadService.scoreLead(leadId);
    });
  }

  // Create workflow
  async createWorkflow(orgId: string, data: Workflow): Promise<string> {
    const supabase = await createClient();
    
    const validated = workflowSchema.parse(data);
    
    const { data: workflow, error } = await supabase
      .from('workflows')
      .insert({
        org_id: orgId,
        ...validated
      })
      .select('id')
      .single();

    if (error) throw error;
    
    // Register trigger if active
    if (validated.active) {
      await this.registerTrigger(orgId, workflow.id, validated.trigger_type, validated.trigger_config);
    }

    return workflow.id;
  }

  // Update workflow
  async updateWorkflow(workflowId: string, updates: Partial<Workflow>): Promise<void> {
    const supabase = await createClient();
    
    const { error } = await supabase
      .from('workflows')
      .update(updates)
      .eq('id', workflowId);

    if (error) throw error;
    
    // Update trigger registration if needed
    if ('active' in updates || 'trigger_type' in updates || 'trigger_config' in updates) {
      const { data: workflow } = await supabase
        .from('workflows')
        .select('*')
        .eq('id', workflowId)
        .single();
        
      if (workflow) {
        if (workflow.active) {
          await this.registerTrigger(workflow.org_id, workflowId, workflow.trigger_type, workflow.trigger_config);
        } else {
          await this.unregisterTrigger(workflowId);
        }
      }
    }
  }

  // Get workflows
  async getWorkflows(orgId: string, filter?: { active?: boolean; trigger_type?: string }) {
    const supabase = await createClient();
    
    let query = supabase
      .from('workflows')
      .select('*')
      .eq('org_id', orgId);
      
    if (filter?.active !== undefined) {
      query = query.eq('active', filter.active);
    }
    
    if (filter?.trigger_type) {
      query = query.eq('trigger_type', filter.trigger_type);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  // Execute workflow
  async executeWorkflow(workflowId: string, triggerData: any): Promise<WorkflowExecution> {
    const supabase = await createClient();
    
    // Get workflow
    const { data: workflow } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', workflowId)
      .single();
      
    if (!workflow || !workflow.active) {
      throw new Error('Workflow not found or inactive');
    }
    
    // Create execution record
    const { data: execution } = await supabase
      .from('workflow_executions')
      .insert({
        org_id: workflow.org_id,
        workflow_id: workflowId,
        trigger_data: triggerData,
        status: 'running'
      })
      .select('id')
      .single();
      
    if (!execution) throw new Error('Failed to create execution');
    
    const executionId = execution.id;
    const context = {
      orgId: workflow.org_id,
      workflowId,
      executionId,
      trigger: triggerData
    };
    
    // Execute actions
    try {
      // Check workflow conditions
      if (workflow.conditions?.length > 0) {
        const conditionsMet = await this.evaluateConditions(workflow.conditions, context);
        if (!conditionsMet) {
          await this.completeExecution(executionId, 'completed', 'Conditions not met');
          return this.getExecution(executionId);
        }
      }
      
      // Execute each action
      for (const action of workflow.actions) {
        // Check action conditions
        if (action.conditions?.length > 0) {
          const conditionsMet = await this.evaluateConditions(action.conditions, context);
          if (!conditionsMet) continue;
        }
        
        // Execute action
        await this.executeAction(action, context);
      }
      
      await this.completeExecution(executionId, 'completed');
    } catch (error) {
      await this.completeExecution(executionId, 'failed', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
    
    return this.getExecution(executionId);
  }

  // Execute a single action
  private async executeAction(action: any, context: any): Promise<any> {
    const executor = this.executors.get(action.type);
    if (!executor) {
      throw new Error(`Unknown action type: ${action.type}`);
    }
    
    return await executor(action.config, context);
  }

  // Evaluate conditions
  private async evaluateConditions(conditions: any[], context: any): Promise<boolean> {
    for (const condition of conditions) {
      const result = await this.evaluateCondition(condition, context);
      if (!result) return false;
    }
    return true;
  }

  // Evaluate a single condition
  private async evaluateCondition(condition: any, context: any): Promise<boolean> {
    const { field, operator, value } = condition;
    const fieldValue = this.getFieldValue(field, context);
    
    switch (operator) {
      case 'equals':
        return fieldValue === value;
      case 'not_equals':
        return fieldValue !== value;
      case 'contains':
        return String(fieldValue).includes(value);
      case 'not_contains':
        return !String(fieldValue).includes(value);
      case 'greater_than':
        return Number(fieldValue) > Number(value);
      case 'less_than':
        return Number(fieldValue) < Number(value);
      case 'in':
        return Array.isArray(value) && value.includes(fieldValue);
      case 'not_in':
        return Array.isArray(value) && !value.includes(fieldValue);
      default:
        return false;
    }
  }

  // Get field value from context
  private getFieldValue(field: string, context: any): any {
    const parts = field.split('.');
    let value = context;
    
    for (const part of parts) {
      value = value?.[part];
      if (value === undefined) break;
    }
    
    return value;
  }

  // Resolve variables in strings (e.g., {{lead.name}})
  private resolveVariable(str: string, context: any): string {
    if (typeof str !== 'string') return str;
    
    return str.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      const value = this.getFieldValue(path.trim(), context);
      return value !== undefined ? String(value) : match;
    });
  }

  // Resolve variables in objects
  private resolveVariables(obj: any, context: any): any {
    if (typeof obj === 'string') {
      return this.resolveVariable(obj, context);
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.resolveVariables(item, context));
    }
    
    if (typeof obj === 'object' && obj !== null) {
      const resolved: any = {};
      for (const [key, value] of Object.entries(obj)) {
        resolved[key] = this.resolveVariables(value, context);
      }
      return resolved;
    }
    
    return obj;
  }

  // Register workflow trigger
  private async registerTrigger(orgId: string, workflowId: string, triggerType: string, config: any): Promise<void> {
    const cacheKey = `workflow:trigger:${workflowId}`;
    
    if (redis) {
      await redis.setex(cacheKey, 86400, JSON.stringify({ orgId, triggerType, config }));
    }
    
    // For scheduled triggers, register with cron service
    if (triggerType === 'schedule' && config.cron) {
      // TODO: Register with cron service
    }
  }

  // Unregister workflow trigger
  private async unregisterTrigger(workflowId: string): Promise<void> {
    const cacheKey = `workflow:trigger:${workflowId}`;
    
    if (redis) {
      await redis.del(cacheKey);
    }
  }

  // Complete execution
  private async completeExecution(executionId: string, status: 'completed' | 'failed', error?: string): Promise<void> {
    const supabase = await createClient();
    
    await supabase
      .from('workflow_executions')
      .update({
        status,
        completed_at: new Date().toISOString(),
        error
      })
      .eq('id', executionId);
  }

  // Get execution details
  private async getExecution(executionId: string): Promise<WorkflowExecution> {
    const supabase = await createClient();
    
    const { data } = await supabase
      .from('workflow_executions')
      .select('*')
      .eq('id', executionId)
      .single();
      
    if (!data) throw new Error('Execution not found');
    
    return {
      id: data.id,
      workflowId: data.workflow_id,
      status: data.status,
      startedAt: new Date(data.started_at),
      completedAt: data.completed_at ? new Date(data.completed_at) : undefined,
      error: data.error,
      actions: [] // TODO: Track individual action executions
    };
  }

  // Trigger workflows for an event
  async triggerEvent(orgId: string, event: string, data: any): Promise<void> {
    const workflows = await this.getWorkflows(orgId, { active: true, trigger_type: event });
    
    // Execute workflows in parallel
    const promises = workflows.map(workflow => 
      this.executeWorkflow(workflow.id, data).catch(error => 
        console.error(`Failed to execute workflow ${workflow.id}:`, error)
      )
    );
    
    await Promise.allSettled(promises);
  }

  // Get workflow templates
  getWorkflowTemplates() {
    return [
      {
        name: 'New Lead Welcome',
        description: 'Send welcome email and SMS to new leads',
        trigger_type: 'lead.created',
        actions: [
          {
            type: 'send_email',
            config: {
              to: '{{trigger.email}}',
              subject: 'Welcome to {{organization.name}}!',
              template_id: 'welcome_email'
            }
          },
          {
            type: 'delay',
            config: { duration: 5, unit: 'minutes' }
          },
          {
            type: 'send_sms',
            config: {
              to: '{{trigger.phone}}',
              body: 'Hi {{trigger.first_name}}, welcome to {{organization.name}}! Reply BOOK to schedule your free consultation.'
            }
          }
        ]
      },
      {
        name: 'Booking Reminder',
        description: 'Send reminder 24 hours before class',
        trigger_type: 'schedule',
        trigger_config: { cron: '0 9 * * *' }, // Daily at 9 AM
        actions: [
          {
            type: 'send_email',
            config: {
              to: '{{booking.client.email}}',
              subject: 'Reminder: Your class tomorrow at {{booking.session.start_time}}',
              template_id: 'booking_reminder'
            }
          }
        ]
      },
      {
        name: 'Lead Scoring',
        description: 'Score leads based on engagement',
        trigger_type: 'lead.updated',
        actions: [
          {
            type: 'ai_score_lead',
            config: {}
          },
          {
            type: 'update_lead',
            config: {
              tags: ['high-priority']
            },
            conditions: [
              { field: 'trigger.score', operator: 'greater_than', value: 70 }
            ]
          }
        ]
      }
    ];
  }
}

export const workflowService = new WorkflowService();