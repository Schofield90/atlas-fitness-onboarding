import { ConnectionOptions, QueueOptions, WorkerOptions } from 'bullmq';
import IORedis from 'ioredis';

// Environment-specific configuration
const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';

// Redis connection configuration with resilience
export const redisConnection: ConnectionOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  username: process.env.REDIS_USERNAME,
  db: parseInt(process.env.REDIS_DB || '0'),
  tls: process.env.REDIS_TLS === 'true' ? {
    // SSL/TLS configuration for production
    servername: process.env.REDIS_HOST,
    rejectUnauthorized: process.env.REDIS_TLS_REJECT_UNAUTHORIZED !== 'false',
  } : undefined,
  
  // Connection pooling and resilience
  maxRetriesPerRequest: null, // Required for BullMQ
  retryDelayOnFailover: 100,
  enableReadyCheck: true,
  
  // Connection timeout and retry settings
  connectTimeout: 10000, // 10 seconds
  commandTimeout: 5000,   // 5 seconds
  lazyConnect: true,      // Don't connect immediately
  
  // Retry configuration with exponential backoff
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    console.log(`Redis retry attempt ${times}, delay: ${delay}ms`);
    return delay;
  },
  
  // Keep alive settings
  keepAlive: 30000,
  
  // Family preference (IPv4/IPv6)
  family: 4,
  
  // Additional resilience settings
  enableOfflineQueue: false,
  maxRetriesPerRequest: null,
};

// Enhanced Redis cluster support
export const redisClusterConnection = process.env.REDIS_CLUSTER_NODES ? {
  enableReadyCheck: false,
  redisOptions: {
    password: process.env.REDIS_PASSWORD,
    username: process.env.REDIS_USERNAME,
    tls: process.env.REDIS_TLS === 'true' ? {
      servername: process.env.REDIS_HOST,
    } : undefined,
  },
  clusterRetryDelayOnFailover: 100,
  clusterRetryDelayOnClusterDown: 300,
  clusterMaxRedirections: 3,
  maxRetriesPerRequest: null,
} : null;

// Queue names with environment-specific prefixes
const queuePrefix = process.env.QUEUE_PREFIX || (isProduction ? 'prod' : 'dev');

export const QUEUE_NAMES = {
  // High priority - immediate actions
  WORKFLOW_TRIGGERS: `${queuePrefix}:workflow:triggers`,
  WORKFLOW_ACTIONS: `${queuePrefix}:workflow:actions`,
  
  // Medium priority - delayed actions
  WORKFLOW_SCHEDULED: `${queuePrefix}:workflow:scheduled`,
  WORKFLOW_WAIT: `${queuePrefix}:workflow:wait`,
  
  // Communication queues
  EMAIL_QUEUE: `${queuePrefix}:communication:email`,
  SMS_QUEUE: `${queuePrefix}:communication:sms`,
  WHATSAPP_QUEUE: `${queuePrefix}:communication:whatsapp`,
  
  // System queues
  WORKFLOW_ANALYTICS: `${queuePrefix}:system:analytics`,
  WORKFLOW_CLEANUP: `${queuePrefix}:system:cleanup`,
  HEALTH_CHECKS: `${queuePrefix}:system:health`,
  
  // Retry and error handling
  RETRY_QUEUE: `${queuePrefix}:system:retry`,
  DEAD_LETTER: `${queuePrefix}:system:dead-letter`,
} as const;

// Enhanced default queue options
export const defaultQueueOptions: QueueOptions = {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: isProduction ? 5 : 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      age: isProduction ? 7200 : 3600, // 2 hours in prod, 1 hour in dev
      count: isProduction ? 500 : 100,
    },
    removeOnFail: {
      age: isProduction ? 259200 : 86400, // 3 days in prod, 1 day in dev
      count: isProduction ? 5000 : 1000,
    },
  },
  settings: {
    stalledInterval: 30 * 1000,  // 30 seconds
    maxStalledCount: 1,
    retryProcessDelay: 5 * 1000, // 5 seconds
  },
};

// Enhanced worker options with environment-aware concurrency
const getConcurrency = (base: number) => {
  if (isProduction) return Math.max(base * 2, 1);
  if (isDevelopment) return Math.max(Math.floor(base / 2), 1);
  return base;
};

export const workerOptions: Record<string, WorkerOptions> = {
  [QUEUE_NAMES.WORKFLOW_TRIGGERS]: {
    connection: redisConnection,
    concurrency: getConcurrency(20),
    limiter: {
      max: 100,
      duration: 1000, // per second
    },
    settings: {
      stalledInterval: 30 * 1000,
      maxStalledCount: 1,
    },
  },
  [QUEUE_NAMES.WORKFLOW_ACTIONS]: {
    connection: redisConnection,
    concurrency: getConcurrency(15),
    limiter: {
      max: 50,
      duration: 1000,
    },
    settings: {
      stalledInterval: 30 * 1000,
      maxStalledCount: 1,
    },
  },
  [QUEUE_NAMES.EMAIL_QUEUE]: {
    connection: redisConnection,
    concurrency: getConcurrency(10),
    limiter: {
      max: 30, // Rate limit emails
      duration: 1000,
    },
  },
  [QUEUE_NAMES.SMS_QUEUE]: {
    connection: redisConnection,
    concurrency: getConcurrency(8),
    limiter: {
      max: 20, // Rate limit SMS
      duration: 1000,
    },
  },
  [QUEUE_NAMES.WHATSAPP_QUEUE]: {
    connection: redisConnection,
    concurrency: getConcurrency(5),
    limiter: {
      max: 10, // Rate limit WhatsApp
      duration: 1000,
    },
  },
  [QUEUE_NAMES.WORKFLOW_SCHEDULED]: {
    connection: redisConnection,
    concurrency: getConcurrency(10),
    limiter: {
      max: 30,
      duration: 1000,
    },
  },
  [QUEUE_NAMES.WORKFLOW_WAIT]: {
    connection: redisConnection,
    concurrency: getConcurrency(5),
    limiter: {
      max: 20,
      duration: 1000,
    },
  },
  [QUEUE_NAMES.WORKFLOW_ANALYTICS]: {
    connection: redisConnection,
    concurrency: getConcurrency(5),
    limiter: {
      max: 10,
      duration: 1000,
    },
  },
  [QUEUE_NAMES.HEALTH_CHECKS]: {
    connection: redisConnection,
    concurrency: 1,
    limiter: {
      max: 1,
      duration: 5000, // Health checks every 5 seconds max
    },
  },
  [QUEUE_NAMES.RETRY_QUEUE]: {
    connection: redisConnection,
    concurrency: getConcurrency(3),
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
  BACKGROUND: 5,
} as const;

// Enhanced job types
export const JOB_TYPES = {
  // Trigger jobs
  PROCESS_TRIGGER: 'process-trigger',
  EVALUATE_TRIGGER: 'evaluate-trigger',
  BATCH_TRIGGER: 'batch-trigger',
  
  // Action jobs
  SEND_EMAIL: 'send-email',
  SEND_SMS: 'send-sms',
  SEND_WHATSAPP: 'send-whatsapp',
  BULK_EMAIL: 'bulk-email',
  BULK_SMS: 'bulk-sms',
  
  // CRM actions
  UPDATE_LEAD: 'update-lead',
  CREATE_CONTACT: 'create-contact',
  ADD_TAG: 'add-tag',
  REMOVE_TAG: 'remove-tag',
  UPDATE_SCORE: 'update-score',
  
  // Workflow control
  EXECUTE_WORKFLOW: 'execute-workflow',
  EXECUTE_NODE: 'execute-node',
  EXECUTE_BRANCH: 'execute-branch',
  WAIT_DELAY: 'wait-delay',
  WAIT_CONDITION: 'wait-condition',
  
  // Analytics and tracking
  TRACK_EXECUTION: 'track-execution',
  TRACK_PERFORMANCE: 'track-performance',
  UPDATE_STATS: 'update-stats',
  GENERATE_REPORT: 'generate-report',
  
  // System maintenance
  CLEANUP_OLD_EXECUTIONS: 'cleanup-old-executions',
  ARCHIVE_COMPLETED: 'archive-completed',
  HEALTH_CHECK: 'health-check',
  BACKUP_DATA: 'backup-data',
  
  // Error handling
  RETRY_FAILED: 'retry-failed',
  HANDLE_ERROR: 'handle-error',
  ESCALATE_ERROR: 'escalate-error',
} as const;

// Retry strategies by job type
export const RETRY_STRATEGIES = {
  [JOB_TYPES.SEND_EMAIL]: {
    attempts: 5,
    backoff: { type: 'exponential' as const, delay: 2000 },
  },
  [JOB_TYPES.SEND_SMS]: {
    attempts: 3,
    backoff: { type: 'exponential' as const, delay: 1000 },
  },
  [JOB_TYPES.SEND_WHATSAPP]: {
    attempts: 3,
    backoff: { type: 'exponential' as const, delay: 1000 },
  },
  [JOB_TYPES.EXECUTE_WORKFLOW]: {
    attempts: 5,
    backoff: { type: 'exponential' as const, delay: 3000 },
  },
  [JOB_TYPES.UPDATE_LEAD]: {
    attempts: 3,
    backoff: { type: 'fixed' as const, delay: 5000 },
  },
  // Default for other job types
  default: {
    attempts: 3,
    backoff: { type: 'exponential' as const, delay: 2000 },
  },
};

// Queue health thresholds
export const HEALTH_THRESHOLDS = {
  QUEUE_SIZE_WARNING: 1000,
  QUEUE_SIZE_CRITICAL: 5000,
  FAILED_JOBS_WARNING: 50,
  FAILED_JOBS_CRITICAL: 200,
  STALLED_JOBS_WARNING: 10,
  STALLED_JOBS_CRITICAL: 50,
  MEMORY_WARNING_MB: 500,
  MEMORY_CRITICAL_MB: 1000,
};

// Performance monitoring configuration
export const MONITORING_CONFIG = {
  METRICS_RETENTION_HOURS: isProduction ? 168 : 24, // 7 days in prod, 1 day in dev
  PERFORMANCE_SAMPLE_RATE: isProduction ? 0.1 : 1.0, // 10% in prod, 100% in dev
  ERROR_ALERT_THRESHOLD: 10, // Alert after 10 errors in window
  ERROR_ALERT_WINDOW_MINUTES: 5,
};

export type JobType = typeof JOB_TYPES[keyof typeof JOB_TYPES];
export type QueueName = typeof QUEUE_NAMES[keyof typeof QUEUE_NAMES];
export type JobPriority = typeof JOB_PRIORITIES[keyof typeof JOB_PRIORITIES];

// Export original config for backwards compatibility
export { redisConnection as originalRedisConnection } from './config';