import { Queue, Worker, Job, QueueEvents } from "bullmq";
import {
  getRedisConnection,
  QUEUE_NAMES,
  getDefaultQueueOptions,
  getWorkerOptions,
  QueueName,
} from "./config";

export class QueueManager {
  private static instance: QueueManager;
  private queues: Map<QueueName, Queue>;
  private workers: Map<QueueName, Worker>;
  private queueEvents: Map<QueueName, QueueEvents>;
  private isInitialized: boolean = false;

  private constructor() {
    this.queues = new Map();
    this.workers = new Map();
    this.queueEvents = new Map();
  }

  static getInstance(): QueueManager {
    if (!QueueManager.instance) {
      QueueManager.instance = new QueueManager();
    }
    return QueueManager.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Skip initialization during build
    const redisConn = getRedisConnection();
    if (!redisConn) {
      console.log(
        "Skipping queue initialization - no Redis connection available",
      );
      return;
    }

    const defaultOptions = getDefaultQueueOptions();
    if (!defaultOptions) {
      console.log("Skipping queue initialization - no default options");
      return;
    }

    // Initialize queues
    for (const [name, queueName] of Object.entries(QUEUE_NAMES)) {
      try {
        const queue = new Queue(queueName, {
          connection: redisConn,
          ...defaultOptions,
        });

        this.queues.set(queueName as QueueName, queue);

        // Initialize queue events for monitoring
        const events = new QueueEvents(queueName, {
          connection: redisConn,
        });

        this.queueEvents.set(queueName as QueueName, events);
      } catch (error) {
        console.warn(`Failed to initialize queue ${queueName}:`, error);
      }
    }

    this.isInitialized = true;
    console.log("Queue system initialized");
  }

  getQueue(name: QueueName): Queue | null {
    const queue = this.queues.get(name);
    if (!queue) {
      console.warn(`Queue ${name} not found - may be in build environment`);
      return null;
    }
    return queue;
  }

  async addJob<T = any>(
    queueName: QueueName,
    jobType: string,
    data: T,
    options?: {
      priority?: number;
      delay?: number;
      attempts?: number;
      removeOnComplete?: boolean | number;
      removeOnFail?: boolean | number;
    },
  ): Promise<Job<T> | null> {
    const queue = this.getQueue(queueName);
    if (!queue) return null;

    return queue.add(jobType, data, {
      ...options,
      // Add job ID for deduplication if needed
      jobId: options?.delay ? undefined : `${jobType}-${JSON.stringify(data)}`,
    });
  }

  async bulkAddJobs<T = any>(
    queueName: QueueName,
    jobs: Array<{
      name: string;
      data: T;
      opts?: any;
    }>,
  ): Promise<Job<T>[] | null> {
    const queue = this.getQueue(queueName);
    if (!queue) return null;

    return queue.addBulk(jobs);
  }

  registerWorker<T = any>(
    queueName: QueueName,
    processor: (job: Job<T>) => Promise<any>,
  ): Worker | null {
    // Skip worker registration during build
    const redisConn = getRedisConnection();
    if (!redisConn) {
      console.log("Skipping worker registration - no Redis connection");
      return null;
    }

    const existingWorker = this.workers.get(queueName);
    if (existingWorker) {
      console.warn(`Worker already registered for queue ${queueName}`);
      return existingWorker;
    }

    const workerOpts = getWorkerOptions();
    if (!workerOpts) {
      console.warn("No worker options available");
      return null;
    }

    const options = workerOpts[queueName] || {
      connection: redisConn,
      concurrency: 5,
    };

    const worker = new Worker(queueName, processor, options);
    this.workers.set(queueName, worker);

    return worker;
  }

  async shutdown(): Promise<void> {
    // Close all workers
    for (const [name, worker] of this.workers) {
      await worker.close();
      console.log(`Worker ${name} closed`);
    }

    // Close all queues
    for (const [name, queue] of this.queues) {
      await queue.close();
      console.log(`Queue ${name} closed`);
    }

    // Close all queue events
    for (const [name, events] of this.queueEvents) {
      await events.close();
      console.log(`Queue events ${name} closed`);
    }

    this.workers.clear();
    this.queues.clear();
    this.queueEvents.clear();
    this.isInitialized = false;
  }

  async getQueueMetrics(queueName: QueueName) {
    const queue = this.getQueue(queueName);
    if (!queue) return null;

    const [waiting, active, completed, failed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
    };
  }

  async getAllMetrics() {
    const metrics: Record<string, any> = {};

    for (const queueName of Object.values(QUEUE_NAMES)) {
      const queueMetrics = await this.getQueueMetrics(queueName as QueueName);
      if (queueMetrics) {
        metrics[queueName] = queueMetrics;
      }
    }

    return metrics;
  }
}

// Export singleton getter function instead of instance to avoid module-level instantiation
export const getQueueManager = () => QueueManager.getInstance();
