import { NextRequest, NextResponse } from 'next/server';
import { checkAuthAndOrganization } from '@/app/lib/api/auth-check-org';
import { createAdminClient } from '@/app/lib/supabase/admin';
import { queueManager } from '@/app/lib/queue/queue-manager';
import { QUEUE_NAMES, JOB_TYPES } from '@/app/lib/queue/config';

export async function POST(
  request: NextRequest,
  { params }: { params: { workflowId: string } }
) {
  const authResult = await checkAuthAndOrganization(request);
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: 401 });
  }

  const { user, organizationId } = authResult;
  const workflowId = params.workflowId;

  try {
    const body = await request.json();
    const { triggerData = {}, context = {}, test = false } = body;

    const supabase = createAdminClient();

    // Verify workflow exists and is active
    const { data: workflow, error: workflowError } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', workflowId)
      .eq('organization_id', organizationId)
      .single();

    if (workflowError || !workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    if (!workflow.is_active && !test) {
      return NextResponse.json(
        { error: 'Workflow is not active' },
        { status: 400 }
      );
    }

    // Check rate limits
    const { data: rateLimitCheck } = await supabase.rpc('check_workflow_rate_limit', {
      p_workflow_id: workflowId,
      p_organization_id: organizationId
    });

    if (rateLimitCheck && !rateLimitCheck.allowed) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded',
          retryAfter: rateLimitCheck.retry_after 
        },
        { status: 429 }
      );
    }

    // Create execution record
    const { data: execution, error: execError } = await supabase
      .from('workflow_executions')
      .insert({
        workflow_id: workflowId,
        organization_id: organizationId,
        status: 'pending',
        triggered_by: test ? 'manual_test' : 'api',
        trigger_data: triggerData,
        input_data: context,
        is_test: test,
        created_by: user.id
      })
      .select()
      .single();

    if (execError || !execution) {
      throw new Error('Failed to create execution record');
    }

    // Queue workflow execution
    const job = await queueManager.addJob(
      QUEUE_NAMES.WORKFLOW_EXECUTION,
      JOB_TYPES.EXECUTE_WORKFLOW,
      {
        workflowId,
        organizationId,
        executionId: execution.id,
        triggerData,
        context: {
          ...context,
          userId: user.id,
          userEmail: user.email,
          isTest: test
        }
      },
      {
        priority: test ? 1 : 5,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        }
      }
    );

    // Log activity
    await supabase
      .from('activity_logs')
      .insert({
        organization_id: organizationId,
        entity_type: 'workflow',
        entity_id: workflowId,
        action: 'workflow_executed',
        details: {
          executionId: execution.id,
          jobId: job.id,
          triggerType: 'manual',
          isTest: test
        },
        user_id: user.id
      });

    // For test executions, wait a bit for initial progress
    if (test) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Get updated execution status
      const { data: updatedExecution } = await supabase
        .from('workflow_executions')
        .select(`
          *,
          workflow_execution_logs(
            node_id,
            status,
            output,
            error_message,
            timestamp
          )
        `)
        .eq('id', execution.id)
        .single();

      return NextResponse.json({
        execution: updatedExecution || execution,
        jobId: job.id,
        message: 'Test workflow execution started'
      });
    }

    return NextResponse.json({
      execution,
      jobId: job.id,
      message: 'Workflow execution queued successfully'
    }, { status: 202 });

  } catch (error) {
    console.error('Error executing workflow:', error);
    return NextResponse.json(
      { error: 'Failed to execute workflow' },
      { status: 500 }
    );
  }
}

// Get execution status
export async function GET(
  request: NextRequest,
  { params }: { params: { workflowId: string } }
) {
  const authResult = await checkAuthAndOrganization(request);
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: 401 });
  }

  const { organizationId } = authResult;
  const workflowId = params.workflowId;
  const searchParams = request.nextUrl.searchParams;
  const executionId = searchParams.get('executionId');
  const limit = parseInt(searchParams.get('limit') || '10');

  try {
    const supabase = createAdminClient();

    if (executionId) {
      // Get specific execution
      const { data: execution, error } = await supabase
        .from('workflow_executions')
        .select(`
          *,
          workflow_execution_logs(
            node_id,
            status,
            output,
            error_message,
            timestamp
          )
        `)
        .eq('id', executionId)
        .eq('workflow_id', workflowId)
        .eq('organization_id', organizationId)
        .single();

      if (error || !execution) {
        return NextResponse.json(
          { error: 'Execution not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ execution });

    } else {
      // Get recent executions
      const { data: executions, error } = await supabase
        .from('workflow_executions')
        .select(`
          *,
          workflow_execution_logs(count)
        `)
        .eq('workflow_id', workflowId)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return NextResponse.json({ executions });
    }

  } catch (error) {
    console.error('Error fetching executions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch executions' },
      { status: 500 }
    );
  }
}