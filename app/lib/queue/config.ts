import { ConnectionOptions, QueueOptions, WorkerOptions } from "bullmq";

// Lazy Redis connection configuration
let _redisConnection: ConnectionOptions | null = null;

export function getRedisConnection(): ConnectionOptions | null {
  // Skip during build
  if (process.env.NODE_ENV === "production" && !process.env.VERCEL_ENV) {
    return null;
  }

  if (!_redisConnection) {
    _redisConnection = {
      host: process.env.REDIS_HOST || "localhost",
      port: parseInt(process.env.REDIS_PORT || "6379"),
      password: process.env.REDIS_PASSWORD,
      tls: process.env.REDIS_TLS === "true" ? {} : undefined,
      maxRetriesPerRequest: null, // Required for BullMQ
    };
  }

  return _redisConnection;
}

// For backward compatibility
export const redisConnection = getRedisConnection();

// Queue names
export const QUEUE_NAMES = {
  // High priority - immediate actions
  WORKFLOW_TRIGGERS: "workflow:triggers",
  WORKFLOW_ACTIONS: "workflow:actions",

  // Medium priority - delayed actions
  WORKFLOW_SCHEDULED: "workflow:scheduled",
  WORKFLOW_WAIT: "workflow:wait",

  // Low priority - analytics and cleanup
  WORKFLOW_ANALYTICS: "workflow:analytics",
  WORKFLOW_CLEANUP: "workflow:cleanup",

  // Dead letter queue
  DEAD_LETTER: "workflow:dead-letter",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

// Default queue options - now a function
export function getDefaultQueueOptions(): QueueOptions | null {
  const conn = getRedisConnection();
  if (!conn) return null;

  return {
    connection: conn,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 2000,
      },
      removeOnComplete: {
        age: 3600, // 1 hour
        count: 100,
      },
      removeOnFail: {
        age: 86400, // 24 hours
        count: 1000,
      },
    },
  };
}

// Worker options by priority - now a function
export function getWorkerOptions(): Record<string, WorkerOptions> | null {
  const conn = getRedisConnection();
  if (!conn) return null;

  return {
    [QUEUE_NAMES.WORKFLOW_TRIGGERS]: {
      connection: conn,
      concurrency: 20,
      limiter: {
        max: 100,
        duration: 1000, // per second
      },
    },
    [QUEUE_NAMES.WORKFLOW_ACTIONS]: {
      connection: conn,
      concurrency: 15,
      limiter: {
        max: 50,
        duration: 1000,
      },
    },
    [QUEUE_NAMES.WORKFLOW_SCHEDULED]: {
      connection: conn,
      concurrency: 10,
      limiter: {
        max: 30,
        duration: 1000,
      },
    },
    [QUEUE_NAMES.WORKFLOW_WAIT]: {
      connection: conn,
      concurrency: 5,
      limiter: {
        max: 20,
        duration: 1000,
      },
    },
    [QUEUE_NAMES.WORKFLOW_ANALYTICS]: {
      connection: conn,
      concurrency: 5,
      limiter: {
        max: 10,
        duration: 1000,
      },
    },
    [QUEUE_NAMES.DEAD_LETTER]: {
      connection: conn,
      concurrency: 1,
      limiter: {
        max: 5,
        duration: 1000,
      },
    },
  };
}

// For backward compatibility
export const defaultQueueOptions = getDefaultQueueOptions();
export const workerOptions = getWorkerOptions();
