import { createAdminClient } from '@/app/lib/supabase/admin';
import { sendEmail } from '@/app/lib/email';
import { sendSMS } from '@/app/lib/sms';
import { sendWhatsApp } from '@/app/lib/whatsapp';

export interface WorkflowNode {
  id: string;
  type: 'trigger' | 'action' | 'condition';
  data: any;
  position: { x: number; y: number };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface WorkflowExecution {
  workflowId: string;
  organizationId: string;
  triggerData: any;
  context: Record<string, any>;
}

export class WorkflowExecutionEngine {
  private supabase: any;
  private executionId: string | null = null;
  private steps: any[] = [];

  constructor() {
    // Will be initialized when needed
  }

  async initialize() {
    this.supabase = await createAdminClient();
  }

  async executeWorkflow(execution: WorkflowExecution) {
    if (!this.supabase) {
      await this.initialize();
    }

    try {
      // Get workflow details
      const { data: workflow, error: workflowError } = await this.supabase
        .from('workflows')
        .select('*')
        .eq('id', execution.workflowId)
        .eq('organization_id', execution.organizationId)
        .single();

      if (workflowError || !workflow) {
        throw new Error('Workflow not found');
      }

      if (workflow.status !== 'active') {
        console.log(`Workflow ${workflow.name} is not active`);
        return;
      }

      // Create execution record
      const { data: executionRecord, error: execError } = await this.supabase
        .from('workflow_executions')
        .insert({
          workflow_id: execution.workflowId,
          organization_id: execution.organizationId,
          status: 'running',
          triggered_by: execution.triggerData.type || 'manual',
          trigger_data: execution.triggerData,
          input_data: execution.context
        })
        .select()
        .single();

      if (execError || !executionRecord) {
        throw new Error('Failed to create execution record');
      }

      this.executionId = executionRecord.id;

      // Parse workflow nodes and edges
      const nodes: WorkflowNode[] = workflow.nodes || [];
      const edges: WorkflowEdge[] = workflow.edges || [];

      // Find trigger node
      const triggerNode = nodes.find(n => n.type === 'trigger');
      if (!triggerNode) {
        throw new Error('No trigger node found');
      }

      // Build execution path
      const executionPath = this.buildExecutionPath(triggerNode, nodes, edges);

      // Execute nodes in sequence
      let currentContext = { ...execution.context, ...execution.triggerData };
      
      for (const node of executionPath) {
        try {
          currentContext = await this.executeNode(node, currentContext, execution.organizationId);
          this.steps.push({
            nodeId: node.id,
            nodeType: node.type,
            nodeLabel: node.data.label,
            status: 'completed',
            timestamp: new Date().toISOString()
          });
        } catch (nodeError) {
          this.steps.push({
            nodeId: node.id,
            nodeType: node.type,
            nodeLabel: node.data.label,
            status: 'failed',
            error: nodeError.message,
            timestamp: new Date().toISOString()
          });
          
          // Check error handling settings
          if (workflow.settings?.errorHandling === 'stop') {
            throw nodeError;
          }
          // Continue execution if errorHandling is 'continue'
        }
      }

      // Update execution as completed
      await this.completeExecution('completed', currentContext);

      // Update workflow stats
      await this.updateWorkflowStats(execution.workflowId, true);

    } catch (error) {
      console.error('Workflow execution error:', error);
      await this.completeExecution('failed', {}, error.message);
      await this.updateWorkflowStats(execution.workflowId, false);
      throw error;
    }
  }

  private buildExecutionPath(startNode: WorkflowNode, nodes: WorkflowNode[], edges: WorkflowEdge[]): WorkflowNode[] {
    const path: WorkflowNode[] = [];
    const visited = new Set<string>();
    
    const traverse = (currentNode: WorkflowNode) => {
      if (visited.has(currentNode.id)) return;
      visited.add(currentNode.id);
      
      if (currentNode.type !== 'trigger') {
        path.push(currentNode);
      }
      
      // Find connected nodes
      const outgoingEdges = edges.filter(e => e.source === currentNode.id);
      
      for (const edge of outgoingEdges) {
        const targetNode = nodes.find(n => n.id === edge.target);
        if (targetNode) {
          traverse(targetNode);
        }
      }
    };
    
    traverse(startNode);
    return path;
  }

  private async executeNode(node: WorkflowNode, context: any, organizationId: string): Promise<any> {
    console.log(`Executing node: ${node.data.label} (${node.type})`);
    
    switch (node.type) {
      case 'action':
        return await this.executeAction(node, context, organizationId);
      case 'condition':
        return await this.executeCondition(node, context);
      default:
        return context;
    }
  }

  private async executeAction(node: WorkflowNode, context: any, organizationId: string): Promise<any> {
    const { label, ...nodeData } = node.data;
    
    switch (label) {
      case 'Send Email':
        await this.executeSendEmail(nodeData, context, organizationId);
        break;
        
      case 'Send SMS':
        await this.executeSendSMS(nodeData, context);
        break;
        
      case 'Send WhatsApp':
        await this.executeSendWhatsApp(nodeData, context);
        break;
        
      case 'Add Tag':
        await this.executeAddTag(nodeData, context, organizationId);
        break;
        
      case 'Wait':
        await this.executeWait(nodeData);
        break;
        
      default:
        console.warn(`Unknown action type: ${label}`);
    }
    
    return context;
  }

  private async executeSendEmail(nodeData: any, context: any, organizationId: string) {
    const { templateId, subject, customMessage } = nodeData;
    
    // Get lead details
    const lead = context.lead || context;
    if (!lead.email) {
      throw new Error('No email address found for lead');
    }

    let emailContent = '';
    
    if (templateId) {
      // Fetch template
      const { data: template } = await this.supabase
        .from('message_templates')
        .select('*')
        .eq('id', templateId)
        .eq('organization_id', organizationId)
        .single();
        
      if (template) {
        emailContent = this.replaceVariables(template.content, context);
      }
    } else if (customMessage) {
      emailContent = this.replaceVariables(customMessage, context);
    }

    // Send email
    await sendEmail({
      to: lead.email,
      subject: subject || 'Message from Atlas Fitness',
      html: emailContent,
      organizationId
    });
  }

  private async executeSendSMS(nodeData: any, context: any) {
    const { message } = nodeData;
    
    const lead = context.lead || context;
    if (!lead.phone) {
      throw new Error('No phone number found for lead');
    }

    const smsContent = this.replaceVariables(message, context);
    
    await sendSMS({
      to: lead.phone,
      body: smsContent
    });
  }

  private async executeSendWhatsApp(nodeData: any, context: any) {
    const { message } = nodeData;
    
    const lead = context.lead || context;
    if (!lead.phone) {
      throw new Error('No phone number found for lead');
    }

    const whatsappContent = this.replaceVariables(message, context);
    
    await sendWhatsApp({
      to: lead.phone,
      body: whatsappContent
    });
  }

  private async executeAddTag(nodeData: any, context: any, organizationId: string) {
    const { tag } = nodeData;
    const lead = context.lead || context;
    
    if (!lead.id) {
      throw new Error('No lead ID found');
    }

    // Get current tags
    const { data: currentLead } = await this.supabase
      .from('leads')
      .select('tags')
      .eq('id', lead.id)
      .single();

    const currentTags = currentLead?.tags || [];
    if (!currentTags.includes(tag)) {
      // Add new tag
      await this.supabase
        .from('leads')
        .update({ 
          tags: [...currentTags, tag],
          updated_at: new Date().toISOString()
        })
        .eq('id', lead.id);
    }
  }

  private async executeWait(nodeData: any) {
    const { duration, unit } = nodeData;
    let milliseconds = parseInt(duration) || 1;
    
    switch (unit) {
      case 'minutes':
        milliseconds *= 60 * 1000;
        break;
      case 'hours':
        milliseconds *= 60 * 60 * 1000;
        break;
      case 'days':
        milliseconds *= 24 * 60 * 60 * 1000;
        break;
      default:
        milliseconds *= 1000; // Default to seconds
    }
    
    // For now, we'll cap wait time at 5 minutes for testing
    const maxWait = 5 * 60 * 1000;
    milliseconds = Math.min(milliseconds, maxWait);
    
    await new Promise(resolve => setTimeout(resolve, milliseconds));
  }

  private async executeCondition(node: WorkflowNode, context: any): Promise<any> {
    const { field, operator, value } = node.data;
    const lead = context.lead || context;
    
    let fieldValue = lead[field];
    let conditionMet = false;
    
    switch (operator) {
      case 'equals':
        conditionMet = fieldValue === value;
        break;
      case 'contains':
        conditionMet = fieldValue && fieldValue.includes(value);
        break;
      case 'greater':
        conditionMet = parseFloat(fieldValue) > parseFloat(value);
        break;
      case 'less':
        conditionMet = parseFloat(fieldValue) < parseFloat(value);
        break;
    }
    
    // Store condition result in context
    return {
      ...context,
      [`condition_${node.id}`]: conditionMet
    };
  }

  private replaceVariables(template: string, context: any): string {
    const lead = context.lead || context;
    
    return template
      .replace(/{{name}}/g, lead.name || 'there')
      .replace(/{{email}}/g, lead.email || '')
      .replace(/{{phone}}/g, lead.phone || '')
      .replace(/{{firstName}}/g, (lead.name || '').split(' ')[0] || 'there')
      .replace(/{{organizationName}}/g, context.organizationName || 'Atlas Fitness');
  }

  private async completeExecution(status: 'completed' | 'failed', outputData: any, errorMessage?: string) {
    if (!this.executionId || !this.supabase) return;
    
    await this.supabase
      .from('workflow_executions')
      .update({
        status,
        completed_at: new Date().toISOString(),
        output_data: outputData,
        error_message: errorMessage,
        execution_steps: this.steps
      })
      .eq('id', this.executionId);
  }

  // Enhanced workflow statistics with execution time tracking
  private async updateWorkflowStats(workflowId: string, success: boolean, executionTimeMs?: number) {
    if (!this.supabase) return;
    
    try {
      const updates: any = {
        total_executions: this.supabase.raw('total_executions + 1'),
        last_run_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      if (success) {
        updates.successful_executions = this.supabase.raw('successful_executions + 1');
        
        // Update average execution time if provided
        if (executionTimeMs) {
          // This would ideally use a proper RPC function for accurate averaging
          updates.avg_execution_time_ms = executionTimeMs;
          updates.last_execution_time_ms = executionTimeMs;
        }
      } else {
        updates.failed_executions = this.supabase.raw('failed_executions + 1');
        updates.last_failure_at = new Date().toISOString();
        
        if (executionTimeMs) {
          updates.last_execution_time_ms = executionTimeMs;
        }
      }
      
      const { error } = await this.supabase
        .from('workflows')
        .update(updates)
        .eq('id', workflowId);
        
      if (error) {
        console.error('Failed to update workflow stats:', error);
      }
      
    } catch (statsError) {
      console.error('Critical error updating workflow stats:', statsError);
    }
  }
  
  // Update execution progress (for long-running workflows)
  private async updateExecutionProgress(progress: number, message?: string) {
    if (!this.executionId || !this.supabase) return;
    
    try {
      await this.supabase
        .from('workflow_executions')
        .update({
          progress: Math.max(0, Math.min(100, progress)),
          progress_message: message,
          updated_at: new Date().toISOString()
        })
        .eq('id', this.executionId);
    } catch (error) {
      console.error('Failed to update execution progress:', error);
    }
  }
  
  // Update execution status
  private async updateExecutionStatus(status: string, metadata?: any) {
    if (!this.executionId || !this.supabase) return;
    
    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString()
      };
      
      if (metadata) {
        updateData.execution_metadata = metadata;
      }
      
      await this.supabase
        .from('workflow_executions')
        .update(updateData)
        .eq('id', this.executionId);
    } catch (error) {
      console.error('Failed to update execution status:', error);
    }
  }
  
  // Log individual node execution
  private async logNodeExecution(nodeId: string, status: string, data: any) {
    if (!this.executionId || !this.supabase) return;
    
    try {
      await this.supabase
        .from('workflow_execution_steps')
        .insert({
          execution_id: this.executionId,
          node_id: nodeId,
          status,
          step_data: data,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Failed to log node execution:', error);
    }
  }

  // Enhanced action execution with better error handling
  private async executeActionEnhanced(node: WorkflowNode, context: any, organizationId: string, workflow: any): Promise<any> {
    const { label, ...nodeData } = node.data;
    
    console.log(`🎬 Executing action: ${label}`);
    
    try {
      switch (label) {
        case 'Send Email':
          await this.executeSendEmailEnhanced(nodeData, context, organizationId);
          break;
          
        case 'Send SMS':
          await this.executeSendSMSEnhanced(nodeData, context, organizationId);
          break;
          
        case 'Send WhatsApp':
          await this.executeSendWhatsAppEnhanced(nodeData, context, organizationId);
          break;
          
        case 'Add Tag':
          await this.executeAddTagEnhanced(nodeData, context, organizationId);
          break;
          
        case 'Wait':
          await this.executeWait(nodeData);
          break;
          
        default:
          console.warn(`Unknown action type: ${label}`);
          // Try to execute with legacy method
          await this.executeAction(node, context, organizationId);
      }
      
      return {
        ...context,
        [`action_${node.id}_completed`]: true,
        [`action_${node.id}_timestamp`]: new Date().toISOString()
      };
      
    } catch (actionError) {
      console.error(`Action '${label}' failed:`, actionError.message);
      
      // Enhanced error context
      throw new Error(`Action '${label}' failed: ${actionError.message}`);
    }
  }
  
  // Enhanced condition execution
  private async executeConditionEnhanced(node: WorkflowNode, context: any, workflow: any): Promise<any> {
    const { field, operator, value } = node.data;
    const lead = context.lead || context;
    
    let fieldValue = lead[field];
    let conditionMet = false;
    
    console.log(`🤔 Evaluating condition: ${field} ${operator} ${value}`);
    
    try {
      switch (operator) {
        case 'equals':
          conditionMet = fieldValue === value;
          break;
        case 'not_equals':
          conditionMet = fieldValue !== value;
          break;
        case 'contains':
          conditionMet = fieldValue && fieldValue.toString().includes(value);
          break;
        case 'not_contains':
          conditionMet = !fieldValue || !fieldValue.toString().includes(value);
          break;
        case 'greater':
          conditionMet = parseFloat(fieldValue) > parseFloat(value);
          break;
        case 'less':
          conditionMet = parseFloat(fieldValue) < parseFloat(value);
          break;
        case 'is_empty':
          conditionMet = !fieldValue || fieldValue === '' || fieldValue === null || fieldValue === undefined;
          break;
        case 'is_not_empty':
          conditionMet = fieldValue && fieldValue !== '' && fieldValue !== null && fieldValue !== undefined;
          break;
        default:
          console.warn(`Unknown condition operator: ${operator}`);
          conditionMet = false;
      }
      
      console.log(`✅ Condition result: ${conditionMet}`);
      
      // Store condition result in context with enhanced metadata
      return {
        ...context,
        [`condition_${node.id}`]: conditionMet,
        [`condition_${node.id}_metadata`]: {
          field,
          operator,
          value,
          fieldValue,
          result: conditionMet,
          evaluatedAt: new Date().toISOString()
        }
      };
      
    } catch (conditionError) {
      console.error(`Condition evaluation failed:`, conditionError.message);
      throw new Error(`Condition evaluation failed: ${conditionError.message}`);
    }
  }
  
  // Enhanced communication actions with better error handling and logging
  private async executeSendEmailEnhanced(nodeData: any, context: any, organizationId: string) {
    const { templateId, subject, customMessage, recipient } = nodeData;
    
    // Determine recipient
    const lead = context.lead || context;
    const recipientEmail = recipient || lead.email;
    
    if (!recipientEmail) {
      throw new Error('No email address found for recipient');
    }

    let emailContent = '';
    
    if (templateId) {
      // Fetch template
      const { data: template } = await this.supabase
        .from('message_templates')
        .select('*')
        .eq('id', templateId)
        .eq('organization_id', organizationId)
        .single();
        
      if (template) {
        emailContent = this.replaceVariablesEnhanced(template.content, context);
      } else {
        console.warn(`Email template ${templateId} not found, using custom message`);
        emailContent = customMessage || 'Default email content';
      }
    } else if (customMessage) {
      emailContent = this.replaceVariablesEnhanced(customMessage, context);
    } else {
      throw new Error('No email content provided (no template or custom message)');
    }

    // Send email with enhanced metadata
    await sendEmail({
      to: recipientEmail,
      subject: this.replaceVariablesEnhanced(subject || 'Message from Atlas Fitness', context),
      html: emailContent,
      organizationId,
      metadata: {
        workflowId: context._workflowId,
        executionId: context._executionId,
        nodeId: nodeData.nodeId,
        templateId
      }
    });
    
    console.log(`📧 Email sent to ${recipientEmail}`);
  }
  
  private async executeSendSMSEnhanced(nodeData: any, context: any, organizationId: string) {
    const { message, recipient } = nodeData;
    
    const lead = context.lead || context;
    const recipientPhone = recipient || lead.phone;
    
    if (!recipientPhone) {
      throw new Error('No phone number found for recipient');
    }

    const smsContent = this.replaceVariablesEnhanced(message, context);
    
    await sendSMS({
      to: recipientPhone,
      body: smsContent,
      organizationId,
      metadata: {
        workflowId: context._workflowId,
        executionId: context._executionId
      }
    });
    
    console.log(`📱 SMS sent to ${recipientPhone}`);
  }
  
  private async executeSendWhatsAppEnhanced(nodeData: any, context: any, organizationId: string) {
    const { message, recipient } = nodeData;
    
    const lead = context.lead || context;
    const recipientPhone = recipient || lead.phone;
    
    if (!recipientPhone) {
      throw new Error('No phone number found for recipient');
    }

    const whatsappContent = this.replaceVariablesEnhanced(message, context);
    
    await sendWhatsApp({
      to: recipientPhone,
      body: whatsappContent,
      organizationId,
      metadata: {
        workflowId: context._workflowId,
        executionId: context._executionId
      }
    });
    
    console.log(`💬 WhatsApp sent to ${recipientPhone}`);
  }
  
  private async executeAddTagEnhanced(nodeData: any, context: any, organizationId: string) {
    const { tag, target } = nodeData;
    const lead = context.lead || context;
    
    if (!lead.id) {
      throw new Error('No lead ID found for tag addition');
    }

    // Get current tags
    const { data: currentLead } = await this.supabase
      .from('leads')
      .select('tags')
      .eq('id', lead.id)
      .eq('organization_id', organizationId)
      .single();

    const currentTags = currentLead?.tags || [];
    
    if (!currentTags.includes(tag)) {
      // Add new tag
      const updatedTags = [...currentTags, tag];
      
      await this.supabase
        .from('leads')
        .update({ 
          tags: updatedTags,
          updated_at: new Date().toISOString()
        })
        .eq('id', lead.id)
        .eq('organization_id', organizationId);
        
      console.log(`🏷️ Tag '${tag}' added to lead ${lead.id}`);
    } else {
      console.log(`🏷️ Tag '${tag}' already exists on lead ${lead.id}`);
    }
  }
  
  // Enhanced variable replacement with more context and error handling
  private replaceVariablesEnhanced(template: string, context: any): string {
    const lead = context.lead || context;
    const organization = context.organization || {};
    const workflow = context.workflow || {};
    
    try {
      return template
        // Lead variables
        .replace(/{{name}}/g, lead.name || 'there')
        .replace(/{{email}}/g, lead.email || '')
        .replace(/{{phone}}/g, lead.phone || '')
        .replace(/{{firstName}}/g, (lead.name || '').split(' ')[0] || 'there')
        .replace(/{{lastName}}/g, (lead.name || '').split(' ').slice(1).join(' ') || '')
        .replace(/{{source}}/g, lead.source || 'unknown')
        // Organization variables
        .replace(/{{organizationName}}/g, organization.name || 'Atlas Fitness')
        .replace(/{{organizationPhone}}/g, organization.phone || '')
        .replace(/{{organizationEmail}}/g, organization.email || '')
        // Workflow variables
        .replace(/{{workflowName}}/g, workflow.name || 'Workflow')
        // Date/time variables
        .replace(/{{currentDate}}/g, new Date().toLocaleDateString())
        .replace(/{{currentTime}}/g, new Date().toLocaleTimeString())
        .replace(/{{currentDateTime}}/g, new Date().toLocaleString())
        // Custom context variables
        .replace(/{{([^}]+)}}/g, (match, key) => {
          const value = this.getNestedValue(context, key.trim());
          return value !== undefined ? String(value) : match;
        });
    } catch (error) {
      console.error('Variable replacement failed:', error);
      return template; // Return original template if replacement fails
    }
  }
  
  // Helper to get nested values from context
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }
  
  // Static method to create a queue-enabled execution engine
  static createQueueEnabled(): WorkflowExecutionEngine {
    return new WorkflowExecutionEngine({ useQueue: true });
  }
  
  // Static method to create a direct execution engine (no queue)
  static createDirect(): WorkflowExecutionEngine {
    return new WorkflowExecutionEngine({ useQueue: false });
  }
}