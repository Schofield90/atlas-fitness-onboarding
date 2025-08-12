/**
 * Enhanced BullMQ Queue System for Atlas Fitness CRM
 * 
 * This is the main entry point for the enhanced queue system that provides:
 * - Redis connection management with failover
 * - Comprehensive queue management
 * - Workflow execution processing
 * - Communication processors (Email, SMS, WhatsApp)
 * - Analytics and performance tracking
 * - Error handling and retry mechanisms
 * - Health monitoring and alerts
 * - Graceful shutdown capabilities
 */

// Core system exports
export { enhancedQueueManager } from './enhanced-queue-manager';
export { enhancedWorkerManager, startEnhancedWorkers, stopEnhancedWorkers } from './enhanced-workers';

// Configuration exports
export * from './enhanced-config';
export { redisConnection, redisClusterConnection } from './enhanced-config';

// Processor exports
export { workflowExecutionProcessor } from './processors/enhanced-workflow-execution-processor';
export { enhancedActionProcessor } from './processors/enhanced-action-processors';
export { communicationProcessor } from './processors/communication-processors';
export { analyticsProcessor } from './processors/analytics-processor';
export { retryProcessor } from './processors/retry-processor';

// Monitoring exports
export { healthMonitor } from './monitoring/health-monitor';

// Utility exports
export { QueueUtils } from './utils/queue-utils';
export * from './utils/queue-utils';

// Type exports
export type {
  QueueName,
  JobType,
  JobPriority,
} from './enhanced-config';

/**
 * Initialize the complete enhanced queue system
 * 
 * This function sets up:
 * 1. Redis connections with failover
 * 2. All queue instances
 * 3. Worker processes for each queue
 * 4. Health monitoring
 * 5. Analytics tracking
 * 6. Error handling and retry mechanisms
 */
export async function initializeQueueSystem(): Promise<void> {
  console.log('🚀 Initializing Enhanced BullMQ Queue System...');
  
  try {
    // Initialize the enhanced queue manager
    console.log('📊 Initializing queue manager...');
    await enhancedQueueManager.initialize();
    
    // Initialize and start all workers
    console.log('👷 Starting enhanced workers...');
    await enhancedWorkerManager.initialize();
    
    // Schedule initial health check
    console.log('🏥 Scheduling initial health check...');
    await enhancedQueueManager.addJob(
      'dev:system:health', // Using enhanced config queue name
      'health-check',
      {
        checkType: 'full',
        components: ['redis', 'database', 'queues', 'workers', 'system'],
      },
      {
        priority: 1, // High priority
      }
    );
    
    // Schedule periodic cleanup job
    console.log('🧹 Scheduling cleanup jobs...');
    await enhancedQueueManager.addJob(
      'dev:system:cleanup', // Using enhanced config queue name
      'cleanup-old-executions',
      {
        retentionDays: 7,
        batchSize: 100,
      },
      {
        repeat: {
          cron: '0 2 * * *', // Daily at 2 AM
        },
        priority: 4, // Low priority
      }
    );
    
    console.log('✅ Enhanced BullMQ Queue System initialized successfully');
    console.log('📊 System Status:');
    console.log(`  - Queues: ${(await enhancedQueueManager.getAllQueueStats()).length || 0} active`);
    console.log(`  - Workers: ${enhancedWorkerManager.getWorkers().size} running`);
    console.log(`  - Connection: ${enhancedQueueManager.getConnectionHealth().redis ? 'Connected' : 'Disconnected'}`);
    
  } catch (error) {
    console.error('❌ Failed to initialize enhanced queue system:', error);
    throw error;
  }
}

/**
 * Gracefully shutdown the complete enhanced queue system
 */
export async function shutdownQueueSystem(): Promise<void> {
  console.log('🛑 Shutting down Enhanced BullMQ Queue System...');
  
  try {
    // Shutdown workers first to stop processing new jobs
    await enhancedWorkerManager.shutdown();
    
    // Then shutdown the queue manager
    await enhancedQueueManager.shutdown();
    
    console.log('✅ Enhanced BullMQ Queue System shut down successfully');
  } catch (error) {
    console.error('❌ Error during queue system shutdown:', error);
    throw error;
  }
}

/**
 * Get comprehensive system status
 */
export async function getSystemStatus(): Promise<{
  status: 'healthy' | 'warning' | 'critical';
  queues: Record<string, any>;
  workers: any;
  connection: any;
  metrics: any;
  timestamp: string;
}> {
  try {
    // Ensure managers are available
    if (!enhancedQueueManager || !enhancedWorkerManager) {
      return {
        status: 'critical',
        queues: {},
        workers: {},
        connection: { redis: false, lastError: 'System not initialized' },
        metrics: {},
        timestamp: new Date().toISOString(),
      };
    }
    
    const queueStats = await enhancedQueueManager.getAllQueueStats();
    const connectionHealth = enhancedQueueManager.getConnectionHealth();
    const workerMetrics = enhancedWorkerManager.getMetrics();
    const systemMetrics = enhancedQueueManager.getMetrics();
    
    // Determine overall system status
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    
    if (!connectionHealth.redis) {
      status = 'critical';
    } else if (!enhancedWorkerManager.isWorkerSystemHealthy()) {
      status = 'warning';
    } else {
      // Check queue health
      for (const [queueName, stats] of Object.entries(queueStats)) {
        const totalJobs = stats.waiting + stats.active + stats.delayed;
        if (totalJobs > 5000 || stats.failed > 200) {
          status = 'critical';
          break;
        } else if (totalJobs > 1000 || stats.failed > 50) {
          status = 'warning';
        }
      }
    }
    
    return {
      status,
      queues: queueStats,
      workers: Object.fromEntries(workerMetrics),
      connection: connectionHealth,
      metrics: systemMetrics,
      timestamp: new Date().toISOString(),
    };
    
  } catch (error) {
    console.error('❌ Failed to get system status:', error);
    return {
      status: 'critical',
      queues: {},
      workers: {},
      connection: { redis: false, lastError: error.message },
      metrics: {},
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Perform immediate health check
 */
export async function performHealthCheck(): Promise<any> {
  if (!enhancedQueueManager) {
    console.warn('Queue manager not initialized');
    return { error: 'Queue manager not initialized' };
  }
  
  return enhancedQueueManager.addJob(
    'dev:system:health', // Using enhanced config queue name
    'health-check',
    {
      checkType: 'full',
      timestamp: new Date().toISOString(),
    },
    {
      priority: 1, // High priority
    }
  );
}

/**
 * Emergency system recovery
 * 
 * This function attempts to recover from critical system failures by:
 * 1. Reconnecting to Redis
 * 2. Restarting failed workers
 * 3. Clearing stuck jobs
 * 4. Running system diagnostics
 */
export async function emergencyRecovery(): Promise<void> {
  console.log('🚨 Starting emergency recovery...');
  
  try {
    // First, try to get current system status
    const status = await getSystemStatus();
    console.log('📊 Current system status:', status.status);
    
    if (status.status === 'critical') {
      console.log('🔄 Attempting system recovery...');
      
      // Try to reinitialize the queue manager
      if (enhancedQueueManager) {
        try {
          await enhancedQueueManager.shutdown();
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
          await enhancedQueueManager.initialize();
          console.log('✅ Queue manager recovered');
        } catch (error) {
          console.error('❌ Queue manager recovery failed:', error);
        }
      }
      
      // Try to restart workers
      if (enhancedWorkerManager) {
        try {
          await enhancedWorkerManager.shutdown();
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
          await enhancedWorkerManager.initialize();
          console.log('✅ Workers recovered');
        } catch (error) {
          console.error('❌ Worker recovery failed:', error);
        }
      }
      
      // Run a health check
      await performHealthCheck();
    }
    
    console.log('✅ Emergency recovery completed');
    
  } catch (error) {
    console.error('❌ Emergency recovery failed:', error);
    throw error;
  }
}

// Export the legacy queue manager for backward compatibility
export { queueManager } from './queue-manager';

// Default export for convenience
export default {
  initialize: initializeQueueSystem,
  shutdown: shutdownQueueSystem,
  getStatus: getSystemStatus,
  healthCheck: performHealthCheck,
  emergencyRecovery,
  queueManager: enhancedQueueManager,
  workerManager: enhancedWorkerManager,
};

/**
 * Common queue patterns and helper functions
 */
export const QueuePatterns = {
  /**
   * Process items in batches with delay
   */
  async processBatch<T>(
    items: T[],
    batchSize: number,
    delayMs: number,
    processor: (batch: T[]) => Promise<void>
  ): Promise<void> {
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      await processor(batch);
      
      if (i + batchSize < items.length) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  },
  
  /**
   * Rate limited processing
   */
  async processWithRateLimit<T>(
    items: T[],
    ratePerSecond: number,
    processor: (item: T) => Promise<void>
  ): Promise<void> {
    const delayMs = 1000 / ratePerSecond;
    
    for (const item of items) {
      await processor(item);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  },
  
  /**
   * Exponential backoff retry
   */
  async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxAttempts: number = 3,
    baseDelayMs: number = 1000,
    maxDelayMs: number = 30000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxAttempts) {
          throw lastError;
        }
        
        const delay = Math.min(
          baseDelayMs * Math.pow(2, attempt - 1),
          maxDelayMs
        );
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  },
};

/**
 * Queue system environment check
 */
export function checkEnvironment(): {
  valid: boolean;
  issues: string[];
  config: Record<string, any>;
} {
  const issues: string[] = [];
  
  // Check Redis configuration
  if (!process.env.REDIS_HOST && !process.env.REDIS_URL) {
    issues.push('Redis host not configured (REDIS_HOST or REDIS_URL)');
  }
  
  // Check Supabase configuration
  if (!process.env.SUPABASE_URL) {
    issues.push('Supabase URL not configured (SUPABASE_URL)');
  }
  
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    issues.push('Supabase service role key not configured (SUPABASE_SERVICE_ROLE_KEY)');
  }
  
  // Check communication service configuration
  if (!process.env.SENDGRID_API_KEY && !process.env.RESEND_API_KEY) {
    issues.push('Email service not configured (SENDGRID_API_KEY or RESEND_API_KEY)');
  }
  
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    issues.push('SMS service not configured (TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN)');
  }
  
  return {
    valid: issues.length === 0,
    issues,
    config: {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        tls: process.env.REDIS_TLS === 'true',
      },
      nodeEnv: process.env.NODE_ENV || 'development',
      queuePrefix: process.env.QUEUE_PREFIX || (process.env.NODE_ENV === 'production' ? 'prod' : 'dev'),
    },
  };
}