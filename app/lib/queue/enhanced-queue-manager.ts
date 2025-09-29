import { Queue, Worker, Job, QueueEvents } from "bullmq";
import IORedis from "ioredis";
import {
  redisConnection,
  redisClusterConnection,
  QUEUE_NAMES,
  defaultQueueOptions,
  workerOptions,
  QueueName,
  JobType,
  JOB_PRIORITIES,
  RETRY_STRATEGIES,
  HEALTH_THRESHOLDS,
  MONITORING_CONFIG,
} from "./enhanced-config";

interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
  stalled: number;
}

interface QueueHealth {
  status: "healthy" | "warning" | "critical";
  issues: string[];
  metrics: QueueStats;
  lastCheck: Date;
}

interface ConnectionHealth {
  redis: boolean;
  lastError?: string;
  lastConnected?: Date;
  reconnectAttempts: number;
}

export class EnhancedQueueManager {
  private static instance: EnhancedQueueManager;
  private queues: Map<QueueName, Queue>;
  private workers: Map<QueueName, Worker>;
  private queueEvents: Map<QueueName, QueueEvents>;
  private redis: IORedis | null = null;
  private isInitialized: boolean = false;
  private isShuttingDown: boolean = false;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private metricsInterval: NodeJS.Timeout | null = null;
  private connectionHealth: ConnectionHealth = {
    redis: false,
    reconnectAttempts: 0,
  };

  // Metrics tracking
  private metrics: {
    processedJobs: number;
    failedJobs: number;
    retriedJobs: number;
    lastMetricsReset: Date;
  } = {
    processedJobs: 0,
    failedJobs: 0,
    retriedJobs: 0,
    lastMetricsReset: new Date(),
  };

  private constructor() {
    this.queues = new Map();
    this.workers = new Map();
    this.queueEvents = new Map();
  }

  static getInstance(): EnhancedQueueManager {
    if (!EnhancedQueueManager.instance) {
      EnhancedQueueManager.instance = new EnhancedQueueManager();
    }
    return EnhancedQueueManager.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log("🚀 Initializing enhanced queue system...");

    try {
      // Initialize Redis connection
      await this.initializeRedisConnection();

      // Initialize queues
      await this.initializeQueues();

      // Start health monitoring
      this.startHealthMonitoring();

      // Start metrics collection
      this.startMetricsCollection();

      this.isInitialized = true;
      console.log("✅ Enhanced queue system initialized successfully");
    } catch (error) {
      console.error("❌ Failed to initialize queue system:", error);
      throw error;
    }
  }

  private async initializeRedisConnection(): Promise<void> {
    try {
      if (redisClusterConnection) {
        // Use Redis cluster
        const cluster = new IORedis.Cluster(
          process.env.REDIS_CLUSTER_NODES!.split(",").map((node) => {
            const [host, port] = node.split(":");
            return { host, port: parseInt(port) };
          }),
          redisClusterConnection,
        );
        this.redis = cluster;
      } else {
        // Use single Redis instance
        this.redis = new IORedis(redisConnection);
      }

      // Connection event handlers
      this.redis.on("connect", () => {
        console.log("📡 Redis connected");
        this.connectionHealth.redis = true;
        this.connectionHealth.lastConnected = new Date();
        this.connectionHealth.reconnectAttempts = 0;
      });

      this.redis.on("error", (error) => {
        console.error("❌ Redis error:", error);
        this.connectionHealth.redis = false;
        this.connectionHealth.lastError = error.message;
      });

      this.redis.on("reconnecting", (delay) => {
        console.log(`🔄 Redis reconnecting in ${delay}ms...`);
        this.connectionHealth.reconnectAttempts++;
      });

      this.redis.on("ready", () => {
        console.log("✅ Redis ready");
        this.connectionHealth.redis = true;
      });

      // Test connection
      await this.redis.ping();
      console.log("✅ Redis connection test successful");
    } catch (error) {
      console.error("❌ Redis connection failed:", error);
      this.connectionHealth.redis = false;
      this.connectionHealth.lastError = error.message;
      throw error;
    }
  }

  private async initializeQueues(): Promise<void> {
    console.log("🔧 Initializing queues...");

    for (const [name, queueName] of Object.entries(QUEUE_NAMES)) {
      try {
        // Create queue
        const queue = new Queue(queueName, {
          connection: redisConnection,
          ...defaultQueueOptions,
        });

        this.queues.set(queueName as QueueName, queue);

        // Create queue events for monitoring
        const events = new QueueEvents(queueName, {
          connection: redisConnection,
        });

        this.queueEvents.set(queueName as QueueName, events);

        // Note: QueueScheduler is no longer needed in BullMQ v2+
        // Delayed jobs are now handled by the Queue itself

        console.log(`✅ Queue ${queueName} initialized`);
      } catch (error) {
        console.error(`❌ Failed to initialize queue ${queueName}:`, error);
        throw error;
      }
    }
  }

  private startHealthMonitoring(): void {
    console.log("🏥 Starting health monitoring...");

    this.healthCheckInterval = setInterval(async () => {
      if (this.isShuttingDown) return;

      try {
        await this.performHealthCheck();
      } catch (error) {
        console.error("❌ Health check failed:", error);
      }
    }, 30000); // Every 30 seconds
  }

  private startMetricsCollection(): void {
    console.log("📊 Starting metrics collection...");

    this.metricsInterval = setInterval(async () => {
      if (this.isShuttingDown) return;

      try {
        await this.collectMetrics();
      } catch (error) {
        console.error("❌ Metrics collection failed:", error);
      }
    }, 60000); // Every minute
  }

  async performHealthCheck(): Promise<Map<QueueName, QueueHealth>> {
    const healthReport = new Map<QueueName, QueueHealth>();

    for (const [queueName, queue] of this.queues) {
      try {
        const stats = await this.getQueueStats(queueName);
        const health = this.evaluateQueueHealth(stats);

        healthReport.set(queueName, {
          ...health,
          metrics: stats,
          lastCheck: new Date(),
        });
      } catch (error) {
        healthReport.set(queueName, {
          status: "critical",
          issues: [`Health check failed: ${error.message}`],
          metrics: {} as QueueStats,
          lastCheck: new Date(),
        });
      }
    }

    // Log critical issues
    for (const [queueName, health] of healthReport) {
      if (health.status === "critical") {
        console.error(
          `🚨 Critical queue health issue in ${queueName}:`,
          health.issues,
        );
      } else if (health.status === "warning") {
        console.warn(
          `⚠️  Queue health warning in ${queueName}:`,
          health.issues,
        );
      }
    }

    return healthReport;
  }

  private evaluateQueueHealth(
    stats: QueueStats,
  ): Omit<QueueHealth, "metrics" | "lastCheck"> {
    const issues: string[] = [];
    let status: "healthy" | "warning" | "critical" = "healthy";

    // Check queue size
    const totalJobs = stats.waiting + stats.active + stats.delayed;
    if (totalJobs > HEALTH_THRESHOLDS.QUEUE_SIZE_CRITICAL) {
      status = "critical";
      issues.push(`Queue size critical: ${totalJobs} jobs`);
    } else if (totalJobs > HEALTH_THRESHOLDS.QUEUE_SIZE_WARNING) {
      status = status === "healthy" ? "warning" : status;
      issues.push(`Queue size warning: ${totalJobs} jobs`);
    }

    // Check failed jobs
    if (stats.failed > HEALTH_THRESHOLDS.FAILED_JOBS_CRITICAL) {
      status = "critical";
      issues.push(`Failed jobs critical: ${stats.failed}`);
    } else if (stats.failed > HEALTH_THRESHOLDS.FAILED_JOBS_WARNING) {
      status = status === "healthy" ? "warning" : status;
      issues.push(`Failed jobs warning: ${stats.failed}`);
    }

    // Check stalled jobs
    if (stats.stalled > HEALTH_THRESHOLDS.STALLED_JOBS_CRITICAL) {
      status = "critical";
      issues.push(`Stalled jobs critical: ${stats.stalled}`);
    } else if (stats.stalled > HEALTH_THRESHOLDS.STALLED_JOBS_WARNING) {
      status = status === "healthy" ? "warning" : status;
      issues.push(`Stalled jobs warning: ${stats.stalled}`);
    }

    return { status, issues };
  }

  private async collectMetrics(): Promise<void> {
    const stats = await this.getAllQueueStats();

    // Reset metrics if needed (daily reset)
    const now = new Date();
    const hoursSinceReset =
      (now.getTime() - this.metrics.lastMetricsReset.getTime()) /
      (1000 * 60 * 60);

    if (hoursSinceReset >= MONITORING_CONFIG.METRICS_RETENTION_HOURS) {
      this.metrics = {
        processedJobs: 0,
        failedJobs: 0,
        retriedJobs: 0,
        lastMetricsReset: now,
      };
    }

    // Log metrics summary
    console.log("📊 Queue Metrics Summary:", {
      totalQueues: this.queues.size,
      totalProcessedJobs: this.metrics.processedJobs,
      totalFailedJobs: this.metrics.failedJobs,
      totalRetriedJobs: this.metrics.retriedJobs,
      connectionHealth: this.connectionHealth,
    });
  }

  getQueue(name: QueueName): Queue {
    const queue = this.queues.get(name);
    if (!queue) {
      throw new Error(
        `Queue ${name} not found. Available queues: ${Array.from(this.queues.keys()).join(", ")}`,
      );
    }
    return queue;
  }

  async addJob<T = any>(
    queueName: QueueName,
    jobType: JobType,
    data: T,
    options?: {
      priority?: number;
      delay?: number;
      attempts?: number;
      removeOnComplete?: boolean | number;
      removeOnFail?: boolean | number;
      repeat?: any;
      jobId?: string;
    },
  ): Promise<Job<T>> {
    if (this.isShuttingDown) {
      throw new Error("Queue manager is shutting down, cannot add new jobs");
    }

    const queue = this.getQueue(queueName);

    // Apply retry strategy if available
    const retryStrategy = RETRY_STRATEGIES[jobType] || RETRY_STRATEGIES.default;

    const jobOptions = {
      ...retryStrategy,
      ...options,
      // Add metadata for tracking
      jobId:
        options?.jobId ||
        (options?.delay
          ? undefined
          : `${jobType}-${Date.now()}-${Math.random()}`),
    };

    try {
      const job = await queue.add(jobType, data, jobOptions);
      console.log(`✅ Job ${job.id} added to queue ${queueName}`);
      return job;
    } catch (error) {
      console.error(`❌ Failed to add job to queue ${queueName}:`, error);
      throw error;
    }
  }

  async addBulkJobs<T = any>(
    queueName: QueueName,
    jobs: Array<{
      name: string;
      data: T;
      opts?: any;
    }>,
  ): Promise<Job<T>[]> {
    if (this.isShuttingDown) {
      throw new Error("Queue manager is shutting down, cannot add new jobs");
    }

    const queue = this.getQueue(queueName);

    try {
      const addedJobs = await queue.addBulk(jobs);
      console.log(`✅ ${addedJobs.length} jobs added to queue ${queueName}`);
      return addedJobs;
    } catch (error) {
      console.error(`❌ Failed to add bulk jobs to queue ${queueName}:`, error);
      throw error;
    }
  }

  registerWorker<T = any>(
    queueName: QueueName,
    processor: (job: Job<T>) => Promise<any>,
  ): Worker {
    const existingWorker = this.workers.get(queueName);
    if (existingWorker) {
      console.warn(`⚠️  Worker for queue ${queueName} already exists`);
      return existingWorker;
    }

    const worker = new Worker(
      queueName,
      async (job: Job<T>) => {
        const startTime = Date.now();
        try {
          const result = await processor(job);
          const processingTime = Date.now() - startTime;

          console.log(`✅ Job ${job.id} completed in ${processingTime}ms`);
          this.metrics.processedJobs++;

          return result;
        } catch (error) {
          const processingTime = Date.now() - startTime;
          console.error(
            `❌ Job ${job.id} failed after ${processingTime}ms:`,
            error,
          );
          this.metrics.failedJobs++;
          throw error;
        }
      },
      workerOptions[queueName] || {
        connection: redisConnection,
        concurrency: 5,
      },
    );

    // Enhanced error handling
    worker.on("failed", async (job, err) => {
      console.error(`❌ Job ${job?.id} in queue ${queueName} failed:`, err);
      await this.handleFailedJob(job, err, queueName);
    });

    worker.on("completed", (job, returnvalue) => {
      console.log(`✅ Job ${job.id} in queue ${queueName} completed`);
    });

    worker.on("error", (err) => {
      console.error(`❌ Worker error in queue ${queueName}:`, err);
    });

    worker.on("stalled", (jobId) => {
      console.warn(`⚠️  Job ${jobId} stalled in queue ${queueName}`);
    });

    this.workers.set(queueName, worker);
    console.log(`🔧 Worker registered for queue ${queueName}`);

    return worker;
  }

  private async handleFailedJob(
    job: Job | undefined,
    error: Error,
    queueName: QueueName,
  ): Promise<void> {
    if (!job) return;

    const attemptsMade = job.attemptsMade;
    const maxAttempts = job.opts.attempts || 3;

    // Log failure details
    console.error(`💥 Job failure details:`, {
      jobId: job.id,
      jobName: job.name,
      queueName,
      attemptsMade,
      maxAttempts,
      error: error.message,
      stack: error.stack?.split("\n").slice(0, 5), // First 5 lines
    });

    // If all retries exhausted, move to dead letter queue
    if (attemptsMade >= maxAttempts) {
      try {
        const deadLetterQueue = this.getQueue(QUEUE_NAMES.DEAD_LETTER);

        await deadLetterQueue.add(
          "failed-job",
          {
            originalQueue: queueName,
            jobId: job.id,
            jobName: job.name,
            data: job.data,
            error: {
              message: error.message,
              stack: error.stack,
              name: error.name,
            },
            failedAt: new Date().toISOString(),
            attempts: attemptsMade,
            processingTime: job.processedOn
              ? Date.now() - job.processedOn
              : null,
          },
          {
            priority: JOB_PRIORITIES.HIGH, // Prioritize dead letter queue processing
          },
        );

        console.log(`📮 Job ${job.id} moved to dead letter queue`);
      } catch (dlqError) {
        console.error("❌ Failed to move job to dead letter queue:", dlqError);
      }
    } else {
      this.metrics.retriedJobs++;
    }
  }

  async getQueueStats(queueName: QueueName): Promise<QueueStats> {
    const queue = this.getQueue(queueName);

    try {
      const [waiting, active, completed, failed, delayed, isPaused] =
        await Promise.all([
          queue.getWaitingCount(),
          queue.getActiveCount(),
          queue.getCompletedCount(),
          queue.getFailedCount(),
          queue.getDelayedCount(),
          queue.isPaused(),
        ]);

      // Get stalled jobs count
      const stalledJobs = await queue.getJobs(["stalled"]);
      const stalled = stalledJobs.length;

      return {
        waiting,
        active,
        completed,
        failed,
        delayed,
        paused: isPaused,
        stalled,
      };
    } catch (error) {
      console.error(`❌ Failed to get stats for queue ${queueName}:`, error);
      throw error;
    }
  }

  async getAllQueueStats(): Promise<Record<QueueName, QueueStats>> {
    const stats: Record<string, QueueStats> = {};

    const statPromises = Array.from(this.queues.keys()).map(
      async (queueName) => {
        try {
          const queueStats = await this.getQueueStats(queueName);
          stats[queueName] = queueStats;
        } catch (error) {
          console.error(
            `❌ Failed to get stats for queue ${queueName}:`,
            error,
          );
          // Set default stats for failed queue
          stats[queueName] = {
            waiting: -1,
            active: -1,
            completed: -1,
            failed: -1,
            delayed: -1,
            paused: false,
            stalled: -1,
          };
        }
      },
    );

    await Promise.allSettled(statPromises);
    return stats as Record<QueueName, QueueStats>;
  }

  // Queue management operations
  async pauseQueue(queueName: QueueName): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.pause();
    console.log(`⏸️  Queue ${queueName} paused`);
  }

  async resumeQueue(queueName: QueueName): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.resume();
    console.log(`▶️  Queue ${queueName} resumed`);
  }

  async drainQueue(queueName: QueueName): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.drain();
    console.log(`🚰 Queue ${queueName} drained`);
  }

  async cleanQueue(
    queueName: QueueName,
    grace: number = 0,
    limit: number = 100,
    status?: "completed" | "wait" | "active" | "paused" | "delayed" | "failed",
  ): Promise<string[]> {
    const queue = this.getQueue(queueName);
    const cleaned = await queue.clean(grace, limit, status);
    console.log(`🧹 Cleaned ${cleaned.length} jobs from queue ${queueName}`);
    return cleaned;
  }

  async retryFailedJobs(queueName: QueueName): Promise<void> {
    const queue = this.getQueue(queueName);
    const failedJobs = await queue.getJobs(["failed"]);

    for (const job of failedJobs) {
      await job.retry();
    }

    console.log(
      `🔄 Retried ${failedJobs.length} failed jobs in queue ${queueName}`,
    );
  }

  getConnectionHealth(): ConnectionHealth {
    return { ...this.connectionHealth };
  }

  getMetrics() {
    return { ...this.metrics };
  }

  async shutdown(): Promise<void> {
    if (this.isShuttingDown) {
      console.log("🔄 Shutdown already in progress...");
      return;
    }

    console.log("🛑 Starting graceful shutdown of queue system...");
    this.isShuttingDown = true;

    // Stop health monitoring
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    // Stop metrics collection
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }

    const shutdownPromises: Promise<void>[] = [];

    // Close all workers gracefully
    for (const [queueName, worker] of this.workers) {
      shutdownPromises.push(
        worker
          .close()
          .then(() => {
            console.log(`✅ Worker ${queueName} closed`);
          })
          .catch((error) => {
            console.error(`❌ Error closing worker ${queueName}:`, error);
          }),
      );
    }

    // Close all schedulers
    for (const [queueName, scheduler] of this.schedulers) {
      shutdownPromises.push(
        scheduler
          .close()
          .then(() => {
            console.log(`✅ Scheduler ${queueName} closed`);
          })
          .catch((error) => {
            console.error(`❌ Error closing scheduler ${queueName}:`, error);
          }),
      );
    }

    // Close all queue events
    for (const [queueName, events] of this.queueEvents) {
      shutdownPromises.push(
        events
          .close()
          .then(() => {
            console.log(`✅ Queue events ${queueName} closed`);
          })
          .catch((error) => {
            console.error(`❌ Error closing queue events ${queueName}:`, error);
          }),
      );
    }

    // Close all queues
    for (const [queueName, queue] of this.queues) {
      shutdownPromises.push(
        queue
          .close()
          .then(() => {
            console.log(`✅ Queue ${queueName} closed`);
          })
          .catch((error) => {
            console.error(`❌ Error closing queue ${queueName}:`, error);
          }),
      );
    }

    // Wait for all shutdowns with timeout
    try {
      await Promise.race([
        Promise.allSettled(shutdownPromises),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Shutdown timeout")), 30000),
        ),
      ]);
    } catch (error) {
      console.error("⚠️  Some components did not shutdown gracefully:", error);
    }

    // Close Redis connection
    if (this.redis) {
      try {
        await this.redis.disconnect();
        console.log("✅ Redis connection closed");
      } catch (error) {
        console.error("❌ Error closing Redis connection:", error);
      }
    }

    // Clear all maps
    this.workers.clear();
    this.queueEvents.clear();
    this.queues.clear();
    this.isInitialized = false;

    console.log("✅ Queue system shut down complete");
  }
}

// Export singleton instance with lazy initialization
let _instance: EnhancedQueueManager | null = null;

export const getEnhancedQueueManager = () => {
  if (!_instance) {
    _instance = EnhancedQueueManager.getInstance();
  }
  return _instance;
};

// For backward compatibility, export as enhancedQueueManager
export const enhancedQueueManager = new Proxy({} as EnhancedQueueManager, {
  get(target, prop, receiver) {
    const instance = getEnhancedQueueManager();
    return Reflect.get(instance, prop, instance);
  },
});
