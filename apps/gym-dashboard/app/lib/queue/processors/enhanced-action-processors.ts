import { Job } from 'bullmq';
import { createAdminClient } from '@/app/lib/supabase/admin';
import { enhancedQueueManager } from '../enhanced-queue-manager';
import { QUEUE_NAMES, JOB_TYPES, JOB_PRIORITIES } from '../enhanced-config';

// Import existing services
import { sendEmail } from '@/app/lib/email/send-email';
import { sendSMS } from '@/app/lib/sms';
import { sendWhatsAppMessage } from '@/app/lib/whatsapp';

interface NodeExecutionJobData {
  nodeId: string;
  nodeType: string;
  nodeData: any;
  executionContext: {
    executionId: string;
    workflowId: string;
    organizationId: string;
    variables: Record<string, any>;
    triggerData: any;
  };
}

interface ActionResult {
  success: boolean;
  data?: any;
  error?: string;
  variables?: Record<string, any>;
  metrics?: {
    processingTime: number;
    retryAttempt?: number;
  };
}

export class EnhancedActionProcessor {
  private supabase = createAdminClient();

  async processNodeExecution(job: Job<NodeExecutionJobData>): Promise<ActionResult> {
    const { nodeId, nodeType, nodeData, executionContext } = job.data;
    const startTime = Date.now();
    
    console.log(`🔧 Processing node execution: ${nodeId} (${nodeType})`);
    
    try {
      let result: ActionResult;
      
      // Route to specific action processor
      switch (nodeData.actionType || nodeType) {
        case 'send_email':
          result = await this.processSendEmail(nodeData, executionContext);
          break;
        case 'send_sms':
          result = await this.processSendSMS(nodeData, executionContext);
          break;
        case 'send_whatsapp':
          result = await this.processSendWhatsApp(nodeData, executionContext);
          break;
        case 'update_lead':
          result = await this.processUpdateLead(nodeData, executionContext);
          break;
        case 'create_contact':
          result = await this.processCreateContact(nodeData, executionContext);
          break;
        case 'add_tag':
          result = await this.processAddTag(nodeData, executionContext);
          break;
        case 'remove_tag':
          result = await this.processRemoveTag(nodeData, executionContext);
          break;
        case 'update_score':
          result = await this.processUpdateScore(nodeData, executionContext);
          break;
        case 'webhook':
          result = await this.processWebhook(nodeData, executionContext);
          break;
        case 'condition':
          result = await this.processCondition(nodeData, executionContext);
          break;
        case 'custom_action':
          result = await this.processCustomAction(nodeData, executionContext);
          break;
        default:
          throw new Error(`Unknown action type: ${nodeData.actionType || nodeType}`);
      }
      
      // Add processing metrics
      result.metrics = {
        processingTime: Date.now() - startTime,
        retryAttempt: job.attemptsMade,
      };
      
      // Log successful execution
      await this.logNodeExecution(nodeId, executionContext.executionId, 'completed', result);
      
      console.log(`✅ Node execution completed: ${nodeId} in ${result.metrics.processingTime}ms`);
      return result;
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(`❌ Node execution failed: ${nodeId} after ${processingTime}ms`, error);
      
      const errorResult: ActionResult = {
        success: false,
        error: error.message,
        metrics: {
          processingTime,
          retryAttempt: job.attemptsMade,
        },
      };
      
      // Log failed execution
      await this.logNodeExecution(nodeId, executionContext.executionId, 'failed', errorResult);
      
      throw error;
    }
  }

  private async processSendEmail(nodeData: any, context: any): Promise<ActionResult> {
    const { to, subject, template, templateData, organizationId } = this.interpolateVariables(nodeData, context);
    
    // Validate required fields
    if (!to || !subject) {
      throw new Error('Email recipient and subject are required');
    }
    
    try {
      // Get organization email settings
      const { data: orgSettings } = await this.supabase
        .from('organizations')
        .select('email_settings')
        .eq('id', organizationId)
        .single();
      
      const emailSettings = orgSettings?.email_settings || {};
      
      // Send email using the email service
      const result = await sendEmail({
        to,
        subject,
        template: template || 'default',
        templateData: templateData || {},
        organizationId,
        from: emailSettings.fromEmail || process.env.DEFAULT_FROM_EMAIL,
      });
      
      return {
        success: true,
        data: {
          messageId: result.messageId,
          to,
          subject,
        },
        variables: {
          emailSent: true,
          emailMessageId: result.messageId,
        },
      };
      
    } catch (error) {
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  private async processSendSMS(nodeData: any, context: any): Promise<ActionResult> {
    const { to, message, organizationId } = this.interpolateVariables(nodeData, context);
    
    // Validate required fields
    if (!to || !message) {
      throw new Error('SMS recipient and message are required');
    }
    
    try {
      // Get organization SMS settings
      const { data: orgSettings } = await this.supabase
        .from('organizations')
        .select('sms_settings')
        .eq('id', organizationId)
        .single();
      
      const smsSettings = orgSettings?.sms_settings || {};
      
      // Send SMS using the SMS service
      const result = await sendSMS({
        to,
        message,
        organizationId,
        from: smsSettings.fromNumber || process.env.TWILIO_PHONE_NUMBER,
      });
      
      return {
        success: true,
        data: {
          messageId: result.sid,
          to,
          message: message.substring(0, 50) + '...', // Truncate for logging
        },
        variables: {
          smsSent: true,
          smsMessageId: result.sid,
        },
      };
      
    } catch (error) {
      throw new Error(`Failed to send SMS: ${error.message}`);
    }
  }

  private async processSendWhatsApp(nodeData: any, context: any): Promise<ActionResult> {
    const { to, message, organizationId } = this.interpolateVariables(nodeData, context);
    
    // Validate required fields
    if (!to || !message) {
      throw new Error('WhatsApp recipient and message are required');
    }
    
    try {
      // Send WhatsApp message
      const result = await sendWhatsAppMessage({
        to,
        message,
        organizationId,
      });
      
      return {
        success: true,
        data: {
          messageId: result.messageId,
          to,
          message: message.substring(0, 50) + '...', // Truncate for logging
        },
        variables: {
          whatsappSent: true,
          whatsappMessageId: result.messageId,
        },
      };
      
    } catch (error) {
      throw new Error(`Failed to send WhatsApp message: ${error.message}`);
    }
  }

  private async processUpdateLead(nodeData: any, context: any): Promise<ActionResult> {
    const { leadId, updates, organizationId } = this.interpolateVariables(nodeData, context);
    
    // Get lead ID from context if not provided
    const targetLeadId = leadId || context.variables.leadId || context.triggerData?.lead?.id;
    
    if (!targetLeadId) {
      throw new Error('Lead ID not found in context or node data');
    }
    
    try {
      // Update lead in database
      const { data: updatedLead, error } = await this.supabase
        .from('leads')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', targetLeadId)
        .eq('organization_id', organizationId)
        .select()
        .single();
      
      if (error) {
        throw new Error(`Failed to update lead: ${error.message}`);
      }
      
      return {
        success: true,
        data: updatedLead,
        variables: {
          leadUpdated: true,
          updatedLeadId: targetLeadId,
          leadData: updatedLead,
        },
      };
      
    } catch (error) {
      throw new Error(`Failed to update lead: ${error.message}`);
    }
  }

  private async processCreateContact(nodeData: any, context: any): Promise<ActionResult> {
    const { contactData, organizationId } = this.interpolateVariables(nodeData, context);
    
    try {
      // Create new contact
      const { data: newContact, error } = await this.supabase
        .from('contacts')
        .insert({
          ...contactData,
          organization_id: organizationId,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();
      
      if (error) {
        throw new Error(`Failed to create contact: ${error.message}`);
      }
      
      return {
        success: true,
        data: newContact,
        variables: {
          contactCreated: true,
          newContactId: newContact.id,
          contactData: newContact,
        },
      };
      
    } catch (error) {
      throw new Error(`Failed to create contact: ${error.message}`);
    }
  }

  private async processAddTag(nodeData: any, context: any): Promise<ActionResult> {
    const { targetId, targetType, tagName, organizationId } = this.interpolateVariables(nodeData, context);
    
    // Determine target from context if not provided
    const actualTargetId = targetId || context.variables.leadId || context.variables.contactId;
    const actualTargetType = targetType || (context.variables.leadId ? 'lead' : 'contact');
    
    if (!actualTargetId || !tagName) {
      throw new Error('Target ID and tag name are required');
    }
    
    try {
      // Get or create tag
      const { data: tag, error: tagError } = await this.supabase
        .from('tags')
        .select('id')
        .eq('name', tagName)
        .eq('organization_id', organizationId)
        .single();
      
      let tagId = tag?.id;
      
      if (!tagId) {
        // Create tag if it doesn't exist
        const { data: newTag, error: createError } = await this.supabase
          .from('tags')
          .insert({
            name: tagName,
            organization_id: organizationId,
          })
          .select('id')
          .single();
        
        if (createError) {
          throw new Error(`Failed to create tag: ${createError.message}`);
        }
        
        tagId = newTag.id;
      }
      
      // Add tag to target
      const tableName = actualTargetType === 'lead' ? 'lead_tags' : 'contact_tags';
      const targetColumn = actualTargetType === 'lead' ? 'lead_id' : 'contact_id';
      
      const { error: linkError } = await this.supabase
        .from(tableName)
        .insert({
          [targetColumn]: actualTargetId,
          tag_id: tagId,
          organization_id: organizationId,
        });
      
      if (linkError && !linkError.message.includes('duplicate key')) {
        throw new Error(`Failed to add tag: ${linkError.message}`);
      }
      
      return {
        success: true,
        data: {
          targetId: actualTargetId,
          targetType: actualTargetType,
          tagName,
          tagId,
        },
        variables: {
          tagAdded: true,
          addedTagName: tagName,
          addedTagId: tagId,
        },
      };
      
    } catch (error) {
      throw new Error(`Failed to add tag: ${error.message}`);
    }
  }

  private async processRemoveTag(nodeData: any, context: any): Promise<ActionResult> {
    const { targetId, targetType, tagName, organizationId } = this.interpolateVariables(nodeData, context);
    
    // Determine target from context if not provided
    const actualTargetId = targetId || context.variables.leadId || context.variables.contactId;
    const actualTargetType = targetType || (context.variables.leadId ? 'lead' : 'contact');
    
    if (!actualTargetId || !tagName) {
      throw new Error('Target ID and tag name are required');
    }
    
    try {
      // Get tag
      const { data: tag } = await this.supabase
        .from('tags')
        .select('id')
        .eq('name', tagName)
        .eq('organization_id', organizationId)
        .single();
      
      if (!tag) {
        // Tag doesn't exist, consider it as success
        return {
          success: true,
          data: { tagNotFound: true },
          variables: { tagRemoved: false, tagNotFound: true },
        };
      }
      
      // Remove tag from target
      const tableName = actualTargetType === 'lead' ? 'lead_tags' : 'contact_tags';
      const targetColumn = actualTargetType === 'lead' ? 'lead_id' : 'contact_id';
      
      const { error } = await this.supabase
        .from(tableName)
        .delete()
        .eq(targetColumn, actualTargetId)
        .eq('tag_id', tag.id);
      
      if (error) {
        throw new Error(`Failed to remove tag: ${error.message}`);
      }
      
      return {
        success: true,
        data: {
          targetId: actualTargetId,
          targetType: actualTargetType,
          tagName,
          tagId: tag.id,
        },
        variables: {
          tagRemoved: true,
          removedTagName: tagName,
          removedTagId: tag.id,
        },
      };
      
    } catch (error) {
      throw new Error(`Failed to remove tag: ${error.message}`);
    }
  }

  private async processUpdateScore(nodeData: any, context: any): Promise<ActionResult> {
    const { leadId, scoreChange, reason, organizationId } = this.interpolateVariables(nodeData, context);
    
    // Get lead ID from context if not provided
    const targetLeadId = leadId || context.variables.leadId || context.triggerData?.lead?.id;
    
    if (!targetLeadId || scoreChange === undefined) {
      throw new Error('Lead ID and score change are required');
    }
    
    try {
      // Get current lead score
      const { data: currentLead, error: fetchError } = await this.supabase
        .from('leads')
        .select('score')
        .eq('id', targetLeadId)
        .eq('organization_id', organizationId)
        .single();
      
      if (fetchError) {
        throw new Error(`Failed to fetch current lead: ${fetchError.message}`);
      }
      
      const currentScore = currentLead.score || 0;
      const newScore = Math.max(0, Math.min(100, currentScore + scoreChange)); // Clamp between 0-100
      
      // Update lead score
      const { error: updateError } = await this.supabase
        .from('leads')
        .update({
          score: newScore,
          updated_at: new Date().toISOString(),
        })
        .eq('id', targetLeadId)
        .eq('organization_id', organizationId);
      
      if (updateError) {
        throw new Error(`Failed to update lead score: ${updateError.message}`);
      }
      
      // Log score change
      await this.supabase
        .from('lead_score_history')
        .insert({
          lead_id: targetLeadId,
          organization_id: organizationId,
          old_score: currentScore,
          new_score: newScore,
          change: scoreChange,
          reason: reason || 'Workflow action',
          created_at: new Date().toISOString(),
        });
      
      return {
        success: true,
        data: {
          leadId: targetLeadId,
          oldScore: currentScore,
          newScore,
          change: scoreChange,
        },
        variables: {
          scoreUpdated: true,
          oldScore: currentScore,
          newScore,
          scoreChange,
        },
      };
      
    } catch (error) {
      throw new Error(`Failed to update score: ${error.message}`);
    }
  }

  private async processWebhook(nodeData: any, context: any): Promise<ActionResult> {
    const { url, method = 'POST', headers = {}, payload } = this.interpolateVariables(nodeData, context);
    
    if (!url) {
      throw new Error('Webhook URL is required');
    }
    
    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: method !== 'GET' ? JSON.stringify(payload) : undefined,
        timeout: 30000, // 30 second timeout
      });
      
      const responseData = await response.text();
      let parsedData;
      
      try {
        parsedData = JSON.parse(responseData);
      } catch {
        parsedData = responseData;
      }
      
      if (!response.ok) {
        throw new Error(`Webhook failed with status ${response.status}: ${responseData}`);
      }
      
      return {
        success: true,
        data: {
          status: response.status,
          response: parsedData,
          url,
          method,
        },
        variables: {
          webhookSuccess: true,
          webhookResponse: parsedData,
          webhookStatus: response.status,
        },
      };
      
    } catch (error) {
      throw new Error(`Webhook request failed: ${error.message}`);
    }
  }

  private async processCondition(nodeData: any, context: any): Promise<ActionResult> {
    const { condition } = nodeData;
    
    if (!condition) {
      throw new Error('Condition is required');
    }
    
    try {
      const result = this.evaluateCondition(condition, context);
      
      return {
        success: true,
        data: {
          condition,
          result,
        },
        variables: {
          conditionResult: result,
          conditionMet: result,
        },
      };
      
    } catch (error) {
      throw new Error(`Condition evaluation failed: ${error.message}`);
    }
  }

  private async processCustomAction(nodeData: any, context: any): Promise<ActionResult> {
    const { actionCode, params } = this.interpolateVariables(nodeData, context);
    
    // This is a placeholder for custom action execution
    // In a real implementation, you might:
    // 1. Execute sandboxed JavaScript code
    // 2. Call external APIs
    // 3. Run database queries
    // 4. Integrate with third-party services
    
    console.log(`🔧 Executing custom action: ${actionCode}`);
    
    return {
      success: true,
      data: {
        actionCode,
        params,
        executed: true,
      },
      variables: {
        customActionExecuted: true,
        customActionResult: 'placeholder',
      },
    };
  }

  private interpolateVariables(nodeData: any, context: any): any {
    const variables = {
      ...context.variables,
      ...context.triggerData,
      organizationId: context.organizationId,
      executionId: context.executionId,
    };
    
    return this.deepInterpolate(nodeData, variables);
  }

  private deepInterpolate(obj: any, variables: Record<string, any>): any {
    if (typeof obj === 'string') {
      return this.interpolateString(obj, variables);
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.deepInterpolate(item, variables));
    }
    
    if (obj && typeof obj === 'object') {
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.deepInterpolate(value, variables);
      }
      return result;
    }
    
    return obj;
  }

  private interpolateString(str: string, variables: Record<string, any>): string {
    return str.replace(/\{\{([^}]+)\}\}/g, (match, expression) => {
      try {
        const value = this.evaluateExpression(expression.trim(), variables);
        return value !== undefined ? String(value) : match;
      } catch (error) {
        console.warn(`Failed to interpolate expression: ${expression}`, error);
        return match;
      }
    });
  }

  private evaluateExpression(expression: string, variables: Record<string, any>): any {
    // Simple expression evaluation
    // In a production system, you'd want a proper expression evaluator
    const parts = expression.split('.');
    let current = variables;
    
    for (const part of parts) {
      current = current?.[part];
    }
    
    return current;
  }

  private evaluateCondition(condition: any, context: any): boolean {
    const { left, operator, right } = condition;
    
    const leftValue = this.evaluateExpression(left, context.variables);
    const rightValue = typeof right === 'string' && right.includes('.') 
      ? this.evaluateExpression(right, context.variables) 
      : right;
    
    switch (operator) {
      case 'equals':
      case '==':
        return leftValue == rightValue;
      case 'not_equals':
      case '!=':
        return leftValue != rightValue;
      case 'greater_than':
      case '>':
        return Number(leftValue) > Number(rightValue);
      case 'less_than':
      case '<':
        return Number(leftValue) < Number(rightValue);
      case 'greater_equal':
      case '>=':
        return Number(leftValue) >= Number(rightValue);
      case 'less_equal':
      case '<=':
        return Number(leftValue) <= Number(rightValue);
      case 'contains':
        return String(leftValue).includes(String(rightValue));
      case 'not_contains':
        return !String(leftValue).includes(String(rightValue));
      case 'exists':
        return leftValue !== undefined && leftValue !== null;
      case 'not_exists':
        return leftValue === undefined || leftValue === null;
      default:
        throw new Error(`Unknown operator: ${operator}`);
    }
  }

  private async logNodeExecution(
    nodeId: string, 
    executionId: string, 
    status: 'completed' | 'failed',
    result: ActionResult
  ) {
    try {
      await this.supabase
        .from('node_execution_logs')
        .insert({
          node_id: nodeId,
          execution_id: executionId,
          status,
          result,
          executed_at: new Date().toISOString(),
        });
    } catch (error) {
      console.error('Failed to log node execution:', error);
    }
  }
}

// Create and export processor instance
export const enhancedActionProcessor = new EnhancedActionProcessor();

// Export the main processing function for the job queue
export async function processNodeExecution(job: Job<NodeExecutionJobData>): Promise<ActionResult> {
  return enhancedActionProcessor.processNodeExecution(job);
}