import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import { 
  redisConnection, 
  QUEUE_NAMES, 
  defaultQueueOptions, 
  workerOptions,
  QueueName 
} from './config';

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

    // Initialize queues
    for (const [name, queueName] of Object.entries(QUEUE_NAMES)) {
      const queue = new Queue(queueName, {
        connection: redisConnection,
        ...defaultQueueOptions,
      });
      
      this.queues.set(queueName as QueueName, queue);

      // Initialize queue events for monitoring
      const events = new QueueEvents(queueName, {
        connection: redisConnection,
      });
      
      this.queueEvents.set(queueName as QueueName, events);
    }

    this.isInitialized = true;
    console.log('Queue system initialized');
  }

  getQueue(name: QueueName): Queue {
    const queue = this.queues.get(name);
    if (!queue) {
      throw new Error(`Queue ${name} not found`);
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
    }
  ): Promise<Job<T>> {
    const queue = this.getQueue(queueName);
    
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
    }>
  ): Promise<Job<T>[]> {
    const queue = this.getQueue(queueName);
    return queue.addBulk(jobs);
  }

  registerWorker<T = any>(
    queueName: QueueName,
    processor: (job: Job<T>) => Promise<any>
  ): Worker {
    const existingWorker = this.workers.get(queueName);
    if (existingWorker) {
      console.warn(`Worker for queue ${queueName} already exists`);
      return existingWorker;
    }

    const worker = new Worker(
      queueName,
      processor,
      workerOptions[queueName] || {
        connection: redisConnection,
        concurrency: 5,
      }
    );

    // Error handling
    worker.on('failed', (job, err) => {
      console.error(`Job ${job?.id} in queue ${queueName} failed:`, err);
      this.handleFailedJob(job, err, queueName);
    });

    worker.on('completed', (job) => {
      console.log(`Job ${job.id} in queue ${queueName} completed`);
    });

    worker.on('error', (err) => {
      console.error(`Worker error in queue ${queueName}:`, err);
    });

    this.workers.set(queueName, worker);
    return worker;
  }

  private async handleFailedJob(
    job: Job | undefined,
    error: Error,
    queueName: QueueName
  ): Promise<void> {
    if (!job) return;

    // Check if job should go to dead letter queue
    const attemptsMade = job.attemptsMade;
    const maxAttempts = job.opts.attempts || 3;

    if (attemptsMade >= maxAttempts) {
      // Move to dead letter queue
      const deadLetterQueue = this.getQueue(QUEUE_NAMES.DEAD_LETTER);
      
      await deadLetterQueue.add('failed-job', {
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
      });
    }
  }

  async getQueueStats(queueName: QueueName): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    paused: boolean;
  }> {
    const queue = this.getQueue(queueName);
    
    const [waiting, active, completed, failed, delayed, isPaused] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
      queue.isPaused(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      paused: isPaused,
    };
  }

  async getAllQueueStats(): Promise<Record<QueueName, any>> {
    const stats: Record<string, any> = {};
    
    for (const queueName of this.queues.keys()) {
      stats[queueName] = await this.getQueueStats(queueName);
    }
    
    return stats;
  }

  async pauseQueue(queueName: QueueName): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.pause();
  }

  async resumeQueue(queueName: QueueName): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.resume();
  }

  async drainQueue(queueName: QueueName): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.drain();
  }

  async cleanQueue(
    queueName: QueueName,
    grace: number = 0,
    limit: number = 100,
    status?: 'completed' | 'wait' | 'active' | 'paused' | 'delayed' | 'failed'
  ): Promise<string[]> {
    const queue = this.getQueue(queueName);
    return queue.clean(grace, limit, status);
  }

  async shutdown(): Promise<void> {
    // Close all workers
    for (const worker of this.workers.values()) {
      await worker.close();
    }

    // Close all queue events
    for (const events of this.queueEvents.values()) {
      await events.close();
    }

    // Close all queues
    for (const queue of this.queues.values()) {
      await queue.close();
    }

    this.workers.clear();
    this.queueEvents.clear();
    this.queues.clear();
    this.isInitialized = false;
    
    console.log('Queue system shut down');
  }
}

// Export singleton instance
export const queueManager = QueueManager.getInstance();