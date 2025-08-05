import { Job } from 'bullmq';
import { createAdminClient } from '@/app/lib/supabase/admin';
import { sendEmail } from '@/app/lib/email';
import { sendSMS } from '@/app/lib/sms';
import { sendWhatsApp } from '@/app/lib/whatsapp';
import { queueManager } from '../queue-manager';
import { QUEUE_NAMES, JOB_TYPES } from '../config';

interface NodeExecutionData {
  nodeId: string;
  node: any;
  workflowId: string;
  executionId: string;
  organizationId: string;
  context: Record<string, any>;
}

export async function processNodeExecution(job: Job<NodeExecutionData>) {
  const { nodeId, node, workflowId, executionId, organizationId, context } = job.data;
  
  console.log(`Executing node ${nodeId} (${node.type}) for workflow ${workflowId}`);
  
  const supabase = createAdminClient();
  const startTime = Date.now();
  
  try {
    let result: any = {};
    
    // Execute based on node type
    switch (node.type) {
      case 'action':
        result = await executeAction(node, context, organizationId);
        break;
        
      case 'condition':
        result = await executeCondition(node, context);
        break;
        
      case 'wait':
        result = await executeWait(node, context, executionId);
        break;
        
      default:
        throw new Error(`Unknown node type: ${node.type}`);
    }
    
    // Log execution step
    await logExecutionStep(supabase, executionId, {
      nodeId,
      nodeType: node.type,
      nodeLabel: node.data?.label,
      status: 'completed',
      result,
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    });
    
    // Queue next nodes
    const { data: workflow } = await supabase
      .from('workflows')
      .select('nodes, edges')
      .eq('id', workflowId)
      .single();
    
    if (workflow) {
      const nextNodes = getNextNodes(nodeId, workflow.nodes, workflow.edges, result);
      
      for (const nextNode of nextNodes) {
        await queueManager.addJob(
          QUEUE_NAMES.WORKFLOW_ACTIONS,
          JOB_TYPES.EXECUTE_NODE,
          {
            nodeId: nextNode.id,
            node: nextNode,
            workflowId,
            executionId,
            organizationId,
            context: { ...context, ...result },
          },
          {
            priority: 2,
            attempts: 3,
          }
        );
      }
      
      // Check if workflow is complete
      if (nextNodes.length === 0) {
        await completeWorkflowExecution(supabase, executionId, context);
      }
    }
    
    return { success: true, result };
    
  } catch (error) {
    console.error(`Error executing node ${nodeId}:`, error);
    
    // Log failed step
    await logExecutionStep(supabase, executionId, {
      nodeId,
      nodeType: node.type,
      nodeLabel: node.data?.label,
      status: 'failed',
      error: error.message,
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    });
    
    // Check workflow error handling settings
    const { data: workflow } = await supabase
      .from('workflows')
      .select('settings')
      .eq('id', workflowId)
      .single();
    
    if (workflow?.settings?.errorHandling === 'stop') {
      // Mark workflow as failed
      await supabase
        .from('workflow_executions')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_message: `Node ${nodeId} failed: ${error.message}`,
        })
        .eq('id', executionId);
    }
    
    throw error;
  }
}

async function executeAction(node: any, context: any, organizationId: string): Promise<any> {
  const { label, ...config } = node.data || {};
  
  switch (label) {
    case 'Send Email':
      return await executeSendEmail(config, context, organizationId);
      
    case 'Send SMS':
      return await executeSendSMS(config, context);
      
    case 'Send WhatsApp':
      return await executeSendWhatsApp(config, context);
      
    case 'Add Tag':
      return await executeAddTag(config, context, organizationId);
      
    case 'Update Lead':
      return await executeUpdateLead(config, context, organizationId);
      
    default:
      console.warn(`Unknown action type: ${label}`);
      return {};
  }
}

async function executeSendEmail(config: any, context: any, organizationId: string) {
  const { templateId, subject, customMessage } = config;
  const lead = context.lead || context;
  
  if (!lead.email) {
    throw new Error('No email address found for lead');
  }
  
  const supabase = createAdminClient();
  let emailContent = '';
  
  if (templateId) {
    const { data: template } = await supabase
      .from('message_templates')
      .select('*')
      .eq('id', templateId)
      .eq('organization_id', organizationId)
      .single();
    
    if (template) {
      emailContent = replaceVariables(template.content, context);
    }
  } else if (customMessage) {
    emailContent = replaceVariables(customMessage, context);
  }
  
  await sendEmail({
    to: lead.email,
    subject: subject || 'Message from Atlas Fitness',
    html: emailContent,
    organizationId,
  });
  
  return { sent: true, recipient: lead.email };
}

async function executeSendSMS(config: any, context: any) {
  const { message } = config;
  const lead = context.lead || context;
  
  if (!lead.phone) {
    throw new Error('No phone number found for lead');
  }
  
  const smsContent = replaceVariables(message, context);
  
  await sendSMS({
    to: lead.phone,
    body: smsContent,
  });
  
  return { sent: true, recipient: lead.phone };
}

async function executeSendWhatsApp(config: any, context: any) {
  const { message } = config;
  const lead = context.lead || context;
  
  if (!lead.phone) {
    throw new Error('No phone number found for lead');
  }
  
  const whatsappContent = replaceVariables(message, context);
  
  await sendWhatsApp({
    to: lead.phone,
    body: whatsappContent,
  });
  
  return { sent: true, recipient: lead.phone };
}

async function executeAddTag(config: any, context: any, organizationId: string) {
  const { tag } = config;
  const lead = context.lead || context;
  
  if (!lead.id) {
    throw new Error('No lead ID found');
  }
  
  const supabase = createAdminClient();
  
  // Get current tags
  const { data: currentLead } = await supabase
    .from('leads')
    .select('tags')
    .eq('id', lead.id)
    .single();
  
  const currentTags = currentLead?.tags || [];
  
  if (!currentTags.includes(tag)) {
    await supabase
      .from('leads')
      .update({ 
        tags: [...currentTags, tag],
        updated_at: new Date().toISOString(),
      })
      .eq('id', lead.id);
  }
  
  return { tagAdded: tag };
}

async function executeUpdateLead(config: any, context: any, organizationId: string) {
  const { updates } = config;
  const lead = context.lead || context;
  
  if (!lead.id) {
    throw new Error('No lead ID found');
  }
  
  const supabase = createAdminClient();
  
  // Apply variable replacements to update values
  const processedUpdates: any = {};
  for (const [key, value] of Object.entries(updates)) {
    if (typeof value === 'string') {
      processedUpdates[key] = replaceVariables(value, context);
    } else {
      processedUpdates[key] = value;
    }
  }
  
  await supabase
    .from('leads')
    .update({
      ...processedUpdates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', lead.id);
  
  return { updated: true, fields: Object.keys(processedUpdates) };
}

async function executeCondition(node: any, context: any): Promise<any> {
  const { field, operator, value } = node.data || {};
  const lead = context.lead || context;
  
  let fieldValue = getNestedValue(lead, field);
  let conditionMet = false;
  
  switch (operator) {
    case 'equals':
      conditionMet = fieldValue == value;
      break;
    case 'not_equals':
      conditionMet = fieldValue != value;
      break;
    case 'contains':
      conditionMet = fieldValue && String(fieldValue).includes(value);
      break;
    case 'greater':
      conditionMet = parseFloat(fieldValue) > parseFloat(value);
      break;
    case 'less':
      conditionMet = parseFloat(fieldValue) < parseFloat(value);
      break;
    case 'exists':
      conditionMet = fieldValue !== null && fieldValue !== undefined;
      break;
    case 'not_exists':
      conditionMet = fieldValue === null || fieldValue === undefined;
      break;
  }
  
  return {
    conditionMet,
    field,
    operator,
    value,
    actualValue: fieldValue,
  };
}

async function executeWait(node: any, context: any, executionId: string): Promise<any> {
  const { duration, unit } = node.data || {};
  let delayMs = parseInt(duration) || 1;
  
  switch (unit) {
    case 'minutes':
      delayMs *= 60 * 1000;
      break;
    case 'hours':
      delayMs *= 60 * 60 * 1000;
      break;
    case 'days':
      delayMs *= 24 * 60 * 60 * 1000;
      break;
    default:
      delayMs *= 1000; // seconds
  }
  
  // For long waits, we'll use delayed jobs instead of blocking
  if (delayMs > 30000) { // More than 30 seconds
    return {
      waitScheduled: true,
      resumeAt: new Date(Date.now() + delayMs).toISOString(),
      delayMs,
    };
  }
  
  // For short waits, we can block
  await new Promise(resolve => setTimeout(resolve, delayMs));
  
  return {
    waitCompleted: true,
    duration: delayMs,
  };
}

function getNextNodes(
  currentNodeId: string,
  nodes: any[],
  edges: any[],
  executionResult: any
): any[] {
  const outgoingEdges = edges.filter(e => e.source === currentNodeId);
  
  // For condition nodes, filter based on result
  if (executionResult?.conditionMet !== undefined) {
    const matchingEdges = outgoingEdges.filter(edge => {
      // Check if edge has a condition label
      if (edge.label === 'true' && executionResult.conditionMet) return true;
      if (edge.label === 'false' && !executionResult.conditionMet) return true;
      if (!edge.label) return true; // Default edge
      return false;
    });
    
    return matchingEdges
      .map(edge => nodes.find(n => n.id === edge.target))
      .filter(Boolean);
  }
  
  // For other nodes, return all connected nodes
  return outgoingEdges
    .map(edge => nodes.find(n => n.id === edge.target))
    .filter(Boolean);
}

function replaceVariables(template: string, context: any): string {
  const lead = context.lead || context;
  
  return template
    .replace(/{{name}}/g, lead.name || lead.first_name || 'there')
    .replace(/{{firstName}}/g, lead.first_name || lead.name?.split(' ')[0] || 'there')
    .replace(/{{lastName}}/g, lead.last_name || lead.name?.split(' ')[1] || '')
    .replace(/{{email}}/g, lead.email || '')
    .replace(/{{phone}}/g, lead.phone || '')
    .replace(/{{organizationName}}/g, context.organizationName || 'Atlas Fitness');
}

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, part) => current?.[part], obj);
}

async function logExecutionStep(
  supabase: any,
  executionId: string,
  step: any
): Promise<void> {
  // Get current steps
  const { data: execution } = await supabase
    .from('workflow_executions')
    .select('execution_steps')
    .eq('id', executionId)
    .single();
  
  const currentSteps = execution?.execution_steps || [];
  currentSteps.push(step);
  
  // Update execution with new step
  await supabase
    .from('workflow_executions')
    .update({
      execution_steps: currentSteps,
      updated_at: new Date().toISOString(),
    })
    .eq('id', executionId);
}

async function completeWorkflowExecution(
  supabase: any,
  executionId: string,
  finalContext: any
): Promise<void> {
  await supabase
    .from('workflow_executions')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      output_data: finalContext,
    })
    .eq('id', executionId);
    
  // Update workflow stats
  const { data: execution } = await supabase
    .from('workflow_executions')
    .select('workflow_id')
    .eq('id', executionId)
    .single();
    
  if (execution) {
    await supabase.rpc('increment_workflow_stats', {
      p_workflow_id: execution.workflow_id,
      p_successful: true,
    });
  }
}