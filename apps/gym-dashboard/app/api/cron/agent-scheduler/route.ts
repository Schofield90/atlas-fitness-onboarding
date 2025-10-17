import { NextResponse } from 'next/server';
import { createAdminClient } from '@/app/lib/supabase/admin';
import { agentOrchestrator } from '@/lib/ai-agents/orchestrator';

export const maxDuration = 300; // 5 minutes max
export const dynamic = 'force-dynamic';

/**
 * Vercel Cron Job: Agent Task Scheduler
 *
 * Polls for tasks that are due to run and executes them.
 * Runs every 5 minutes via Vercel cron.
 *
 * Query pattern:
 * - status = 'pending'
 * - next_run_at <= NOW()
 * - Processes max 50 tasks per run to avoid timeout
 *
 * Security:
 * - Uses admin client (bypasses RLS) but only reads/updates own tasks
 * - No user input, cron-triggered only
 * - Rate limiting handled by orchestrator
 */
export async function GET() {
  const supabase = createAdminClient();
  const startTime = Date.now();

  try {
    console.log('[Agent Scheduler] Starting scheduled task check...');

    // Find tasks that are due to run
    const { data: dueTasks, error } = await supabase
      .from('ai_agent_tasks')
      .select('id, agent_id, organization_id, title, task_type, schedule_cron, retry_count, max_retries')
      .eq('status', 'pending')
      .lte('next_run_at', new Date().toISOString())
      .order('priority', { ascending: false }) // High priority first
      .order('next_run_at', { ascending: true }) // Oldest first
      .limit(50); // Process max 50 per run to avoid timeout

    if (error) {
      console.error('[Agent Scheduler] Error fetching due tasks:', error);
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 });
    }

    if (!dueTasks || dueTasks.length === 0) {
      console.log('[Agent Scheduler] No tasks due for execution');
      return NextResponse.json({
        success: true,
        message: 'No tasks due',
        executedCount: 0,
        executionTimeMs: Date.now() - startTime
      });
    }

    console.log(`[Agent Scheduler] Found ${dueTasks.length} tasks due for execution`);

    const results = [];
    let successCount = 0;
    let failureCount = 0;

    // Execute each task
    for (const task of dueTasks) {
      try {
        console.log(`[Agent Scheduler] Executing task ${task.id} (${task.title})`);

        const result = await agentOrchestrator.executeTask(task.id);

        if (result.success) {
          successCount++;
          console.log(`[Agent Scheduler] ✅ Task ${task.id} completed successfully`);
        } else {
          failureCount++;
          console.error(`[Agent Scheduler] ❌ Task ${task.id} failed:`, result.error);
        }

        results.push({
          taskId: task.id,
          title: task.title,
          success: result.success,
          error: result.error,
          executionTimeMs: result.executionTimeMs
        });

      } catch (error: any) {
        failureCount++;
        console.error(`[Agent Scheduler] ❌ Task ${task.id} threw error:`, error);

        results.push({
          taskId: task.id,
          title: task.title,
          success: false,
          error: error.message || 'Unknown error'
        });

        // Update task to failed state
        try {
          await supabase
            .from('ai_agent_tasks')
            .update({
              status: 'failed',
              error_message: error.message || 'Scheduler exception',
              updated_at: new Date().toISOString()
            })
            .eq('id', task.id);
        } catch (updateError) {
          console.error(`[Agent Scheduler] Failed to update task ${task.id} status:`, updateError);
        }
      }

      // Add small delay between tasks to avoid rate limiting
      if (dueTasks.indexOf(task) < dueTasks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    const totalExecutionTime = Date.now() - startTime;

    console.log(`[Agent Scheduler] Batch complete: ${successCount} succeeded, ${failureCount} failed in ${totalExecutionTime}ms`);

    return NextResponse.json({
      success: true,
      executedCount: dueTasks.length,
      successCount,
      failureCount,
      executionTimeMs: totalExecutionTime,
      results: results.map(r => ({
        taskId: r.taskId,
        title: r.title,
        success: r.success,
        error: r.error
      }))
    });

  } catch (error: any) {
    console.error('[Agent Scheduler] Fatal error:', error);

    return NextResponse.json({
      success: false,
      error: error.message || 'Internal scheduler error',
      executionTimeMs: Date.now() - startTime
    }, { status: 500 });
  }
}
