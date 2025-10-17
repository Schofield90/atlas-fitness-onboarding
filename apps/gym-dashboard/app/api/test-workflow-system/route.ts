import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/app/lib/supabase/admin';
import { WorkflowExecutionEngine } from '@/app/lib/workflow/execution-engine';

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const organizationId = '63589490-8f55-4157-bd3a-e141594b748e';
    
    // 1. Check if workflows table exists and has data
    const { data: workflows, error: workflowError } = await supabase
      .from('workflows')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .limit(5);

    if (workflowError) {
      return NextResponse.json({
        error: 'Failed to fetch workflows',
        details: workflowError
      }, { status: 500 });
    }

    // 2. Check if workflow_executions table exists
    const { data: executions, error: execError } = await supabase
      .from('workflow_executions')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (execError) {
      // Table might not exist, try to create it
      return NextResponse.json({
        error: 'workflow_executions table missing',
        message: 'Run the workflow-system.sql migration in Supabase',
        migrationPath: '/supabase/workflow-system.sql'
      }, { status: 500 });
    }

    // 3. Check if we have active workflows with lead_created trigger
    const leadWorkflows = workflows?.filter(w => w.trigger_type === 'lead_created') || [];
    const formWorkflows = workflows?.filter(w => w.trigger_type === 'form_submitted') || [];

    // 4. Test workflow execution with mock data
    if (leadWorkflows.length > 0) {
      const testWorkflow = leadWorkflows[0];
      const engine = new WorkflowExecutionEngine();
      
      try {
        await engine.executeWorkflow({
          workflowId: testWorkflow.id,
          organizationId: organizationId,
          triggerData: {
            type: 'lead_created',
            source: 'test'
          },
          context: {
            lead: {
              id: 'test-lead-' + Date.now(),
              name: 'Test Lead',
              email: 'test@example.com',
              phone: '+447700900000',
              source: 'test'
            },
            organizationName: 'Atlas Fitness'
          }
        });
      } catch (execError) {
        console.error('Test execution failed:', execError);
      }
    }

    // 5. Get updated execution stats
    const { data: latestExecutions } = await supabase
      .from('workflow_executions')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(5);

    return NextResponse.json({
      success: true,
      system: {
        workflowsTableExists: !workflowError,
        executionsTableExists: !execError,
        totalWorkflows: workflows?.length || 0,
        activeWorkflows: workflows?.length || 0,
        leadTriggeredWorkflows: leadWorkflows.length,
        formTriggeredWorkflows: formWorkflows.length,
        recentExecutions: latestExecutions?.length || 0
      },
      workflows: workflows?.map(w => ({
        id: w.id,
        name: w.name,
        status: w.status,
        triggerType: w.trigger_type,
        nodes: w.nodes?.length || 0,
        lastRun: w.last_run_at,
        stats: {
          total: w.total_executions || 0,
          successful: w.successful_executions || 0,
          failed: w.failed_executions || 0
        }
      })),
      recentExecutions: latestExecutions?.map(e => ({
        id: e.id,
        workflowId: e.workflow_id,
        status: e.status,
        triggeredBy: e.triggered_by,
        startedAt: e.started_at,
        completedAt: e.completed_at,
        error: e.error_message
      })),
      testResult: leadWorkflows.length > 0 ? {
        message: 'Test workflow execution triggered',
        workflowName: leadWorkflows[0].name
      } : {
        message: 'No active lead workflows to test'
      }
    });

  } catch (error) {
    console.error('Workflow system test error:', error);
    return NextResponse.json({
      error: 'Failed to test workflow system',
      details: error.message
    }, { status: 500 });
  }
}