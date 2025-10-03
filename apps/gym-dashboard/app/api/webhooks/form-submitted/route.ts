import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/app/lib/supabase/admin';
import { WorkflowExecutionEngine } from '@/app/lib/workflow/execution-engine';
import { 
  enqueueWorkflowExecution, 
  JobPriority,
  type EnqueueOptions 
} from '@/app/lib/automation/execution/queue';

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const { formId, formData, lead, organizationId, formType = 'website', metadata } = body;

    if (!formId || !organizationId) {
      return NextResponse.json(
        { error: 'Missing form or organization data' },
        { status: 400 }
      );
    }

    console.log(`📋 Form submitted webhook received:`, {
      formId,
      formType,
      leadId: lead?.id,
      organizationId,
      hasFormData: !!formData
    });

    const supabase = await createAdminClient();

    // Find all active workflows with 'form_submitted' trigger
    const { data: workflows, error } = await supabase
      .from('workflows')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .eq('trigger_type', 'form_submitted');

    if (error) {
      console.error('❌ Error fetching workflows:', error);
      return NextResponse.json(
        { error: 'Failed to fetch workflows' },
        { status: 500 }
      );
    }

    if (!workflows || workflows.length === 0) {
      console.log('ℹ️  No active form_submitted workflows found for organization:', organizationId);
      return NextResponse.json({
        success: true,
        message: 'No workflows to execute',
        executedWorkflows: 0
      });
    }

    console.log(`🔍 Found ${workflows.length} active form_submitted workflows`);

    // Use queue-enabled execution engine for scalability
    const engine = WorkflowExecutionEngine.createQueueEnabled();
    const executions = [];

    for (const workflow of workflows) {
      try {
        // Check if workflow should trigger based on form
        const triggerConfig = workflow.trigger_config || {};
        
        // Form ID filter
        if (triggerConfig.formId && triggerConfig.formId !== 'all') {
          if (triggerConfig.formId !== formId) {
            console.log(`⏭️  Skipping workflow '${workflow.name}' - form mismatch (expected: ${triggerConfig.formId}, got: ${formId})`);
            
            executions.push({
              workflowId: workflow.id,
              workflowName: workflow.name,
              status: 'skipped',
              reason: 'form_mismatch',
              expectedFormId: triggerConfig.formId,
              actualFormId: formId
            });
            continue;
          }
        }

        // Form type filter
        if (triggerConfig.formType && triggerConfig.formType !== 'all') {
          if (triggerConfig.formType !== formType) {
            console.log(`⏭️  Skipping workflow '${workflow.name}' - form type mismatch (expected: ${triggerConfig.formType}, got: ${formType})`);
            
            executions.push({
              workflowId: workflow.id,
              workflowName: workflow.name,
              status: 'skipped',
              reason: 'form_type_mismatch',
              expectedFormType: triggerConfig.formType,
              actualFormType: formType
            });
            continue;
          }
        }

        // Form field conditions
        if (triggerConfig.conditions && triggerConfig.conditions.length > 0) {
          const conditionsMet = evaluateFormConditions(triggerConfig.conditions, formData);
          
          if (!conditionsMet) {
            console.log(`⏭️  Skipping workflow '${workflow.name}' - form conditions not met`);
            
            executions.push({
              workflowId: workflow.id,
              workflowName: workflow.name,
              status: 'skipped',
              reason: 'conditions_not_met',
              conditions: triggerConfig.conditions,
              formData: formData
            });
            continue;
          }
        }

        console.log(`🚀 Enqueueing workflow: '${workflow.name}' for form: ${formId}`);

        // Determine priority based on form data and workflow settings
        const workflowPriority = determineFormWorkflowPriority(formType, formData, workflow, lead);
        
        // Prepare enhanced trigger data
        const triggerData = {
          type: 'form_submitted',
          formId,
          formType,
          timestamp: new Date().toISOString(),
          webhookReceived: true,
          hasLead: !!lead,
          ...triggerConfig
        };

        // Prepare enhanced context
        const context = {
          lead: lead || formData,
          formData,
          formId,
          formType,
          organizationId,
          triggerSource: 'webhook',
          webhookTimestamp: new Date().toISOString()
        };

        // Enqueue workflow execution
        const executionId = await enqueueWorkflowExecution(
          workflow.id,
          triggerData,
          {
            priority: workflowPriority === JobPriority.HIGH ? 1 : workflowPriority === JobPriority.NORMAL ? 2 : 3,
            delay: triggerConfig.delay || 0
          }
        );

        executions.push({
          workflowId: workflow.id,
          workflowName: workflow.name,
          executionId: executionId,
          status: 'queued',
          priority: workflowPriority,
          queuedAt: new Date().toISOString()
        });

      } catch (execError) {
        console.error(`❌ Error enqueueing workflow '${workflow.name}':`, execError);
        executions.push({
          workflowId: workflow.id,
          workflowName: workflow.name,
          status: 'failed',
          error: execError.message,
          failedAt: new Date().toISOString()
        });
      }
    }

    const processingTime = Date.now() - startTime;
    const successfulExecutions = executions.filter(e => e.status === 'queued').length;
    const failedExecutions = executions.filter(e => e.status === 'failed').length;
    const skippedExecutions = executions.filter(e => e.status === 'skipped').length;

    console.log(`✅ Form submitted webhook processed in ${processingTime}ms:`, {
      total: executions.length,
      queued: successfulExecutions,
      failed: failedExecutions,
      skipped: skippedExecutions,
      formId,
      organizationId
    });

    // Log webhook execution for analytics
    try {
      await supabase
        .from('webhook_executions')
        .insert({
          webhook_type: 'form_submitted',
          organization_id: organizationId,
          payload: { formId, formData, lead, organizationId, formType },
          executions_triggered: successfulExecutions,
          executions_failed: failedExecutions,
          executions_skipped: skippedExecutions,
          processing_time_ms: processingTime,
          created_at: new Date().toISOString()
        });
    } catch (logError) {
      console.error('Failed to log webhook execution:', logError);
    }

    return NextResponse.json({
      success: true,
      message: `Processed form submitted webhook: ${successfulExecutions} workflows queued, ${failedExecutions} failed, ${skippedExecutions} skipped`,
      summary: {
        totalWorkflows: executions.length,
        queued: successfulExecutions,
        failed: failedExecutions,
        skipped: skippedExecutions,
        processingTimeMs: processingTime
      },
      executions,
      formId,
      correlationIds: executions
        .filter(e => e.status === 'queued')
        .map(e => e.executionId)
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`❌ Form submitted webhook error after ${processingTime}ms:`, error);
    
    return NextResponse.json(
      { 
        error: 'Failed to process form submitted webhook',
        details: error.message,
        processingTimeMs: processingTime
      },
      { status: 500 }
    );
  }
}

// Helper function to evaluate form conditions
function evaluateFormConditions(conditions: any[], formData: any): boolean {
  if (!conditions || conditions.length === 0) {
    return true;
  }

  return conditions.every(condition => {
    const { field, operator, value } = condition;
    const fieldValue = formData[field];

    switch (operator) {
      case 'equals':
        return fieldValue === value;
      case 'not_equals':
        return fieldValue !== value;
      case 'contains':
        return fieldValue && fieldValue.toString().toLowerCase().includes(value.toLowerCase());
      case 'not_contains':
        return !fieldValue || !fieldValue.toString().toLowerCase().includes(value.toLowerCase());
      case 'is_empty':
        return !fieldValue || fieldValue === '' || fieldValue === null || fieldValue === undefined;
      case 'is_not_empty':
        return fieldValue && fieldValue !== '' && fieldValue !== null && fieldValue !== undefined;
      case 'greater_than':
        return parseFloat(fieldValue) > parseFloat(value);
      case 'less_than':
        return parseFloat(fieldValue) < parseFloat(value);
      case 'in':
        return Array.isArray(value) && value.includes(fieldValue);
      case 'not_in':
        return !Array.isArray(value) || !value.includes(fieldValue);
      default:
        console.warn(`Unknown condition operator: ${operator}`);
        return true;
    }
  });
}

// Helper function to determine workflow priority for form submissions
function determineFormWorkflowPriority(formType: string, formData: any, workflow: any, lead: any): JobPriority {
  // High-priority form types
  const highPriorityForms = ['contact', 'consultation', 'trial_booking', 'emergency'];
  const mediumPriorityForms = ['newsletter', 'download', 'survey'];
  
  // Check form-specific indicators of urgency
  const hasUrgentKeywords = formData && Object.values(formData).some((value: any) => {
    if (typeof value === 'string') {
      const urgentKeywords = ['urgent', 'asap', 'immediately', 'emergency', 'today', 'now'];
      return urgentKeywords.some(keyword => value.toLowerCase().includes(keyword));
    }
    return false;
  });

  // Check if it's a high-value form submission
  const isHighValueForm = formData?.budget && parseFloat(formData.budget.replace(/[^\d.]/g, '')) > 1000;
  
  // Check lead score if available
  const leadScore = lead?.score || 0;
  
  // Workflow-specific priority settings
  const workflowPriority = workflow.settings?.priority || 'normal';
  
  if (workflowPriority === 'critical' || hasUrgentKeywords || formType === 'emergency') {
    return JobPriority.HIGH;
  }
  
  if (workflowPriority === 'high' || leadScore >= 70 || highPriorityForms.includes(formType) || isHighValueForm) {
    return JobPriority.HIGH;
  }
  
  if (workflowPriority === 'low' || leadScore < 30) {
    return JobPriority.LOW;
  }
  
  return JobPriority.NORMAL;
}