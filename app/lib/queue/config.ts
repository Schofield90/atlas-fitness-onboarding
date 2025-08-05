import { ConnectionOptions, QueueOptions, WorkerOptions } from 'bullmq';

// Redis connection configuration
export const redisConnection: ConnectionOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
  maxRetriesPerRequest: null, // Required for BullMQ
};

// Queue names
export const QUEUE_NAMES = {
  // High priority - immediate actions
  WORKFLOW_TRIGGERS: 'workflow:triggers',
  WORKFLOW_ACTIONS: 'workflow:actions',
  
  // Medium priority - delayed actions
  WORKFLOW_SCHEDULED: 'workflow:scheduled',
  WORKFLOW_WAIT: 'workflow:wait',
  
  // Low priority - analytics and cleanup
  WORKFLOW_ANALYTICS: 'workflow:analytics',
  WORKFLOW_CLEANUP: 'workflow:cleanup',
  
  // Dead letter queue
  DEAD_LETTER: 'workflow:dead-letter',
} as const;

// Default queue options
export const defaultQueueOptions: QueueOptions = {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
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

// Worker options by priority
export const workerOptions: Record<string, WorkerOptions> = {
  [QUEUE_NAMES.WORKFLOW_TRIGGERS]: {
    connection: redisConnection,
    concurrency: 20,
    limiter: {
      max: 100,
      duration: 1000, // per second
    },
  },
  [QUEUE_NAMES.WORKFLOW_ACTIONS]: {
    connection: redisConnection,
    concurrency: 15,
    limiter: {
      max: 50,
      duration: 1000,
    },
  },
  [QUEUE_NAMES.WORKFLOW_SCHEDULED]: {
    connection: redisConnection,
    concurrency: 10,
    limiter: {
      max: 30,
      duration: 1000,
    },
  },
  [QUEUE_NAMES.WORKFLOW_WAIT]: {
    connection: redisConnection,
    concurrency: 5,
    limiter: {
      max: 20,
      duration: 1000,
    },
  },
  [QUEUE_NAMES.WORKFLOW_ANALYTICS]: {
    connection: redisConnection,
    concurrency: 5,
    limiter: {
      max: 10,
      duration: 1000,
    },
  },
  [QUEUE_NAMES.DEAD_LETTER]: {
    connection: redisConnection,
    concurrency: 1,
    limiter: {
      max: 5,
      duration: 1000,
    },
  },
};

// Job priorities
export const JOB_PRIORITIES = {
  CRITICAL: 1,
  HIGH: 2,
  NORMAL: 3,
  LOW: 4,
} as const;

// Job types
export const JOB_TYPES = {
  // Trigger jobs
  PROCESS_TRIGGER: 'process-trigger',
  EVALUATE_TRIGGER: 'evaluate-trigger',
  
  // Action jobs
  SEND_EMAIL: 'send-email',
  SEND_SMS: 'send-sms',
  SEND_WHATSAPP: 'send-whatsapp',
  UPDATE_LEAD: 'update-lead',
  ADD_TAG: 'add-tag',
  
  // Workflow control
  EXECUTE_WORKFLOW: 'execute-workflow',
  EXECUTE_NODE: 'execute-node',
  WAIT_DELAY: 'wait-delay',
  
  // Analytics
  TRACK_EXECUTION: 'track-execution',
  UPDATE_STATS: 'update-stats',
  
  // Cleanup
  CLEANUP_OLD_EXECUTIONS: 'cleanup-old-executions',
  ARCHIVE_COMPLETED: 'archive-completed',
} as const;

export type JobType = typeof JOB_TYPES[keyof typeof JOB_TYPES];
export type QueueName = typeof QUEUE_NAMES[keyof typeof QUEUE_NAMES];