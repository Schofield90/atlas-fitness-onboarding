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
    const { lead, organizationId, priority, metadata } = body;

    if (!lead || !organizationId) {
      return NextResponse.json(
        { error: 'Missing lead or organization data' },
        { status: 400 }
      );
    }

    console.log(`📥 Lead created webhook received:`, {
      leadId: lead.id,
      leadName: lead.name,
      leadSource: lead.source,
      organizationId
    });

    const supabase = await createAdminClient();

    // Find all active workflows with 'lead_created' trigger
    const { data: workflows, error } = await supabase
      .from('workflows')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .eq('trigger_type', 'lead_created');

    if (error) {
      console.error('❌ Error fetching workflows:', error);
      return NextResponse.json(
        { error: 'Failed to fetch workflows' },
        { status: 500 }
      );
    }

    if (!workflows || workflows.length === 0) {
      console.log('ℹ️  No active lead_created workflows found for organization:', organizationId);
      return NextResponse.json({
        success: true,
        message: 'No workflows to execute',
        executedWorkflows: 0
      });
    }

    console.log(`🔍 Found ${workflows.length} active lead_created workflows`);

    // Use queue-enabled execution engine for scalability
    const engine = WorkflowExecutionEngine.createQueueEnabled();
    const executions = [];

    for (const workflow of workflows) {
      try {
        // Check if workflow should trigger based on lead source
        const triggerConfig = workflow.trigger_config || {};
        const leadSource = lead.source || 'unknown';
        
        // If workflow has source filter, check if it matches
        if (triggerConfig.source && triggerConfig.source !== 'all') {
          if (triggerConfig.source !== leadSource) {
            console.log(`⏭️  Skipping workflow '${workflow.name}' - source mismatch (expected: ${triggerConfig.source}, got: ${leadSource})`);
            
            executions.push({
              workflowId: workflow.id,
              workflowName: workflow.name,
              status: 'skipped',
              reason: 'source_mismatch',
              expectedSource: triggerConfig.source,
              actualSource: leadSource
            });
            continue;
          }
        }

        // Additional trigger filters
        if (triggerConfig.tags && triggerConfig.tags.length > 0) {
          const leadTags = lead.tags || [];
          const hasRequiredTag = triggerConfig.tags.some((tag: string) => leadTags.includes(tag));
          
          if (!hasRequiredTag) {
            console.log(`⏭️  Skipping workflow '${workflow.name}' - required tags not found`);
            
            executions.push({
              workflowId: workflow.id,
              workflowName: workflow.name,
              status: 'skipped',
              reason: 'tags_mismatch',
              requiredTags: triggerConfig.tags,
              leadTags: leadTags
            });
            continue;
          }
        }

        console.log(`🚀 Enqueueing workflow: '${workflow.name}' for lead: ${lead.name || lead.id}`);

        // Determine priority based on lead characteristics and workflow settings
        const workflowPriority = determineWorkflowPriority(leadSource, workflow, lead);
        
        // Prepare enhanced trigger data
        const triggerData = {
          type: 'lead_created',
          source: leadSource,
          leadId: lead.id,
          timestamp: new Date().toISOString(),
          webhookReceived: true,
          ...triggerConfig
        };

        // Prepare enhanced context
        const context = {
          lead,
          organizationId,
          triggerSource: 'webhook',
          webhookTimestamp: new Date().toISOString()
        };

        // Enqueue workflow execution with enhanced options
        const enqueueOptions: EnqueueOptions = {
          priority: workflowPriority,
          delay: triggerConfig.delay || 0,
          metadata: {
            source: 'lead_created_webhook',
            leadId: lead.id,
            leadSource: leadSource,
            workflowName: workflow.name,
            organizationId: organizationId,
            correlationId: `lead_${lead.id}_${Date.now()}`,
            ...metadata
          }
        };

        const executionId = await enqueueWorkflowExecution(
          workflow.id,
          triggerData,
          enqueueOptions
        );

        executions.push({
          workflowId: workflow.id,
          workflowName: workflow.name,
          executionId: typeof executionId === 'string' ? executionId : executionId?.executionId,
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

    console.log(`✅ Lead created webhook processed in ${processingTime}ms:`, {
      total: executions.length,
      queued: successfulExecutions,
      failed: failedExecutions,
      skipped: skippedExecutions,
      leadId: lead.id,
      organizationId
    });

    // Log webhook execution for analytics
    try {
      await supabase
        .from('webhook_executions')
        .insert({
          webhook_type: 'lead_created',
          organization_id: organizationId,
          payload: { lead, organizationId },
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
      message: `Processed lead created webhook: ${successfulExecutions} workflows queued, ${failedExecutions} failed, ${skippedExecutions} skipped`,
      summary: {
        totalWorkflows: executions.length,
        queued: successfulExecutions,
        failed: failedExecutions,
        skipped: skippedExecutions,
        processingTimeMs: processingTime
      },
      executions,
      leadId: lead.id,
      correlationIds: executions
        .filter(e => e.status === 'queued')
        .map(e => e.executionId)
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`❌ Lead created webhook error after ${processingTime}ms:`, error);
    
    return NextResponse.json(
      { 
        error: 'Failed to process lead created webhook',
        details: error.message,
        processingTimeMs: processingTime
      },
      { status: 500 }
    );
  }
}

// Helper function to determine workflow priority based on lead characteristics
function determineWorkflowPriority(leadSource: string, workflow: any, lead: any): JobPriority {
  // High-value lead sources get higher priority
  const highPrioritySources = ['referral', 'direct', 'organic_search'];
  const mediumPrioritySources = ['website', 'google', 'email'];
  
  // Check lead score if available
  const leadScore = lead.score || 0;
  
  // Check if it's a hot lead based on recency
  const createdAt = new Date(lead.created_at || Date.now());
  const ageInMinutes = (Date.now() - createdAt.getTime()) / (1000 * 60);
  const isRecentLead = ageInMinutes < 30; // Less than 30 minutes old
  
  // Workflow-specific priority settings
  const workflowPriority = workflow.settings?.priority || 'normal';
  
  if (workflowPriority === 'critical' || leadScore >= 90 || isRecentLead) {
    return JobPriority.CRITICAL;
  }
  
  if (workflowPriority === 'high' || leadScore >= 70 || highPrioritySources.includes(leadSource)) {
    return JobPriority.HIGH;
  }
  
  if (workflowPriority === 'low' || leadScore < 30) {
    return JobPriority.LOW;
  }
  
  return JobPriority.NORMAL;
}