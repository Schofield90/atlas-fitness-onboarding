import { ActionConfig, ExecutionContext, NodeExecutionResult } from '../types';
import { createAdminClient } from '@/app/lib/supabase/admin';

export async function updateLeadAction(
  config: ActionConfig,
  context: ExecutionContext
): Promise<NodeExecutionResult> {
  const { parameters } = config;
  const supabase = createAdminClient();
  
  if (!parameters.leadId && !parameters.leadEmail) {
    throw new Error('Either leadId or leadEmail must be provided');
  }
  
  try {
    // Find lead
    let lead;
    if (parameters.leadId) {
      const leadId = interpolateValue(parameters.leadId, context);
      const { data } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .eq('organization_id', context.organizationId)
        .single();
      lead = data;
    } else {
      const email = interpolateValue(parameters.leadEmail, context);
      const { data } = await supabase
        .from('leads')
        .select('*')
        .eq('email', email)
        .eq('organization_id', context.organizationId)
        .single();
      lead = data;
    }
    
    if (!lead) {
      throw new Error('Lead not found');
    }
    
    // Build update object
    const updates: any = {};
    
    if (parameters.status) {
      updates.status = interpolateValue(parameters.status, context);
    }
    if (parameters.stage) {
      updates.stage = interpolateValue(parameters.stage, context);
    }
    if (parameters.assignedTo) {
      updates.assigned_to = interpolateValue(parameters.assignedTo, context);
    }
    if (parameters.tags) {
      const newTags = interpolateValue(parameters.tags, context);
      updates.tags = Array.isArray(newTags) ? newTags : [newTags];
    }
    if (parameters.customFields) {
      updates.custom_fields = {
        ...lead.custom_fields,
        ...parameters.customFields
      };
    }
    if (parameters.score !== undefined) {
      updates.score = Number(interpolateValue(parameters.score, context));
    }
    
    // Update lead
    const { data: updatedLead, error } = await supabase
      .from('leads')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', lead.id)
      .select()
      .single();
    
    if (error) throw error;
    
    // Log activity
    await supabase
      .from('activity_logs')
      .insert({
        organization_id: context.organizationId,
        entity_type: 'lead',
        entity_id: lead.id,
        action: 'lead_updated',
        details: {
          updates,
          workflowId: context.workflowId,
          executionId: context.executionId
        },
        user_id: 'system'
      });
    
    // Track lead history
    await supabase
      .from('lead_history')
      .insert({
        lead_id: lead.id,
        organization_id: context.organizationId,
        action: 'workflow_update',
        changes: updates,
        metadata: {
          workflowId: context.workflowId,
          executionId: context.executionId
        }
      });
    
    return {
      success: true,
      output: {
        leadId: lead.id,
        updates,
        previousValues: Object.keys(updates).reduce((acc, key) => {
          acc[key] = lead[key];
          return acc;
        }, {} as any)
      }
    };
    
  } catch (error) {
    console.error('Update lead action failed:', error);
    return {
      success: false,
      error: error.message,
      output: { error: error.message }
    };
  }
}

export async function createTaskAction(
  config: ActionConfig,
  context: ExecutionContext
): Promise<NodeExecutionResult> {
  const { parameters } = config;
  const supabase = createAdminClient();
  
  if (!parameters.title || !parameters.assignedTo) {
    throw new Error('Missing required task parameters: title, assignedTo');
  }
  
  try {
    const title = interpolateValue(parameters.title, context);
    const description = parameters.description ? 
      interpolateValue(parameters.description, context) : '';
    const assignedTo = interpolateValue(parameters.assignedTo, context);
    const dueDate = parameters.dueDate ? 
      interpolateValue(parameters.dueDate, context) : null;
    const priority = parameters.priority || 'medium';
    const relatedTo = parameters.relatedTo || {};
    
    // Create task
    const { data: task, error } = await supabase
      .from('tasks')
      .insert({
        organization_id: context.organizationId,
        title,
        description,
        assigned_to: assignedTo,
        due_date: dueDate,
        priority,
        status: 'pending',
        related_type: relatedTo.type || 'workflow',
        related_id: relatedTo.id || context.workflowId,
        metadata: {
          workflowId: context.workflowId,
          executionId: context.executionId,
          createdBy: 'workflow'
        }
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // Send notification to assigned user
    await supabase
      .from('notifications')
      .insert({
        organization_id: context.organizationId,
        user_id: assignedTo,
        type: 'task_assigned',
        title: 'New Task Assigned',
        message: `You have been assigned a new task: ${title}`,
        data: {
          taskId: task.id,
          workflowId: context.workflowId
        }
      });
    
    return {
      success: true,
      output: {
        taskId: task.id,
        title,
        assignedTo,
        dueDate,
        createdAt: task.created_at
      }
    };
    
  } catch (error) {
    console.error('Create task action failed:', error);
    return {
      success: false,
      error: error.message,
      output: { error: error.message }
    };
  }
}

export async function updateOpportunityAction(
  config: ActionConfig,
  context: ExecutionContext
): Promise<NodeExecutionResult> {
  const { parameters } = config;
  const supabase = createAdminClient();
  
  if (!parameters.opportunityId) {
    throw new Error('opportunityId is required');
  }
  
  try {
    const opportunityId = interpolateValue(parameters.opportunityId, context);
    
    // Get current opportunity
    const { data: opportunity } = await supabase
      .from('opportunities')
      .select('*')
      .eq('id', opportunityId)
      .eq('organization_id', context.organizationId)
      .single();
    
    if (!opportunity) {
      throw new Error('Opportunity not found');
    }
    
    // Build updates
    const updates: any = {};
    
    if (parameters.stage) {
      updates.stage = interpolateValue(parameters.stage, context);
    }
    if (parameters.value !== undefined) {
      updates.value = Number(interpolateValue(parameters.value, context));
    }
    if (parameters.probability !== undefined) {
      updates.probability = Number(interpolateValue(parameters.probability, context));
    }
    if (parameters.expectedCloseDate) {
      updates.expected_close_date = interpolateValue(parameters.expectedCloseDate, context);
    }
    if (parameters.notes) {
      updates.notes = interpolateValue(parameters.notes, context);
    }
    
    // Update opportunity
    const { data: updated, error } = await supabase
      .from('opportunities')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', opportunityId)
      .select()
      .single();
    
    if (error) throw error;
    
    // Log stage change if applicable
    if (updates.stage && updates.stage !== opportunity.stage) {
      await supabase
        .from('opportunity_stage_history')
        .insert({
          opportunity_id: opportunityId,
          organization_id: context.organizationId,
          from_stage: opportunity.stage,
          to_stage: updates.stage,
          changed_by: 'workflow',
          metadata: {
            workflowId: context.workflowId,
            executionId: context.executionId
          }
        });
    }
    
    return {
      success: true,
      output: {
        opportunityId,
        updates,
        previousStage: opportunity.stage,
        newStage: updates.stage || opportunity.stage
      }
    };
    
  } catch (error) {
    console.error('Update opportunity action failed:', error);
    return {
      success: false,
      error: error.message,
      output: { error: error.message }
    };
  }
}

function interpolateValue(template: string | any, context: ExecutionContext): any {
  if (typeof template !== 'string') return template;
  
  return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const keys = path.trim().split('.');
    let value = context;
    
    for (const key of keys) {
      value = value?.[key];
      if (value === undefined) break;
    }
    
    return value !== undefined ? String(value) : match;
  });
}