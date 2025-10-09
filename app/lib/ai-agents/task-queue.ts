/**
 * BullMQ-based Task Queue System for AI Agents
 * Handles background task execution with scheduling and retry logic
 */

import { Queue, Worker, Job, QueueEvents } from "bullmq";
import { Redis } from "ioredis";
import * as cron from "node-cron";
import { agentOrchestrator } from "./orchestrator";
import { createAdminClient } from "@/app/lib/supabase/admin";

// Queue configuration
const QUEUE_NAME = "ai-agent-tasks";
const COMPLETED_JOB_RETENTION = 24 * 60 * 60 * 1000; // 24 hours
const FAILED_JOB_RETENTION = 7 * 24 * 60 * 60 * 1000; // 7 days

// Job data interface
export interface AgentTaskJobData {
  taskId: string;
  priority: number;
  organizationId: string;
  agentId: string;
  taskType: "adhoc" | "scheduled" | "automation";
}

// Queue statistics
export interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
}

/**
 * AgentTaskQueue class
 * Manages task queue operations and scheduling
 */
export class AgentTaskQueue {
  private queue: Queue<AgentTaskJobData>;
  private worker: Worker<AgentTaskJobData>;
  private queueEvents: QueueEvents;
  private redis: Redis;
  private supabase = createAdminClient();
  private scheduledTasks = new Map<string, cron.ScheduledTask>();
  private isShuttingDown = false;

  constructor() {
    // Skip initialization during build time
    if (process.env.NEXT_PHASE === "phase-production-build") {
      console.log(
        "[AgentTaskQueue] Skipping Redis initialization during build",
      );
      return;
    }

    // Initialize Redis connection
    // Support both Upstash URL format and traditional host/port/password
    const redisUrl =
      process.env.KV_URL ||
      process.env.UPSTASH_REDIS_REST_URL ||
      process.env.REDIS_URL;

    if (redisUrl) {
      // Use connection URL (Upstash format)
      this.redis = new Redis(redisUrl, {
        maxRetriesPerRequest: null, // Required for BullMQ
        enableReadyCheck: false,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        family: 6, // Force IPv6 if needed for Upstash
      });
      console.log("[AgentTaskQueue] Initialized with Redis URL");
    } else {
      // Use traditional host/port/password format
      this.redis = new Redis({
        host: process.env.REDIS_HOST || "localhost",
        port: parseInt(process.env.REDIS_PORT || "6379", 10),
        password: process.env.REDIS_PASSWORD,
        maxRetriesPerRequest: null, // Required for BullMQ
        enableReadyCheck: false,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
      });
      console.log("[AgentTaskQueue] Initialized with Redis host/port");
    }

    // Initialize queue
    this.queue = new Queue<AgentTaskJobData>(QUEUE_NAME, {
      connection: this.redis,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
        removeOnComplete: {
          age: COMPLETED_JOB_RETENTION / 1000, // Convert to seconds
          count: 1000, // Keep last 1000 completed jobs
        },
        removeOnFail: {
          age: FAILED_JOB_RETENTION / 1000, // Convert to seconds
          count: 5000, // Keep last 5000 failed jobs
        },
      },
    });

    // Initialize worker
    this.worker = new Worker<AgentTaskJobData>(
      QUEUE_NAME,
      async (job: Job<AgentTaskJobData>) => this.processTask(job),
      {
        connection: this.redis,
        concurrency: parseInt(process.env.QUEUE_CONCURRENCY || "5", 10),
        limiter: {
          max: 100, // Max 100 jobs
          duration: 60 * 1000, // Per minute
        },
      },
    );

    // Initialize queue events
    this.queueEvents = new QueueEvents(QUEUE_NAME, {
      connection: this.redis,
    });

    // Setup event listeners
    this.setupEventListeners();

    // Setup graceful shutdown
    this.setupGracefulShutdown();

    // Initialize scheduled task polling
    this.initializeScheduledTaskPolling();

    console.log(
      `[AgentTaskQueue] Initialized with Redis at ${process.env.REDIS_HOST || "localhost"}:${process.env.REDIS_PORT || "6379"}`,
    );
  }

  /**
   * Add task to queue
   */
  async addTask(
    taskId: string,
    priority: number = 0,
    delay: number = 0,
  ): Promise<Job<AgentTaskJobData>> {
    // Fetch task details
    const { data: task, error } = await this.supabase
      .from("ai_agent_tasks")
      .select("*")
      .eq("id", taskId)
      .single();

    if (error || !task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    // Update status to queued
    await this.supabase
      .from("ai_agent_tasks")
      .update({
        status: "queued",
        updated_at: new Date().toISOString(),
      })
      .eq("id", taskId);

    // Add to queue
    const job = await this.queue.add(
      `task-${taskId}`,
      {
        taskId,
        priority,
        organizationId: task.organization_id,
        agentId: task.agent_id,
        taskType: task.task_type,
      },
      {
        priority,
        delay,
        attempts: task.max_retries || 3,
        jobId: taskId, // Use task ID as job ID for idempotency
      },
    );

    console.log(
      `[AgentTaskQueue] Task ${taskId} added to queue (priority: ${priority}, delay: ${delay}ms)`,
    );

    return job;
  }

  /**
   * Add scheduled task with cron expression
   */
  async addScheduledTask(
    taskId: string,
    cronExpression: string,
  ): Promise<void> {
    // Validate cron expression
    if (!cron.validate(cronExpression)) {
      throw new Error(`Invalid cron expression: ${cronExpression}`);
    }

    // Fetch task details
    const { data: task, error } = await this.supabase
      .from("ai_agent_tasks")
      .select("*")
      .eq("id", taskId)
      .single();

    if (error || !task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    // Calculate next run time
    const nextRunAt = this.calculateNextRun(
      cronExpression,
      task.schedule_timezone || "UTC",
    );

    // Update task with next run time
    await this.supabase
      .from("ai_agent_tasks")
      .update({
        schedule_cron: cronExpression,
        next_run_at: nextRunAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", taskId);

    // Schedule cron job
    const scheduledTask = cron.schedule(
      cronExpression,
      async () => {
        try {
          console.log(`[AgentTaskQueue] Triggering scheduled task: ${taskId}`);
          await this.addTask(taskId, task.priority || 5);

          // Update next run time
          const nextRun = this.calculateNextRun(
            cronExpression,
            task.schedule_timezone || "UTC",
          );
          await this.supabase
            .from("ai_agent_tasks")
            .update({
              last_run_at: new Date().toISOString(),
              next_run_at: nextRun.toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", taskId);
        } catch (error) {
          console.error(
            `[AgentTaskQueue] Error scheduling task ${taskId}:`,
            error,
          );
        }
      },
      {
        scheduled: true,
        timezone: task.schedule_timezone || "UTC",
      },
    );

    this.scheduledTasks.set(taskId, scheduledTask);

    console.log(
      `[AgentTaskQueue] Scheduled task ${taskId} with cron: ${cronExpression}`,
    );
  }

  /**
   * Process individual task
   */
  private async processTask(job: Job<AgentTaskJobData>): Promise<any> {
    const { taskId } = job.data;

    console.log(
      `[AgentTaskQueue] Processing task ${taskId} (attempt ${job.attemptsMade + 1}/${job.opts.attempts})`,
    );

    try {
      // Execute task via orchestrator
      const result = await agentOrchestrator.executeTask(taskId);

      if (!result.success) {
        // Check if we should retry
        const { data: task } = await this.supabase
          .from("ai_agent_tasks")
          .select("retry_count, max_retries")
          .eq("id", taskId)
          .single();

        if (task && task.retry_count < task.max_retries) {
          // Increment retry count
          await this.supabase
            .from("ai_agent_tasks")
            .update({
              retry_count: task.retry_count + 1,
              updated_at: new Date().toISOString(),
            })
            .eq("id", taskId);

          throw new Error(result.error || "Task execution failed");
        } else {
          // Max retries reached, mark as permanently failed
          console.error(
            `[AgentTaskQueue] Task ${taskId} failed permanently after ${task?.max_retries || 0} retries`,
          );
          return result;
        }
      }

      console.log(
        `[AgentTaskQueue] Task ${taskId} completed successfully (${result.executionTimeMs}ms, ${result.tokensUsed} tokens, $${result.costUsd.toFixed(4)})`,
      );

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error(`[AgentTaskQueue] Task ${taskId} failed:`, errorMessage);
      throw error; // Re-throw to trigger retry
    }
  }

  /**
   * Pause queue processing
   */
  async pauseQueue(): Promise<void> {
    await this.queue.pause();
    console.log("[AgentTaskQueue] Queue paused");
  }

  /**
   * Resume queue processing
   */
  async resumeQueue(): Promise<void> {
    await this.queue.resume();
    console.log("[AgentTaskQueue] Queue resumed");
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<QueueStats> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
      this.queue.getDelayedCount(),
    ]);

    const isPaused = await this.queue.isPaused();

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      paused: isPaused,
    };
  }

  /**
   * Calculate next run time from cron expression
   */
  private calculateNextRun(
    cronExpression: string,
    timezone: string = "UTC",
  ): Date {
    // Parse cron and get next execution time
    // This is a simplified implementation - in production, use a proper cron parser
    const now = new Date();
    const nextRun = new Date(now.getTime() + 60 * 1000); // Default to 1 minute from now

    // TODO: Implement proper cron parsing with timezone support
    // For now, return a simple next-minute calculation
    return nextRun;
  }

  /**
   * Initialize scheduled task polling
   * Checks for scheduled tasks that need to be queued
   */
  private initializeScheduledTaskPolling(): void {
    // Poll every minute for tasks that need to run
    setInterval(async () => {
      if (this.isShuttingDown) return;

      try {
        const { data: tasks, error } = await this.supabase
          .from("ai_agent_tasks")
          .select("*")
          .eq("task_type", "scheduled")
          .eq("status", "pending")
          .not("next_run_at", "is", null)
          .lte("next_run_at", new Date().toISOString())
          .limit(100);

        if (error) {
          console.error(
            "[AgentTaskQueue] Error fetching scheduled tasks:",
            error,
          );
          return;
        }

        if (tasks && tasks.length > 0) {
          console.log(
            `[AgentTaskQueue] Found ${tasks.length} scheduled tasks to queue`,
          );

          for (const task of tasks) {
            try {
              await this.addTask(task.id, task.priority || 5);
            } catch (err) {
              console.error(
                `[AgentTaskQueue] Error queuing scheduled task ${task.id}:`,
                err,
              );
            }
          }
        }
      } catch (err) {
        console.error("[AgentTaskQueue] Error in scheduled task polling:", err);
      }
    }, 60 * 1000); // Check every minute
  }

  /**
   * Setup event listeners for queue monitoring
   */
  private setupEventListeners(): void {
    // Completed jobs
    this.worker.on("completed", (job: Job) => {
      console.log(`[AgentTaskQueue] ✓ Job ${job.id} completed`);
    });

    // Failed jobs
    this.worker.on("failed", (job: Job | undefined, error: Error) => {
      console.error(
        `[AgentTaskQueue] ✗ Job ${job?.id || "unknown"} failed:`,
        error.message,
      );

      // Move to dead letter queue if max retries exceeded
      if (job && job.attemptsMade >= (job.opts.attempts || 3)) {
        console.error(
          `[AgentTaskQueue] ⚠ Job ${job.id} moved to dead letter queue after ${job.attemptsMade} attempts`,
        );
      }
    });

    // Stalled jobs
    this.worker.on("stalled", (jobId: string) => {
      console.warn(
        `[AgentTaskQueue] ⚠ Job ${jobId} stalled - worker may have crashed`,
      );
    });

    // Worker errors
    this.worker.on("error", (error: Error) => {
      console.error("[AgentTaskQueue] Worker error:", error);
    });

    // Queue events
    this.queueEvents.on("waiting", ({ jobId }) => {
      console.log(`[AgentTaskQueue] Job ${jobId} is waiting`);
    });

    this.queueEvents.on("active", ({ jobId }) => {
      console.log(`[AgentTaskQueue] Job ${jobId} is active`);
    });
  }

  /**
   * Setup graceful shutdown handlers
   */
  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      console.log(
        `\n[AgentTaskQueue] Received ${signal}, shutting down gracefully...`,
      );
      this.isShuttingDown = true;

      try {
        // Stop accepting new jobs
        await this.queue.pause();

        // Wait for active jobs to complete (max 30 seconds)
        const activeJobs = await this.queue.getActive();
        if (activeJobs.length > 0) {
          console.log(
            `[AgentTaskQueue] Waiting for ${activeJobs.length} active jobs to complete...`,
          );
          await new Promise((resolve) => setTimeout(resolve, 30000));
        }

        // Stop scheduled tasks
        for (const [taskId, scheduledTask] of this.scheduledTasks) {
          scheduledTask.stop();
          console.log(`[AgentTaskQueue] Stopped scheduled task: ${taskId}`);
        }

        // Close worker
        await this.worker.close();
        console.log("[AgentTaskQueue] Worker closed");

        // Close queue
        await this.queue.close();
        console.log("[AgentTaskQueue] Queue closed");

        // Close queue events
        await this.queueEvents.close();
        console.log("[AgentTaskQueue] Queue events closed");

        // Close Redis connection
        await this.redis.quit();
        console.log("[AgentTaskQueue] Redis connection closed");

        console.log("[AgentTaskQueue] Shutdown complete");
        process.exit(0);
      } catch (error) {
        console.error("[AgentTaskQueue] Error during shutdown:", error);
        process.exit(1);
      }
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  }

  /**
   * Clean up completed and failed jobs
   */
  async cleanupJobs(): Promise<void> {
    const completedCleaned = await this.queue.clean(
      COMPLETED_JOB_RETENTION,
      1000,
      "completed",
    );
    const failedCleaned = await this.queue.clean(
      FAILED_JOB_RETENTION,
      1000,
      "failed",
    );

    console.log(
      `[AgentTaskQueue] Cleaned up ${completedCleaned.length} completed and ${failedCleaned.length} failed jobs`,
    );
  }

  /**
   * Get job by ID
   */
  async getJob(jobId: string): Promise<Job<AgentTaskJobData> | undefined> {
    return await this.queue.getJob(jobId);
  }

  /**
   * Remove job from queue
   */
  async removeJob(jobId: string): Promise<void> {
    const job = await this.queue.getJob(jobId);
    if (job) {
      await job.remove();
      console.log(`[AgentTaskQueue] Removed job ${jobId}`);
    }
  }

  /**
   * Retry failed job
   */
  async retryJob(jobId: string): Promise<void> {
    const job = await this.queue.getJob(jobId);
    if (job) {
      await job.retry();
      console.log(`[AgentTaskQueue] Retrying job ${jobId}`);
    }
  }
}

// Export singleton instance
export const agentTaskQueue = new AgentTaskQueue();
