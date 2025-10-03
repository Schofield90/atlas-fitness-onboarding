import { Worker } from 'bullmq';
import { enhancedQueueManager } from './enhanced-queue-manager';
import { QUEUE_NAMES, JOB_TYPES, MONITORING_CONFIG } from './enhanced-config';

// Import processors
import { processWorkflowTrigger } from './processors/workflow-trigger-processor';
import { processWorkflowExecution } from './processors/enhanced-workflow-execution-processor';
import { processNodeExecution } from './processors/enhanced-action-processors';
import { 
  processEmailJob, 
  processSMSJob, 
  processWhatsAppJob, 
  processBulkEmailJob, 
  processBulkSMSJob 
} from './processors/communication-processors';
import { 
  processTrackExecution, 
  processTrackPerformance, 
  processUpdateStats, 
  processGenerateReport 
} from './processors/analytics-processor';
import { 
  processRetryFailed, 
  processHandleError, 
  processEscalateError 
} from './processors/retry-processor';
import { processHealthCheck } from './monitoring/health-monitor';

interface WorkerMetrics {
  processed: number;
  failed: number;
  active: number;
  waiting: number;
  startTime: Date;
}

export class EnhancedWorkerManager {
  private static instance: EnhancedWorkerManager;
  private workers: Map<string, Worker> = new Map();
  private metrics: Map<string, WorkerMetrics> = new Map();
  private isInitialized: boolean = false;
  private isShuttingDown: boolean = false;
  private metricsInterval: NodeJS.Timeout | null = null;

  private constructor() {}

  static getInstance(): EnhancedWorkerManager {
    if (!EnhancedWorkerManager.instance) {
      EnhancedWorkerManager.instance = new EnhancedWorkerManager();
    }
    return EnhancedWorkerManager.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('⚠️  Enhanced workers already initialized');
      return;
    }

    console.log('🚀 Initializing enhanced worker system...');

    try {
      // Initialize queue manager first
      await enhancedQueueManager.initialize();

      // Register all workers
      await this.registerAllWorkers();

      // Start metrics collection
      this.startMetricsCollection();

      // Set up graceful shutdown handlers
      this.setupGracefulShutdown();

      this.isInitialized = true;
      
      console.log(`✅ Enhanced worker system initialized with ${this.workers.size} workers`);
      
      // Log initial metrics
      await this.logWorkerMetrics();
      
    } catch (error) {
      console.error('❌ Failed to initialize enhanced worker system:', error);
      throw error;
    }
  }

  private async registerAllWorkers(): Promise<void> {
    const workerRegistrations = [
      // Workflow workers
      {
        queueName: QUEUE_NAMES.WORKFLOW_TRIGGERS,
        workerName: 'workflow-triggers',
        processor: this.createTriggerProcessor(),
      },
      {
        queueName: QUEUE_NAMES.WORKFLOW_ACTIONS,
        workerName: 'workflow-actions',
        processor: this.createActionProcessor(),
      },
      {
        queueName: QUEUE_NAMES.WORKFLOW_SCHEDULED,
        workerName: 'workflow-scheduled',
        processor: this.createScheduledProcessor(),
      },
      {
        queueName: QUEUE_NAMES.WORKFLOW_WAIT,
        workerName: 'workflow-wait',
        processor: this.createWaitProcessor(),
      },

      // Communication workers
      {
        queueName: QUEUE_NAMES.EMAIL_QUEUE,
        workerName: 'email-processor',
        processor: this.createEmailProcessor(),
      },
      {
        queueName: QUEUE_NAMES.SMS_QUEUE,
        workerName: 'sms-processor',
        processor: this.createSMSProcessor(),
      },
      {
        queueName: QUEUE_NAMES.WHATSAPP_QUEUE,
        workerName: 'whatsapp-processor',
        processor: this.createWhatsAppProcessor(),
      },

      // Analytics workers
      {
        queueName: QUEUE_NAMES.WORKFLOW_ANALYTICS,
        workerName: 'analytics-processor',
        processor: this.createAnalyticsProcessor(),
      },

      // System workers
      {
        queueName: QUEUE_NAMES.HEALTH_CHECKS,
        workerName: 'health-monitor',
        processor: this.createHealthProcessor(),
      },
      {
        queueName: QUEUE_NAMES.RETRY_QUEUE,
        workerName: 'retry-processor',
        processor: this.createRetryProcessor(),
      },
      {
        queueName: QUEUE_NAMES.DEAD_LETTER,
        workerName: 'dead-letter-processor',
        processor: this.createDeadLetterProcessor(),
      },

      // Cleanup worker
      {
        queueName: QUEUE_NAMES.WORKFLOW_CLEANUP,
        workerName: 'cleanup-processor',
        processor: this.createCleanupProcessor(),
      },
    ];

    // Register workers in parallel
    const registrationPromises = workerRegistrations.map(async ({ queueName, workerName, processor }) => {
      try {
        const worker = enhancedQueueManager.registerWorker(queueName, processor);
        this.workers.set(workerName, worker);
        
        // Initialize metrics for this worker
        this.metrics.set(workerName, {
          processed: 0,
          failed: 0,
          active: 0,
          waiting: 0,
          startTime: new Date(),
        });
        
        // Set up worker event handlers
        this.setupWorkerEventHandlers(worker, workerName);
        
        console.log(`✅ Registered worker: ${workerName} for queue: ${queueName}`);
      } catch (error) {
        console.error(`❌ Failed to register worker ${workerName}:`, error);
        throw error;
      }
    });

    await Promise.all(registrationPromises);
  }

  private createTriggerProcessor() {
    return async (job: any) => {
      const startTime = Date.now();
      try {
        switch (job.name) {
          case JOB_TYPES.PROCESS_TRIGGER:
            return await processWorkflowTrigger(job);
          case JOB_TYPES.EVALUATE_TRIGGER:
            return await this.processEvaluateTrigger(job);
          case JOB_TYPES.BATCH_TRIGGER:
            return await this.processBatchTrigger(job);
          default:
            throw new Error(`Unknown trigger job type: ${job.name}`);
        }
      } finally {
        this.trackProcessingTime('workflow-triggers', Date.now() - startTime);
      }
    };
  }

  private createActionProcessor() {
    return async (job: any) => {
      const startTime = Date.now();
      try {
        switch (job.name) {
          case JOB_TYPES.EXECUTE_WORKFLOW:
            return await processWorkflowExecution(job);
          case JOB_TYPES.EXECUTE_NODE:
            return await processNodeExecution(job);
          case JOB_TYPES.EXECUTE_BRANCH:
            return await this.processExecuteBranch(job);
          default:
            throw new Error(`Unknown action job type: ${job.name}`);
        }
      } finally {
        this.trackProcessingTime('workflow-actions', Date.now() - startTime);
      }
    };
  }

  private createScheduledProcessor() {
    return async (job: any) => {
      const startTime = Date.now();
      try {
        // Handle scheduled workflow executions
        return await processWorkflowExecution(job);
      } finally {
        this.trackProcessingTime('workflow-scheduled', Date.now() - startTime);
      }
    };
  }

  private createWaitProcessor() {
    return async (job: any) => {
      const startTime = Date.now();
      try {
        switch (job.name) {
          case JOB_TYPES.WAIT_DELAY:
            return await this.processWaitDelay(job);
          case JOB_TYPES.WAIT_CONDITION:
            return await this.processWaitCondition(job);
          default:
            throw new Error(`Unknown wait job type: ${job.name}`);
        }
      } finally {
        this.trackProcessingTime('workflow-wait', Date.now() - startTime);
      }
    };
  }

  private createEmailProcessor() {
    return async (job: any) => {
      const startTime = Date.now();
      try {
        switch (job.name) {
          case JOB_TYPES.SEND_EMAIL:
            return await processEmailJob(job);
          case JOB_TYPES.BULK_EMAIL:
            return await processBulkEmailJob(job);
          default:
            throw new Error(`Unknown email job type: ${job.name}`);
        }
      } finally {
        this.trackProcessingTime('email-processor', Date.now() - startTime);
      }
    };
  }

  private createSMSProcessor() {
    return async (job: any) => {
      const startTime = Date.now();
      try {
        switch (job.name) {
          case JOB_TYPES.SEND_SMS:
            return await processSMSJob(job);
          case JOB_TYPES.BULK_SMS:
            return await processBulkSMSJob(job);
          default:
            throw new Error(`Unknown SMS job type: ${job.name}`);
        }
      } finally {
        this.trackProcessingTime('sms-processor', Date.now() - startTime);
      }
    };
  }

  private createWhatsAppProcessor() {
    return async (job: any) => {
      const startTime = Date.now();
      try {
        switch (job.name) {
          case JOB_TYPES.SEND_WHATSAPP:
            return await processWhatsAppJob(job);
          default:
            throw new Error(`Unknown WhatsApp job type: ${job.name}`);
        }
      } finally {
        this.trackProcessingTime('whatsapp-processor', Date.now() - startTime);
      }
    };
  }

  private createAnalyticsProcessor() {
    return async (job: any) => {
      const startTime = Date.now();
      try {
        switch (job.name) {
          case JOB_TYPES.TRACK_EXECUTION:
            return await processTrackExecution(job);
          case JOB_TYPES.TRACK_PERFORMANCE:
            return await processTrackPerformance(job);
          case JOB_TYPES.UPDATE_STATS:
            return await processUpdateStats(job);
          case JOB_TYPES.GENERATE_REPORT:
            return await processGenerateReport(job);
          default:
            console.log(`📊 Generic analytics job: ${job.name}`, job.data);
            return { processed: true };
        }
      } finally {
        this.trackProcessingTime('analytics-processor', Date.now() - startTime);
      }
    };
  }

  private createHealthProcessor() {
    return async (job: any) => {
      const startTime = Date.now();
      try {
        switch (job.name) {
          case JOB_TYPES.HEALTH_CHECK:
            return await processHealthCheck(job);
          default:
            throw new Error(`Unknown health job type: ${job.name}`);
        }
      } finally {
        this.trackProcessingTime('health-monitor', Date.now() - startTime);
      }
    };
  }

  private createRetryProcessor() {
    return async (job: any) => {
      const startTime = Date.now();
      try {
        switch (job.name) {
          case JOB_TYPES.RETRY_FAILED:
            return await processRetryFailed(job);
          case JOB_TYPES.HANDLE_ERROR:
            return await processHandleError(job);
          case JOB_TYPES.ESCALATE_ERROR:
            return await processEscalateError(job);
          default:
            throw new Error(`Unknown retry job type: ${job.name}`);
        }
      } finally {
        this.trackProcessingTime('retry-processor', Date.now() - startTime);
      }
    };
  }

  private createDeadLetterProcessor() {
    return async (job: any) => {
      const startTime = Date.now();
      try {
        console.error('💀 Dead letter job:', {
          jobId: job.id,
          jobName: job.name,
          data: job.data,
          timestamp: new Date().toISOString(),
        });
        
        // TODO: Implement dead letter job handling
        // - Log to monitoring system
        // - Send alerts to administrators  
        // - Attempt manual recovery if possible
        
        return { processed: true, status: 'dead_letter' };
      } finally {
        this.trackProcessingTime('dead-letter-processor', Date.now() - startTime);
      }
    };
  }

  private createCleanupProcessor() {
    return async (job: any) => {
      const startTime = Date.now();
      try {
        switch (job.name) {
          case JOB_TYPES.CLEANUP_OLD_EXECUTIONS:
            return await this.processCleanupOldExecutions(job);
          case JOB_TYPES.ARCHIVE_COMPLETED:
            return await this.processArchiveCompleted(job);
          default:
            throw new Error(`Unknown cleanup job type: ${job.name}`);
        }
      } finally {
        this.trackProcessingTime('cleanup-processor', Date.now() - startTime);
      }
    };
  }

  private setupWorkerEventHandlers(worker: Worker, workerName: string) {
    const metrics = this.metrics.get(workerName)!;

    worker.on('completed', (job) => {
      metrics.processed++;
      console.log(`✅ ${workerName} completed job ${job.id}`);
    });

    worker.on('failed', (job, err) => {
      metrics.failed++;
      console.error(`❌ ${workerName} failed job ${job?.id}:`, err);
    });

    worker.on('active', (job) => {
      metrics.active++;
      console.log(`🔄 ${workerName} started job ${job.id}`);
    });

    worker.on('waiting', () => {
      metrics.waiting++;
    });

    worker.on('stalled', (jobId) => {
      console.warn(`⚠️  ${workerName} job ${jobId} stalled`);
    });

    worker.on('error', (err) => {
      console.error(`❌ ${workerName} worker error:`, err);
    });
  }

  private startMetricsCollection() {
    console.log('📊 Starting worker metrics collection...');
    
    this.metricsInterval = setInterval(async () => {
      if (this.isShuttingDown) return;
      
      try {
        await this.logWorkerMetrics();
      } catch (error) {
        console.error('❌ Worker metrics collection failed:', error);
      }
    }, 60000); // Every minute
  }

  private async logWorkerMetrics() {
    const summary = {
      timestamp: new Date().toISOString(),
      workers: Object.fromEntries(this.metrics),
      system: {
        totalWorkers: this.workers.size,
        totalProcessed: Array.from(this.metrics.values()).reduce((sum, m) => sum + m.processed, 0),
        totalFailed: Array.from(this.metrics.values()).reduce((sum, m) => sum + m.failed, 0),
        uptime: process.uptime(),
      },
    };
    
    console.log('📊 Worker Metrics:', summary);
    
    // Track performance metrics
    await enhancedQueueManager.addJob(
      QUEUE_NAMES.WORKFLOW_ANALYTICS,
      JOB_TYPES.TRACK_PERFORMANCE,
      {
        organizationId: 'system',
        component: 'worker-manager',
        operation: 'metrics_collection',
        duration: 0, // Metrics collection is instantaneous
        success: true,
        metadata: summary,
        timestamp: new Date().toISOString(),
      }
    ).catch(() => {}); // Don't fail if analytics is down
  }

  private trackProcessingTime(workerName: string, processingTime: number) {
    // Track job processing time for performance monitoring
    if (Math.random() < MONITORING_CONFIG.PERFORMANCE_SAMPLE_RATE) {
      enhancedQueueManager.addJob(
        QUEUE_NAMES.WORKFLOW_ANALYTICS,
        JOB_TYPES.TRACK_PERFORMANCE,
        {
          organizationId: 'system',
          component: workerName,
          operation: 'job_processing',
          duration: processingTime,
          success: true,
          timestamp: new Date().toISOString(),
        }
      ).catch(() => {}); // Don't fail if analytics is down
    }
  }

  private setupGracefulShutdown() {
    const shutdownHandler = async (signal: string) => {
      console.log(`🛑 Received ${signal}, initiating graceful shutdown...`);
      await this.shutdown();
      process.exit(0);
    };

    // Handle various shutdown signals
    process.on('SIGTERM', () => shutdownHandler('SIGTERM'));
    process.on('SIGINT', () => shutdownHandler('SIGINT'));
    process.on('SIGUSR2', () => shutdownHandler('SIGUSR2')); // Nodemon restart
    
    // Handle uncaught exceptions and rejections
    process.on('uncaughtException', async (error) => {
      console.error('💥 Uncaught Exception:', error);
      await this.emergencyShutdown();
      process.exit(1);
    });

    process.on('unhandledRejection', async (reason, promise) => {
      console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
      await this.emergencyShutdown();
      process.exit(1);
    });
  }

  async shutdown(): Promise<void> {
    if (this.isShuttingDown) {
      console.log('🔄 Shutdown already in progress...');
      return;
    }

    console.log('🛑 Starting graceful shutdown of enhanced worker system...');
    this.isShuttingDown = true;

    // Stop metrics collection
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }

    // Log final metrics
    try {
      await this.logWorkerMetrics();
    } catch (error) {
      console.error('❌ Failed to log final metrics:', error);
    }

    // Gracefully close all workers
    const workerClosePromises = Array.from(this.workers.entries()).map(async ([name, worker]) => {
      try {
        console.log(`🔄 Closing worker: ${name}`);
        await worker.close();
        console.log(`✅ Worker ${name} closed gracefully`);
      } catch (error) {
        console.error(`❌ Error closing worker ${name}:`, error);
      }
    });

    // Wait for all workers to close with timeout
    try {
      await Promise.race([
        Promise.allSettled(workerClosePromises),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Worker shutdown timeout')), 30000)
        )
      ]);
    } catch (error) {
      console.error('⚠️  Some workers did not shut down gracefully:', error);
    }

    // Shutdown the enhanced queue manager
    try {
      await enhancedQueueManager.shutdown();
    } catch (error) {
      console.error('❌ Error shutting down queue manager:', error);
    }

    // Clear worker references
    this.workers.clear();
    this.metrics.clear();
    this.isInitialized = false;

    console.log('✅ Enhanced worker system shutdown complete');
  }

  async emergencyShutdown(): Promise<void> {
    console.log('🚨 Emergency shutdown initiated...');
    this.isShuttingDown = true;

    // Force close all workers immediately
    const emergencyClosePromises = Array.from(this.workers.values()).map(worker => 
      worker.close(true) // Force close
    );

    try {
      await Promise.race([
        Promise.allSettled(emergencyClosePromises),
        new Promise(resolve => setTimeout(resolve, 5000)) // 5 second timeout
      ]);
    } catch (error) {
      console.error('❌ Emergency shutdown error:', error);
    }

    // Emergency shutdown of queue manager
    try {
      await enhancedQueueManager.shutdown();
    } catch (error) {
      console.error('❌ Emergency queue manager shutdown error:', error);
    }

    console.log('🚨 Emergency shutdown complete');
  }

  // Additional processor methods
  private async processEvaluateTrigger(job: any): Promise<any> {
    // Implementation for trigger evaluation
    return { evaluated: true };
  }

  private async processBatchTrigger(job: any): Promise<any> {
    // Implementation for batch trigger processing
    return { processed: true };
  }

  private async processExecuteBranch(job: any): Promise<any> {
    // Implementation for branch execution
    return { executed: true };
  }

  private async processWaitDelay(job: any): Promise<any> {
    // Implementation for delay processing
    return { waited: true };
  }

  private async processWaitCondition(job: any): Promise<any> {
    // Implementation for condition waiting
    return { conditionMet: true };
  }

  private async processCleanupOldExecutions(job: any): Promise<any> {
    // Implementation for cleanup
    return { cleaned: true };
  }

  private async processArchiveCompleted(job: any): Promise<any> {
    // Implementation for archiving
    return { archived: true };
  }

  // Public getters
  getWorkers(): Map<string, Worker> {
    return new Map(this.workers);
  }

  getMetrics(): Map<string, WorkerMetrics> {
    return new Map(this.metrics);
  }

  isWorkerSystemHealthy(): boolean {
    return this.isInitialized && !this.isShuttingDown && this.workers.size > 0;
  }
}

// Export singleton instance with lazy initialization
let _instance: EnhancedWorkerManager | null = null;

export const getEnhancedWorkerManager = () => {
  if (!_instance) {
    _instance = EnhancedWorkerManager.getInstance();
  }
  return _instance;
};

// For backward compatibility, export as enhancedWorkerManager
export const enhancedWorkerManager = new Proxy({} as EnhancedWorkerManager, {
  get(target, prop, receiver) {
    const instance = getEnhancedWorkerManager();
    return Reflect.get(instance, prop, instance);
  }
});

// Export convenience methods
export async function startEnhancedWorkers(): Promise<void> {
  return getEnhancedWorkerManager().initialize();
}

export async function stopEnhancedWorkers(): Promise<void> {
  return getEnhancedWorkerManager().shutdown();
}