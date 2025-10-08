/**
 * Cron-based Task Scheduler for AI Agents
 * Monitors database for scheduled tasks and queues them when due
 */

import { parseExpression } from 'cron-parser';
import cronstrue from 'cronstrue';
import { agentTaskQueue } from './task-queue';
import { createAdminClient } from '@/lib/supabase/admin';

// Scheduler configuration
const POLL_INTERVAL_MS = 60 * 1000; // Poll every 60 seconds
const MAX_TASKS_PER_CHECK = 100; // Limit tasks processed per check
const RETRY_QUEUE_ATTEMPTS = 3; // Retry failed queue additions

// Metrics tracking
interface SchedulerMetrics {
  checksPerformed: number;
  tasksQueued: number;
  tasksFailed: number;
  lastCheckTime: Date | null;
  nextCheckTime: Date | null;
  isRunning: boolean;
}

/**
 * AgentScheduler class
 * Handles cron-based task scheduling and execution
 */
export class AgentScheduler {
  private supabase = createAdminClient();
  private pollingInterval: NodeJS.Timeout | null = null;
  private isRunning = false;
  private isChecking = false;
  private metrics: SchedulerMetrics = {
    checksPerformed: 0,
    tasksQueued: 0,
    tasksFailed: 0,
    lastCheckTime: null,
    nextCheckTime: null,
    isRunning: false
  };

  /**
   * Start the scheduler
   * Begins polling for due tasks
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('[AgentScheduler] Scheduler already running');
      return;
    }

    console.log('[AgentScheduler] Starting scheduler...');
    this.isRunning = true;
    this.metrics.isRunning = true;

    // Perform initial check immediately
    await this.checkScheduledTasks();

    // Start polling interval
    this.pollingInterval = setInterval(async () => {
      if (!this.isChecking) {
        await this.checkScheduledTasks();
      }
    }, POLL_INTERVAL_MS);

    // Update next check time
    this.metrics.nextCheckTime = new Date(Date.now() + POLL_INTERVAL_MS);

    console.log(`[AgentScheduler] Scheduler started (polling every ${POLL_INTERVAL_MS / 1000}s)`);
  }

  /**
   * Stop the scheduler
   * Gracefully shuts down and completes current check
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      console.warn('[AgentScheduler] Scheduler not running');
      return;
    }

    console.log('[AgentScheduler] Stopping scheduler...');
    this.isRunning = false;
    this.metrics.isRunning = false;

    // Clear polling interval
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }

    // Wait for current check to complete
    while (this.isChecking) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('[AgentScheduler] Scheduler stopped');
  }

  /**
   * Check for scheduled tasks that are due and queue them
   */
  async checkScheduledTasks(): Promise<void> {
    if (this.isChecking) {
      console.log('[AgentScheduler] Check already in progress, skipping...');
      return;
    }

    this.isChecking = true;
    this.metrics.checksPerformed++;
    this.metrics.lastCheckTime = new Date();

    const checkStartTime = Date.now();
    let tasksQueuedThisCheck = 0;
    let tasksFailedThisCheck = 0;

    try {
      console.log('[AgentScheduler] Checking for due scheduled tasks...');

      // Query database for due tasks
      const { data: tasks, error } = await this.supabase
        .from('ai_agent_tasks')
        .select('*')
        .eq('task_type', 'scheduled')
        .eq('status', 'pending')
        .not('next_run_at', 'is', null)
        .lte('next_run_at', new Date().toISOString())
        .limit(MAX_TASKS_PER_CHECK);

      if (error) {
        console.error('[AgentScheduler] Error querying scheduled tasks:', error);
        return;
      }

      if (!tasks || tasks.length === 0) {
        console.log('[AgentScheduler] No scheduled tasks due');
        return;
      }

      console.log(`[AgentScheduler] Found ${tasks.length} tasks to queue`);

      // Process each task
      for (const task of tasks) {
        try {
          // Validate cron expression if present
          if (task.schedule_cron) {
            try {
              this.validateCronExpression(task.schedule_cron);
            } catch (cronError) {
              console.error(
                `[AgentScheduler] Invalid cron expression for task ${task.id}: ${task.schedule_cron}`,
                cronError
              );
              tasksFailedThisCheck++;
              this.metrics.tasksFailed++;

              // Mark task as failed
              await this.supabase
                .from('ai_agent_tasks')
                .update({
                  status: 'failed',
                  error_message: `Invalid cron expression: ${task.schedule_cron}`,
                  updated_at: new Date().toISOString()
                })
                .eq('id', task.id);

              continue; // Skip this task
            }
          }

          // Queue the task
          const queued = await this.queueTask(task.id);

          if (queued) {
            tasksQueuedThisCheck++;
            this.metrics.tasksQueued++;

            // Calculate next run time if cron expression exists
            if (task.schedule_cron) {
              const nextRun = this.calculateNextRun(
                task.schedule_cron,
                task.schedule_timezone || 'UTC'
              );

              console.log(
                `[AgentScheduler] Task ${task.id} queued. Next run: ${nextRun.toISOString()}`
              );
            } else {
              console.log(`[AgentScheduler] Task ${task.id} queued (one-time execution)`);
            }
          } else {
            tasksFailedThisCheck++;
            this.metrics.tasksFailed++;
          }
        } catch (taskError) {
          console.error(`[AgentScheduler] Error processing task ${task.id}:`, taskError);
          tasksFailedThisCheck++;
          this.metrics.tasksFailed++;
        }
      }

      const checkDuration = Date.now() - checkStartTime;
      console.log(
        `[AgentScheduler] Check complete: ${tasksQueuedThisCheck} queued, ${tasksFailedThisCheck} failed (${checkDuration}ms)`
      );

      // Alert on repeated failures
      if (tasksFailedThisCheck > 0 && this.metrics.tasksFailed > 10) {
        console.error(
          `[AgentScheduler] WARNING: High failure rate detected (${this.metrics.tasksFailed} total failures)`
        );
      }
    } catch (error) {
      console.error('[AgentScheduler] Error in checkScheduledTasks:', error);
    } finally {
      this.isChecking = false;

      // Update next check time
      if (this.isRunning) {
        this.metrics.nextCheckTime = new Date(Date.now() + POLL_INTERVAL_MS);
      }
    }
  }

  /**
   * Queue a task for execution
   * Returns true if successfully queued, false otherwise
   */
  async queueTask(taskId: string): Promise<boolean> {
    let attempts = 0;

    while (attempts < RETRY_QUEUE_ATTEMPTS) {
      try {
        // Fetch task details
        const { data: task, error: fetchError } = await this.supabase
          .from('ai_agent_tasks')
          .select('*')
          .eq('id', taskId)
          .single();

        if (fetchError || !task) {
          console.error(`[AgentScheduler] Task not found: ${taskId}`, fetchError);
          return false;
        }

        // Add to queue
        await agentTaskQueue.addTask(taskId, task.priority || 5);

        // Calculate next run time if cron expression exists
        if (task.schedule_cron) {
          const nextRun = this.calculateNextRun(
            task.schedule_cron,
            task.schedule_timezone || 'UTC'
          );

          // Update task status and next run time
          const { error: updateError } = await this.supabase
            .from('ai_agent_tasks')
            .update({
              status: 'queued',
              last_run_at: new Date().toISOString(),
              next_run_at: nextRun.toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', taskId);

          if (updateError) {
            console.error(
              `[AgentScheduler] Error updating task ${taskId} next_run_at:`,
              updateError
            );
            // Don't fail the whole operation for this
          }
        } else {
          // One-time task - just update status
          const { error: updateError } = await this.supabase
            .from('ai_agent_tasks')
            .update({
              status: 'queued',
              last_run_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', taskId);

          if (updateError) {
            console.error(`[AgentScheduler] Error updating task ${taskId} status:`, updateError);
          }
        }

        console.log(`[AgentScheduler] Successfully queued task ${taskId}`);
        return true;
      } catch (error) {
        attempts++;
        console.error(
          `[AgentScheduler] Error queuing task ${taskId} (attempt ${attempts}/${RETRY_QUEUE_ATTEMPTS}):`,
          error
        );

        if (attempts < RETRY_QUEUE_ATTEMPTS) {
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 1000));
        }
      }
    }

    console.error(
      `[AgentScheduler] Failed to queue task ${taskId} after ${RETRY_QUEUE_ATTEMPTS} attempts`
    );
    return false;
  }

  /**
   * Calculate next run time from cron expression
   * Supports timezone-aware scheduling
   */
  calculateNextRun(cronExpression: string, timezone: string = 'UTC'): Date {
    try {
      // Validate timezone
      if (!this.isValidTimezone(timezone)) {
        console.warn(
          `[AgentScheduler] Invalid timezone: ${timezone}, falling back to UTC`
        );
        timezone = 'UTC';
      }

      // Parse cron expression with timezone
      const interval = parseExpression(cronExpression, {
        currentDate: new Date(),
        tz: timezone
      });

      // Get next execution time
      const nextRun = interval.next().toDate();

      return nextRun;
    } catch (error) {
      console.error(
        `[AgentScheduler] Error calculating next run for cron "${cronExpression}":`,
        error
      );
      // Fallback to 1 hour from now
      return new Date(Date.now() + 60 * 60 * 1000);
    }
  }

  /**
   * Validate cron expression
   * Throws error if invalid
   */
  validateCronExpression(cronExpression: string): void {
    try {
      parseExpression(cronExpression);
    } catch (error) {
      throw new Error(`Invalid cron expression: ${cronExpression}`);
    }
  }

  /**
   * Get human-readable description of cron expression
   */
  describeCronExpression(cronExpression: string): string {
    try {
      return cronstrue.toString(cronExpression);
    } catch (error) {
      return 'Invalid cron expression';
    }
  }

  /**
   * Validate timezone string
   */
  private isValidTimezone(timezone: string): boolean {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: timezone });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get scheduler metrics
   */
  getMetrics(): SchedulerMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics (useful for testing)
   */
  resetMetrics(): void {
    this.metrics = {
      checksPerformed: 0,
      tasksQueued: 0,
      tasksFailed: 0,
      lastCheckTime: null,
      nextCheckTime: null,
      isRunning: this.isRunning
    };
  }

  /**
   * Get scheduler status
   */
  getStatus(): {
    isRunning: boolean;
    isChecking: boolean;
    metrics: SchedulerMetrics;
  } {
    return {
      isRunning: this.isRunning,
      isChecking: this.isChecking,
      metrics: this.getMetrics()
    };
  }
}

// Export singleton instance
export const agentScheduler = new AgentScheduler();

// Auto-start scheduler if enabled via environment variable
if (process.env.AUTO_START_SCHEDULER === 'true') {
  agentScheduler
    .start()
    .then(() => {
      console.log('[AgentScheduler] Auto-started via environment variable');
    })
    .catch(error => {
      console.error('[AgentScheduler] Failed to auto-start:', error);
    });
}
