/**
 * Comprehensive Action Handlers for Enhanced Workflow System
 * 
 * This module provides handlers for all supported action types in the Atlas Fitness CRM
 * workflow system, including communication, CRM, AI, and integration actions.
 */

import { WorkflowNode, ExecutionContext, JSONValue } from '../../../typescript_interfaces_enhanced_workflows';
import { createAdminClient } from '@/app/lib/supabase/admin';
import { sendEmail } from '@/app/lib/email/send-email';
import { sendSMS } from '@/app/lib/sms';
import { sendWhatsApp } from '@/app/lib/whatsapp';
import { Redis } from 'ioredis';

interface ActionResult {
  success: boolean;
  output?: Record<string, JSONValue>;
  error?: string;
  metadata?: Record<string, JSONValue>;
}

interface ActionHandler {
  (node: WorkflowNode, context: ExecutionContext): Promise<ActionResult>;
}

export class ActionHandlerRegistry {
  private handlers = new Map<string, ActionHandler>();
  private supabase: any;
  private redis: Redis | null = null;

  constructor() {
    this.initialize();
    this.registerHandlers();
  }

  private async initialize(): Promise<void> {
    this.supabase = createAdminClient();
    
    if (process.env.REDIS_URL) {
      this.redis = new Redis(process.env.REDIS_URL);
    }
  }

  /**
   * Register all available action handlers
   */
  private registerHandlers(): void {
    // Communication Actions
    this.handlers.set('send_email', this.handleSendEmail.bind(this));
    this.handlers.set('send_sms', this.handleSendSMS.bind(this));
    this.handlers.set('send_whatsapp', this.handleSendWhatsApp.bind(this));
    this.handlers.set('multi_channel_message', this.handleMultiChannelMessage.bind(this));

    // CRM Actions
    this.handlers.set('update_lead', this.handleUpdateLead.bind(this));
    this.handlers.set('create_task', this.handleCreateTask.bind(this));
    this.handlers.set('add_tag', this.handleAddTag.bind(this));
    this.handlers.set('remove_tag', this.handleRemoveTag.bind(this));
    this.handlers.set('assign_lead', this.handleAssignLead.bind(this));
    this.handlers.set('update_lead_score', this.handleUpdateLeadScore.bind(this));

    // Calendar/Booking Actions
    this.handlers.set('create_booking', this.handleCreateBooking.bind(this));
    this.handlers.set('cancel_booking', this.handleCancelBooking.bind(this));
    this.handlers.set('send_booking_reminder', this.handleSendBookingReminder.bind(this));

    // AI Actions
    this.handlers.set('ai_score_lead', this.handleAIScoreLead.bind(this));
    this.handlers.set('ai_analyze_conversation', this.handleAIAnalyzeConversation.bind(this));
    this.handlers.set('ai_generate_response', this.handleAIGenerateResponse.bind(this));
    this.handlers.set('ai_sentiment_analysis', this.handleAISentimentAnalysis.bind(this));

    // Data Actions
    this.handlers.set('transform_data', this.handleTransformData.bind(this));
    this.handlers.set('validate_data', this.handleValidateData.bind(this));
    this.handlers.set('enrich_lead_data', this.handleEnrichLeadData.bind(this));

    // Integration Actions
    this.handlers.set('webhook', this.handleWebhook.bind(this));
    this.handlers.set('api_call', this.handleAPICall.bind(this));
    this.handlers.set('database_query', this.handleDatabaseQuery.bind(this));

    // Control Flow Actions
    this.handlers.set('wait', this.handleWait.bind(this));
    this.handlers.set('conditional_branch', this.handleConditionalBranch.bind(this));
    this.handlers.set('loop_control', this.handleLoopControl.bind(this));

    // Marketing Actions
    this.handlers.set('add_to_sequence', this.handleAddToSequence.bind(this));
    this.handlers.set('remove_from_sequence', this.handleRemoveFromSequence.bind(this));
    this.handlers.set('track_event', this.handleTrackEvent.bind(this));

    // Notification Actions
    this.handlers.set('send_notification', this.handleSendNotification.bind(this));
    this.handlers.set('send_slack_message', this.handleSendSlackMessage.bind(this));
  }

  /**
   * Execute an action by its type
   */
  async executeAction(
    actionType: string,
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<ActionResult> {
    const handler = this.handlers.get(actionType);
    
    if (!handler) {
      return {
        success: false,
        error: `Unknown action type: ${actionType}`
      };
    }

    try {
      const result = await handler(node, context);
      return result;
    } catch (error) {
      return {
        success: false,
        error: `Action handler failed: ${error.message}`,
        metadata: {
          actionType,
          nodeId: node.id,
          stack: error.stack
        }
      };
    }
  }

  // ===== COMMUNICATION ACTIONS =====

  /**
   * Send Email Action
   */
  private async handleSendEmail(
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<ActionResult> {
    const config = node.data.config || {};
    const {
      to,
      subject,
      body,
      templateId,
      customMessage,
      attachments,
      priority
    } = config;

    // Resolve recipient
    const recipient = this.interpolateVariables(to, context) || 
                     context.variables.lead?.email || 
                     context.variables.email;

    if (!recipient) {
      return {
        success: false,
        error: 'No recipient email address found'
      };
    }

    // Resolve subject and body
    const emailSubject = this.interpolateVariables(subject || 'Message from Atlas Fitness', context);
    let emailBody = '';

    if (templateId) {
      // Fetch email template
      const template = await this.getEmailTemplate(templateId, context.userContext?.organizationId);
      if (template) {
        emailBody = this.interpolateVariables(template.content, context);
      } else {
        emailBody = this.interpolateVariables(customMessage || 'Default email content', context);
      }
    } else {
      emailBody = this.interpolateVariables(body || customMessage || 'Default email content', context);
    }

    try {
      const result = await sendEmail({
        to: recipient,
        subject: emailSubject,
        html: emailBody,
        organizationId: context.userContext?.organizationId,
        priority: priority || 'normal',
        attachments: attachments || [],
        metadata: {
          workflowId: context.variables._workflowId,
          executionId: context.variables._executionId,
          nodeId: node.id,
          templateId
        }
      });

      return {
        success: true,
        output: {
          emailSent: true,
          recipient,
          subject: emailSubject,
          messageId: result.messageId || 'unknown'
        },
        metadata: {
          provider: 'sendgrid', // or whatever email provider
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to send email: ${error.message}`,
        metadata: { recipient, subject: emailSubject }
      };
    }
  }

  /**
   * Send SMS Action
   */
  private async handleSendSMS(
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<ActionResult> {
    const config = node.data.config || {};
    const { to, message, templateId } = config;

    // Resolve recipient
    const recipient = this.interpolateVariables(to, context) || 
                     context.variables.lead?.phone || 
                     context.variables.phone;

    if (!recipient) {
      return {
        success: false,
        error: 'No recipient phone number found'
      };
    }

    // Resolve message content
    let smsMessage = '';
    if (templateId) {
      const template = await this.getSMSTemplate(templateId, context.userContext?.organizationId);
      smsMessage = template ? this.interpolateVariables(template.content, context) : message;
    } else {
      smsMessage = this.interpolateVariables(message, context);
    }

    // Validate message length (SMS limit)
    if (smsMessage.length > 160) {
      smsMessage = smsMessage.substring(0, 157) + '...';
    }

    try {
      const result = await sendSMS({
        to: recipient,
        body: smsMessage,
        organizationId: context.userContext?.organizationId
      });

      return {
        success: true,
        output: {
          smsSent: true,
          recipient,
          message: smsMessage,
          messageId: result.sid || 'unknown'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to send SMS: ${error.message}`,
        metadata: { recipient, message: smsMessage }
      };
    }
  }

  /**
   * Send WhatsApp Action
   */
  private async handleSendWhatsApp(
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<ActionResult> {
    const config = node.data.config || {};
    const { to, message, templateId, mediaUrl } = config;

    const recipient = this.interpolateVariables(to, context) || 
                     context.variables.lead?.phone || 
                     context.variables.phone;

    if (!recipient) {
      return {
        success: false,
        error: 'No recipient phone number found'
      };
    }

    let whatsappMessage = '';
    if (templateId) {
      const template = await this.getWhatsAppTemplate(templateId, context.userContext?.organizationId);
      whatsappMessage = template ? this.interpolateVariables(template.content, context) : message;
    } else {
      whatsappMessage = this.interpolateVariables(message, context);
    }

    try {
      const result = await sendWhatsApp({
        to: recipient,
        body: whatsappMessage,
        mediaUrl: mediaUrl ? this.interpolateVariables(mediaUrl, context) : undefined,
        organizationId: context.userContext?.organizationId
      });

      return {
        success: true,
        output: {
          whatsappSent: true,
          recipient,
          message: whatsappMessage,
          messageId: result.sid || 'unknown'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to send WhatsApp: ${error.message}`,
        metadata: { recipient, message: whatsappMessage }
      };
    }
  }

  /**
   * Multi-Channel Message Action
   */
  private async handleMultiChannelMessage(
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<ActionResult> {
    const config = node.data.config || {};
    const { channels, message, fallbackOrder } = config;

    const results: Record<string, any> = {};
    let successfulChannel: string | null = null;

    // Try channels in specified order or fallback order
    const channelsToTry = fallbackOrder || channels || ['email', 'sms', 'whatsapp'];

    for (const channel of channelsToTry) {
      try {
        let channelResult: ActionResult;

        switch (channel) {
          case 'email':
            channelResult = await this.handleSendEmail({
              ...node,
              data: { ...node.data, config: { ...config, body: message } }
            }, context);
            break;
          case 'sms':
            channelResult = await this.handleSendSMS({
              ...node,
              data: { ...node.data, config: { ...config, message } }
            }, context);
            break;
          case 'whatsapp':
            channelResult = await this.handleSendWhatsApp({
              ...node,
              data: { ...node.data, config: { ...config, message } }
            }, context);
            break;
          default:
            continue;
        }

        results[channel] = channelResult;

        if (channelResult.success) {
          successfulChannel = channel;
          break; // Stop at first successful channel
        }
      } catch (error) {
        results[channel] = {
          success: false,
          error: error.message
        };
      }
    }

    return {
      success: !!successfulChannel,
      output: {
        successfulChannel,
        channelResults: results,
        messageSent: !!successfulChannel
      },
      error: !successfulChannel ? 'All channels failed' : undefined
    };
  }

  // ===== CRM ACTIONS =====

  /**
   * Update Lead Action
   */
  private async handleUpdateLead(
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<ActionResult> {
    const config = node.data.config || {};
    const { leadId, updates } = config;

    const targetLeadId = this.interpolateVariables(leadId, context) || 
                        context.variables.lead?.id || 
                        context.variables.leadId;

    if (!targetLeadId) {
      return {
        success: false,
        error: 'No lead ID found for update'
      };
    }

    const leadUpdates: any = {};
    
    // Process updates with variable interpolation
    for (const [key, value] of Object.entries(updates || {})) {
      leadUpdates[key] = typeof value === 'string' ? 
        this.interpolateVariables(value, context) : value;
    }

    // Add automatic timestamp
    leadUpdates.updated_at = new Date().toISOString();

    try {
      const { data, error } = await this.supabase
        .from('leads')
        .update(leadUpdates)
        .eq('id', targetLeadId)
        .eq('organization_id', context.userContext?.organizationId)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return {
        success: true,
        output: {
          leadUpdated: true,
          leadId: targetLeadId,
          updates: leadUpdates,
          updatedLead: data
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to update lead: ${error.message}`,
        metadata: { leadId: targetLeadId, updates: leadUpdates }
      };
    }
  }

  /**
   * Create Task Action
   */
  private async handleCreateTask(
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<ActionResult> {
    const config = node.data.config || {};
    const {
      title,
      description,
      assignedTo,
      dueDate,
      priority,
      category,
      relatedTo
    } = config;

    const taskData = {
      organization_id: context.userContext?.organizationId,
      title: this.interpolateVariables(title, context),
      description: this.interpolateVariables(description || '', context),
      assigned_to: this.interpolateVariables(assignedTo, context),
      due_date: this.interpolateVariables(dueDate, context),
      priority: priority || 'medium',
      category: category || 'workflow',
      related_type: relatedTo?.type || 'workflow',
      related_id: this.interpolateVariables(relatedTo?.id, context) || context.variables._executionId,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    try {
      const { data, error } = await this.supabase
        .from('tasks')
        .insert(taskData)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return {
        success: true,
        output: {
          taskCreated: true,
          taskId: data.id,
          task: data
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to create task: ${error.message}`,
        metadata: { taskData }
      };
    }
  }

  /**
   * Add Tag Action
   */
  private async handleAddTag(
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<ActionResult> {
    const config = node.data.config || {};
    const { tag, targetType, targetId } = config;

    const tagValue = this.interpolateVariables(tag, context);
    const entityType = targetType || 'lead';
    const entityId = this.interpolateVariables(targetId, context) || 
                    context.variables.lead?.id || 
                    context.variables.leadId;

    if (!entityId) {
      return {
        success: false,
        error: `No ${entityType} ID found for tag addition`
      };
    }

    try {
      // Get current tags
      const tableName = entityType === 'lead' ? 'leads' : `${entityType}s`;
      const { data: currentEntity } = await this.supabase
        .from(tableName)
        .select('tags')
        .eq('id', entityId)
        .eq('organization_id', context.userContext?.organizationId)
        .single();

      const currentTags = currentEntity?.tags || [];
      
      if (!currentTags.includes(tagValue)) {
        const updatedTags = [...currentTags, tagValue];
        
        const { error } = await this.supabase
          .from(tableName)
          .update({
            tags: updatedTags,
            updated_at: new Date().toISOString()
          })
          .eq('id', entityId)
          .eq('organization_id', context.userContext?.organizationId);

        if (error) {
          throw new Error(error.message);
        }

        return {
          success: true,
          output: {
            tagAdded: true,
            tag: tagValue,
            entityType,
            entityId,
            allTags: updatedTags
          }
        };
      } else {
        return {
          success: true,
          output: {
            tagAdded: false,
            tag: tagValue,
            entityType,
            entityId,
            reason: 'Tag already exists',
            allTags: currentTags
          }
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to add tag: ${error.message}`,
        metadata: { tag: tagValue, entityType, entityId }
      };
    }
  }

  /**
   * Remove Tag Action
   */
  private async handleRemoveTag(
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<ActionResult> {
    const config = node.data.config || {};
    const { tag, targetType, targetId } = config;

    const tagValue = this.interpolateVariables(tag, context);
    const entityType = targetType || 'lead';
    const entityId = this.interpolateVariables(targetId, context) || 
                    context.variables.lead?.id || 
                    context.variables.leadId;

    if (!entityId) {
      return {
        success: false,
        error: `No ${entityType} ID found for tag removal`
      };
    }

    try {
      const tableName = entityType === 'lead' ? 'leads' : `${entityType}s`;
      const { data: currentEntity } = await this.supabase
        .from(tableName)
        .select('tags')
        .eq('id', entityId)
        .eq('organization_id', context.userContext?.organizationId)
        .single();

      const currentTags = currentEntity?.tags || [];
      const updatedTags = currentTags.filter((t: string) => t !== tagValue);

      if (updatedTags.length !== currentTags.length) {
        const { error } = await this.supabase
          .from(tableName)
          .update({
            tags: updatedTags,
            updated_at: new Date().toISOString()
          })
          .eq('id', entityId)
          .eq('organization_id', context.userContext?.organizationId);

        if (error) {
          throw new Error(error.message);
        }

        return {
          success: true,
          output: {
            tagRemoved: true,
            tag: tagValue,
            entityType,
            entityId,
            allTags: updatedTags
          }
        };
      } else {
        return {
          success: true,
          output: {
            tagRemoved: false,
            tag: tagValue,
            entityType,
            entityId,
            reason: 'Tag did not exist',
            allTags: currentTags
          }
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to remove tag: ${error.message}`,
        metadata: { tag: tagValue, entityType, entityId }
      };
    }
  }

  // ===== AI ACTIONS =====

  /**
   * AI Score Lead Action
   */
  private async handleAIScoreLead(
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<ActionResult> {
    const config = node.data.config || {};
    const { leadId, scoringCriteria } = config;

    const targetLeadId = this.interpolateVariables(leadId, context) || 
                        context.variables.lead?.id || 
                        context.variables.leadId;

    if (!targetLeadId) {
      return {
        success: false,
        error: 'No lead ID found for AI scoring'
      };
    }

    try {
      // This would integrate with your AI service
      // For now, we'll simulate scoring based on lead data
      const { data: lead } = await this.supabase
        .from('leads')
        .select('*')
        .eq('id', targetLeadId)
        .eq('organization_id', context.userContext?.organizationId)
        .single();

      if (!lead) {
        throw new Error('Lead not found');
      }

      // Simulate AI scoring (replace with actual AI service call)
      const score = this.calculateSimpleLeadScore(lead);

      // Update lead with new score
      const { error } = await this.supabase
        .from('leads')
        .update({
          score,
          scored_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', targetLeadId);

      if (error) {
        throw new Error(error.message);
      }

      return {
        success: true,
        output: {
          leadScored: true,
          leadId: targetLeadId,
          score,
          previousScore: lead.score,
          scoringDate: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to score lead: ${error.message}`,
        metadata: { leadId: targetLeadId }
      };
    }
  }

  // ===== CONTROL FLOW ACTIONS =====

  /**
   * Wait Action
   */
  private async handleWait(
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<ActionResult> {
    const config = node.data.config || {};
    const { duration, unit } = config;

    let waitTime = parseInt(this.interpolateVariables(duration, context)) || 1;
    const timeUnit = unit || 'seconds';

    switch (timeUnit) {
      case 'minutes':
        waitTime *= 60 * 1000;
        break;
      case 'hours':
        waitTime *= 60 * 60 * 1000;
        break;
      case 'days':
        waitTime *= 24 * 60 * 60 * 1000;
        break;
      default:
        waitTime *= 1000; // Default to seconds
    }

    // Cap wait time for safety (max 24 hours)
    waitTime = Math.min(waitTime, 24 * 60 * 60 * 1000);

    await new Promise(resolve => setTimeout(resolve, waitTime));

    return {
      success: true,
      output: {
        waitCompleted: true,
        waitDurationMs: waitTime,
        waitDurationOriginal: `${duration} ${timeUnit}`
      }
    };
  }

  /**
   * Webhook Action
   */
  private async handleWebhook(
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<ActionResult> {
    const config = node.data.config || {};
    const {
      url,
      method,
      headers,
      body,
      timeout,
      retries
    } = config;

    const webhookUrl = this.interpolateVariables(url, context);
    const httpMethod = method || 'POST';
    const requestHeaders = {
      'Content-Type': 'application/json',
      'User-Agent': 'Atlas-Fitness-Workflow/1.0',
      ...this.interpolateVariablesInObject(headers || {}, context)
    };

    const requestBody = this.interpolateVariablesInObject(body || {}, context);

    try {
      const controller = new AbortController();
      const timeoutMs = (timeout || 30) * 1000;
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(webhookUrl, {
        method: httpMethod,
        headers: requestHeaders,
        body: httpMethod !== 'GET' ? JSON.stringify(requestBody) : undefined,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      let responseData: any;
      try {
        responseData = await response.json();
      } catch {
        responseData = await response.text();
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return {
        success: true,
        output: {
          webhookCalled: true,
          url: webhookUrl,
          method: httpMethod,
          statusCode: response.status,
          responseData
        },
        metadata: {
          responseHeaders: Object.fromEntries(response.headers.entries())
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Webhook call failed: ${error.message}`,
        metadata: {
          url: webhookUrl,
          method: httpMethod,
          headers: requestHeaders,
          body: requestBody
        }
      };
    }
  }

  // ===== UTILITY METHODS =====

  /**
   * Interpolate variables in a string using context
   */
  private interpolateVariables(template: string, context: ExecutionContext): string {
    if (!template || typeof template !== 'string') {
      return String(template || '');
    }

    return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      const value = this.getNestedValue(context.variables, path.trim());
      return value !== undefined ? String(value) : match;
    });
  }

  /**
   * Interpolate variables in an object
   */
  private interpolateVariablesInObject(obj: any, context: ExecutionContext): any {
    if (typeof obj === 'string') {
      return this.interpolateVariables(obj, context);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.interpolateVariablesInObject(item, context));
    }

    if (typeof obj === 'object' && obj !== null) {
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.interpolateVariablesInObject(value, context);
      }
      return result;
    }

    return obj;
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * Get email template
   */
  private async getEmailTemplate(templateId: string, organizationId: string): Promise<any> {
    const { data } = await this.supabase
      .from('message_templates')
      .select('*')
      .eq('id', templateId)
      .eq('organization_id', organizationId)
      .eq('type', 'email')
      .single();

    return data;
  }

  /**
   * Get SMS template
   */
  private async getSMSTemplate(templateId: string, organizationId: string): Promise<any> {
    const { data } = await this.supabase
      .from('message_templates')
      .select('*')
      .eq('id', templateId)
      .eq('organization_id', organizationId)
      .eq('type', 'sms')
      .single();

    return data;
  }

  /**
   * Get WhatsApp template
   */
  private async getWhatsAppTemplate(templateId: string, organizationId: string): Promise<any> {
    const { data } = await this.supabase
      .from('message_templates')
      .select('*')
      .eq('id', templateId)
      .eq('organization_id', organizationId)
      .eq('type', 'whatsapp')
      .single();

    return data;
  }

  /**
   * Simple lead scoring (replace with actual AI)
   */
  private calculateSimpleLeadScore(lead: any): number {
    let score = 0;

    // Email provided
    if (lead.email) score += 20;
    
    // Phone provided
    if (lead.phone) score += 20;
    
    // Source quality
    if (lead.source === 'website') score += 15;
    else if (lead.source === 'referral') score += 25;
    else if (lead.source === 'social_media') score += 10;
    
    // Recent activity
    const createdAt = new Date(lead.created_at);
    const daysSinceCreated = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceCreated < 1) score += 15;
    else if (daysSinceCreated < 7) score += 10;
    
    // Has tags (indicates engagement)
    if (lead.tags && lead.tags.length > 0) score += 10;

    return Math.min(score, 100);
  }

  /**
   * Get available action types
   */
  getAvailableActions(): string[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Check if action type is supported
   */
  isActionSupported(actionType: string): boolean {
    return this.handlers.has(actionType);
  }

  // Additional placeholder handlers for missing actions
  private async handleAssignLead(node: WorkflowNode, context: ExecutionContext): Promise<ActionResult> {
    // Implementation for assign lead action
    return { success: true, output: {} };
  }

  private async handleUpdateLeadScore(node: WorkflowNode, context: ExecutionContext): Promise<ActionResult> {
    // Implementation for update lead score action
    return { success: true, output: {} };
  }

  private async handleCreateBooking(node: WorkflowNode, context: ExecutionContext): Promise<ActionResult> {
    // Implementation for create booking action
    return { success: true, output: {} };
  }

  private async handleCancelBooking(node: WorkflowNode, context: ExecutionContext): Promise<ActionResult> {
    // Implementation for cancel booking action
    return { success: true, output: {} };
  }

  private async handleSendBookingReminder(node: WorkflowNode, context: ExecutionContext): Promise<ActionResult> {
    // Implementation for send booking reminder action
    return { success: true, output: {} };
  }

  private async handleAIAnalyzeConversation(node: WorkflowNode, context: ExecutionContext): Promise<ActionResult> {
    // Implementation for AI analyze conversation action
    return { success: true, output: {} };
  }

  private async handleAIGenerateResponse(node: WorkflowNode, context: ExecutionContext): Promise<ActionResult> {
    // Implementation for AI generate response action
    return { success: true, output: {} };
  }

  private async handleAISentimentAnalysis(node: WorkflowNode, context: ExecutionContext): Promise<ActionResult> {
    // Implementation for AI sentiment analysis action
    return { success: true, output: {} };
  }

  private async handleTransformData(node: WorkflowNode, context: ExecutionContext): Promise<ActionResult> {
    // Implementation for transform data action
    return { success: true, output: {} };
  }

  private async handleValidateData(node: WorkflowNode, context: ExecutionContext): Promise<ActionResult> {
    // Implementation for validate data action
    return { success: true, output: {} };
  }

  private async handleEnrichLeadData(node: WorkflowNode, context: ExecutionContext): Promise<ActionResult> {
    // Implementation for enrich lead data action
    return { success: true, output: {} };
  }

  private async handleAPICall(node: WorkflowNode, context: ExecutionContext): Promise<ActionResult> {
    // Implementation for API call action
    return { success: true, output: {} };
  }

  private async handleDatabaseQuery(node: WorkflowNode, context: ExecutionContext): Promise<ActionResult> {
    // Implementation for database query action
    return { success: true, output: {} };
  }

  private async handleConditionalBranch(node: WorkflowNode, context: ExecutionContext): Promise<ActionResult> {
    // Implementation for conditional branch action
    return { success: true, output: {} };
  }

  private async handleLoopControl(node: WorkflowNode, context: ExecutionContext): Promise<ActionResult> {
    // Implementation for loop control action
    return { success: true, output: {} };
  }

  private async handleAddToSequence(node: WorkflowNode, context: ExecutionContext): Promise<ActionResult> {
    // Implementation for add to sequence action
    return { success: true, output: {} };
  }

  private async handleRemoveFromSequence(node: WorkflowNode, context: ExecutionContext): Promise<ActionResult> {
    // Implementation for remove from sequence action
    return { success: true, output: {} };
  }

  private async handleTrackEvent(node: WorkflowNode, context: ExecutionContext): Promise<ActionResult> {
    // Implementation for track event action
    return { success: true, output: {} };
  }

  private async handleSendNotification(node: WorkflowNode, context: ExecutionContext): Promise<ActionResult> {
    // Implementation for send notification action
    return { success: true, output: {} };
  }

  private async handleSendSlackMessage(node: WorkflowNode, context: ExecutionContext): Promise<ActionResult> {
    // Implementation for send Slack message action
    return { success: true, output: {} };
  }
}

// Export singleton instance
export const actionHandlerRegistry = new ActionHandlerRegistry();