// Comprehensive Worker Implementation for Atlas Fitness Automation Engine

// Skip Redis imports during build
const isBuildTime = process.env.NODE_ENV === 'production' && process.env.VERCEL

let Worker: any = null
let QueueEvents: any = null
let Redis: any = null

if (!isBuildTime) {
  try {
    const bullmq = require('bullmq')
    Worker = bullmq.Worker
    QueueEvents = bullmq.QueueEvents
    Redis = require('ioredis')
  } catch (error) {
    console.warn('BullMQ/Redis not available for workers:', error)
  }
}

import { createClient } from '@/app/lib/supabase/server'
import { JobProcessorFactory } from './job-processors'
import { 
  workflowQueue, 
  priorityQueue, 
  delayedQueue, 
  redisConnection,
  JobType,
  JobData,
  JobPriority 
} from './queue'

// Worker Configuration Interface
export interface WorkerConfig {
  name: string
  queueName: string
  concurrency: number
  rateLimiter?: {
    max: number
    duration: number
  }
  settings: {
    stalledInterval: number
    maxStalledCount: number
    retryProcessDelay?: number
  }
  processor: (job: any) => Promise<any>
}

// Worker Health Status
export interface WorkerHealth {
  name: string
  status: 'healthy' | 'warning' | 'critical' | 'stopped'
  isRunning: boolean
  isPaused: boolean
  jobsProcessed: number
  jobsFailed: number
  lastJobProcessed?: string
  lastError?: string
  uptime: number
  memoryUsage: NodeJS.MemoryUsage
}

// Enhanced Worker Manager
export class WorkerManager {
  private workers: Map<string, any> = new Map()
  private workerStats: Map<string, any> = new Map()
  private startTime: number = Date.now()
  private healthCheckInterval?: NodeJS.Timeout
  private metricsInterval?: NodeJS.Timeout

  constructor() {
    this.setupHealthChecks()
    this.setupMetricsCollection()
  }

  // Start all workers
  async startAll(): Promise<void> {
    if (!Worker || !redisConnection) {
      console.warn('Cannot start workers - Redis not configured')
      return
    }

    console.log('🚀 Starting Atlas Fitness automation workers...')

    try {
      // Start workflow execution worker
      await this.startWorkflowWorker()
      
      // Start priority execution worker
      await this.startPriorityWorker()
      
      // Start delayed action worker
      await this.startDelayedActionWorker()
      
      // Start dead letter queue worker
      await this.startDeadLetterWorker()

      console.log(`✅ All workers started successfully (${this.workers.size} workers)`)
      
      // Setup graceful shutdown
      this.setupGracefulShutdown()
      
    } catch (error) {
      console.error('❌ Failed to start workers:', error)
      throw error
    }
  }

  // Stop all workers
  async stopAll(): Promise<void> {
    console.log('🛑 Stopping all workers...')

    const closePromises = Array.from(this.workers.values()).map(async (worker) => {
      try {
        await worker.close()
        console.log(`✅ Worker ${worker.name} stopped`)
      } catch (error) {
        console.error(`❌ Error stopping worker ${worker.name}:`, error)
      }
    })

    await Promise.all(closePromises)
    
    // Clear intervals
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
    }
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval)
    }

    this.workers.clear()
    this.workerStats.clear()

    console.log('✅ All workers stopped')
  }

  // Start workflow execution worker
  private async startWorkflowWorker(): Promise<void> {
    const config: WorkerConfig = {
      name: 'workflow-execution',
      queueName: 'workflow-execution',
      concurrency: parseInt(process.env.WORKFLOW_WORKER_CONCURRENCY || '5'),
      rateLimiter: {
        max: 50,
        duration: 60000 // 50 jobs per minute
      },
      settings: {
        stalledInterval: 30000,
        maxStalledCount: 1,
        retryProcessDelay: 5000
      },
      processor: this.createJobProcessor('workflow-execution')
    }

    const worker = this.createWorker(config)
    this.workers.set(config.name, worker)
    
    console.log(`✅ Workflow execution worker started (concurrency: ${config.concurrency})`)
  }

  // Start priority execution worker
  private async startPriorityWorker(): Promise<void> {
    const config: WorkerConfig = {
      name: 'priority-execution',
      queueName: 'priority-execution',
      concurrency: parseInt(process.env.PRIORITY_WORKER_CONCURRENCY || '3'),
      rateLimiter: {
        max: 30,
        duration: 60000 // 30 jobs per minute
      },
      settings: {
        stalledInterval: 15000,
        maxStalledCount: 2,
        retryProcessDelay: 2000
      },
      processor: this.createJobProcessor('priority-execution')
    }

    const worker = this.createWorker(config)
    this.workers.set(config.name, worker)
    
    console.log(`✅ Priority execution worker started (concurrency: ${config.concurrency})`)
  }

  // Start delayed action worker
  private async startDelayedActionWorker(): Promise<void> {
    const config: WorkerConfig = {
      name: 'delayed-action',
      queueName: 'delayed-action',
      concurrency: parseInt(process.env.DELAYED_WORKER_CONCURRENCY || '10'),
      settings: {
        stalledInterval: 60000,
        maxStalledCount: 1,
        retryProcessDelay: 10000
      },
      processor: this.createDelayedActionProcessor()
    }

    const worker = this.createWorker(config)
    this.workers.set(config.name, worker)
    
    console.log(`✅ Delayed action worker started (concurrency: ${config.concurrency})`)
  }

  // Start dead letter queue worker
  private async startDeadLetterWorker(): Promise<void> {
    // Dead letter queue functionality is not implemented yet
    console.warn('Dead letter queue not available - skipping DLQ worker')
    return

    const config: WorkerConfig = {
      name: 'dead-letter',
      queueName: 'dead-letter',
      concurrency: parseInt(process.env.DLQ_WORKER_CONCURRENCY || '2'),
      settings: {
        stalledInterval: 120000,
        maxStalledCount: 3,
        retryProcessDelay: 30000
      },
      processor: this.createDeadLetterProcessor()
    }

    const worker = this.createWorker(config)
    this.workers.set(config.name, worker)
    
    console.log(`✅ Dead letter queue worker started (concurrency: ${config.concurrency})`)
  }

  // Create a worker with comprehensive configuration
  private createWorker(config: WorkerConfig): any {
    const worker = new Worker(
      config.queueName,
      config.processor,
      {
        connection: redisConnection,
        concurrency: config.concurrency,
        limiter: config.rateLimiter,
        settings: {
          stalledInterval: config.settings.stalledInterval,
          maxStalledCount: config.settings.maxStalledCount,
          retryProcessDelay: config.settings.retryProcessDelay || 5000,
        },
        // Additional settings for production
        removeOnComplete: {
          count: 100,
          age: 24 * 3600 // 24 hours
        },
        removeOnFail: {
          count: 50,
          age: 7 * 24 * 3600 // 7 days
        }
      }
    )

    // Initialize worker stats
    this.workerStats.set(config.name, {
      jobsProcessed: 0,
      jobsFailed: 0,
      jobsActive: 0,
      lastJobProcessed: null,
      lastError: null,
      startTime: Date.now()
    })

    // Setup enhanced event handlers
    this.setupWorkerEvents(worker, config.name)

    return worker
  }

  // Create job processor for workflow and priority queues
  private createJobProcessor(queueType: string) {
    return async (job: any) => {
      const startTime = Date.now()
      const workerStats = this.workerStats.get(queueType)
      
      if (workerStats) {
        workerStats.jobsActive++
      }

      try {
        console.log(`🔄 [${queueType}] Processing job:`, {
          jobId: job.id,
          type: job.name,
          attempt: job.attemptsMade + 1,
          priority: job.opts.priority,
          data: job.data?.type || 'unknown'
        })

        // Validate job data
        if (!job.data || !job.data.type) {
          throw new Error('Invalid job data: missing job type')
        }

        // Update job progress
        await job.updateProgress(10)

        // Process job using appropriate processor
        const result = await JobProcessorFactory.processJob(job.data as JobData)

        // Update job progress
        await job.updateProgress(100)

        const processingTime = Date.now() - startTime

        // Update worker stats
        if (workerStats) {
          workerStats.jobsProcessed++
          workerStats.jobsActive--
          workerStats.lastJobProcessed = new Date().toISOString()
        }

        console.log(`✅ [${queueType}] Job completed:`, {
          jobId: job.id,
          type: job.name,
          processingTime: `${processingTime}ms`,
          attempt: job.attemptsMade + 1
        })

        return result

      } catch (error) {
        const processingTime = Date.now() - startTime

        // Update worker stats
        if (workerStats) {
          workerStats.jobsFailed++
          workerStats.jobsActive--
          workerStats.lastError = error.message
        }

        console.error(`❌ [${queueType}] Job failed:`, {
          jobId: job.id,
          type: job.name,
          error: error.message,
          processingTime: `${processingTime}ms`,
          attempt: job.attemptsMade + 1,
          willRetry: job.attemptsMade < (job.opts.attempts - 1)
        })

        // Log error details for debugging
        await this.logJobError(job, error, queueType)

        throw error
      }
    }
  }

  // Create delayed action processor
  private createDelayedActionProcessor() {
    return async (job: any) => {
      const startTime = Date.now()
      const workerStats = this.workerStats.get('delayed-action')

      if (workerStats) {
        workerStats.jobsActive++
      }

      try {
        const { executionId, nodeId, resumeData, workflowId, organizationId } = job.data

        console.log(`⏰ [delayed-action] Resuming execution:`, {
          jobId: job.id,
          executionId,
          nodeId,
          workflowId,
          delayedFor: Date.now() - job.timestamp
        })

        // Validate execution still exists and is resumable
        const supabase = await createClient()
        const { data: execution, error } = await supabase
          .from('workflow_executions')
          .select('id, status, workflow_id, organization_id')
          .eq('id', executionId)
          .single()

        if (error || !execution) {
          throw new Error(`Execution not found for resume: ${executionId}`)
        }

        if (execution.status === 'cancelled') {
          console.log(`⏰ Skipping cancelled execution: ${executionId}`)
          return { skipped: true, reason: 'execution_cancelled' }
        }

        // Import WorkflowExecutor here to avoid circular dependencies
        const { WorkflowExecutor } = await import('./executor')
        
        // Resume execution
        const executor = await WorkflowExecutor.resume(executionId, nodeId, resumeData)
        const result = await executor.continue()

        const processingTime = Date.now() - startTime

        // Update worker stats
        if (workerStats) {
          workerStats.jobsProcessed++
          workerStats.jobsActive--
          workerStats.lastJobProcessed = new Date().toISOString()
        }

        console.log(`✅ [delayed-action] Execution resumed:`, {
          jobId: job.id,
          executionId,
          processingTime: `${processingTime}ms`
        })

        return result

      } catch (error) {
        const processingTime = Date.now() - startTime

        // Update worker stats
        if (workerStats) {
          workerStats.jobsFailed++
          workerStats.jobsActive--
          workerStats.lastError = error.message
        }

        console.error(`❌ [delayed-action] Job failed:`, {
          jobId: job.id,
          error: error.message,
          processingTime: `${processingTime}ms`
        })

        await this.logJobError(job, error, 'delayed-action')
        throw error
      }
    }
  }

  // Create dead letter queue processor
  private createDeadLetterProcessor() {
    return async (job: any) => {
      const startTime = Date.now()
      const workerStats = this.workerStats.get('dead-letter')

      if (workerStats) {
        workerStats.jobsActive++
      }

      try {
        const { originalJob, error, failedAt, attempts } = job.data

        console.log(`💀 [dead-letter] Processing failed job:`, {
          jobId: job.id,
          originalJobId: originalJob?.id,
          originalJobType: originalJob?.name,
          error: error?.message,
          attempts,
          failedAt
        })

        // Log dead letter job for analysis
        await this.logDeadLetterJob(originalJob, error)

        // Notify administrators if enabled
        if (process.env.ENABLE_DLQ_NOTIFICATIONS === 'true') {
          await this.notifyAdministrators(originalJob, error)
        }

        // Check if job can be automatically recovered
        const canRecover = await this.canRecoverJob(originalJob, error)
        if (canRecover) {
          console.log(`💀 Attempting to recover job: ${originalJob?.id}`)
          await this.attemptJobRecovery(originalJob)
        }

        const processingTime = Date.now() - startTime

        // Update worker stats
        if (workerStats) {
          workerStats.jobsProcessed++
          workerStats.jobsActive--
          workerStats.lastJobProcessed = new Date().toISOString()
        }

        console.log(`✅ [dead-letter] Job processed:`, {
          jobId: job.id,
          processingTime: `${processingTime}ms`,
          recovered: canRecover
        })

        return {
          processed: true,
          originalJobId: originalJob?.id,
          recovered: canRecover,
          timestamp: new Date().toISOString()
        }

      } catch (error) {
        const processingTime = Date.now() - startTime

        // Update worker stats
        if (workerStats) {
          workerStats.jobsFailed++
          workerStats.jobsActive--
          workerStats.lastError = error.message
        }

        console.error(`❌ [dead-letter] Job failed:`, {
          jobId: job.id,
          error: error.message,
          processingTime: `${processingTime}ms`
        })

        throw error
      }
    }
  }

  // Setup comprehensive worker event handlers
  private setupWorkerEvents(worker: any, workerName: string): void {
    worker.on('ready', () => {
      console.log(`🟢 [${workerName}] Worker ready`)
    })

    worker.on('active', (job: any) => {
      console.log(`🔄 [${workerName}] Job started:`, {
        jobId: job.id,
        type: job.name,
        attempt: job.attemptsMade + 1,
        priority: job.opts.priority
      })
    })

    worker.on('completed', (job: any, result: any) => {
      console.log(`✅ [${workerName}] Job completed:`, {
        jobId: job.id,
        type: job.name,
        duration: Date.now() - job.processedOn,
        attempts: job.attemptsMade + 1
      })
    })

    worker.on('failed', (job: any, err: Error) => {
      const willRetry = job?.attemptsMade < (job?.opts.attempts - 1)
      
      console.error(`❌ [${workerName}] Job failed:`, {
        jobId: job?.id,
        type: job?.name,
        error: err.message,
        attempts: job?.attemptsMade + 1,
        maxAttempts: job?.opts.attempts,
        willRetry
      })
    })

    worker.on('stalled', (jobId: string) => {
      console.warn(`⚠️  [${workerName}] Job stalled: ${jobId}`)
    })

    worker.on('progress', (job: any, progress: any) => {
      console.log(`📊 [${workerName}] Job progress:`, {
        jobId: job.id,
        type: job.name,
        progress: typeof progress === 'object' ? progress : `${progress}%`
      })
    })

    worker.on('error', (err: Error) => {
      console.error(`❌ [${workerName}] Worker error:`, err)
      
      // Update worker stats
      const stats = this.workerStats.get(workerName)
      if (stats) {
        stats.lastError = err.message
      }
    })

    worker.on('paused', () => {
      console.log(`⏸️  [${workerName}] Worker paused`)
    })

    worker.on('resumed', () => {
      console.log(`▶️  [${workerName}] Worker resumed`)
    })

    worker.on('closing', () => {
      console.log(`🔴 [${workerName}] Worker closing`)
    })

    worker.on('closed', () => {
      console.log(`⚫ [${workerName}] Worker closed`)
    })
  }

  // Log job errors for debugging
  private async logJobError(job: any, error: Error, queueType: string): Promise<void> {
    try {
      const supabase = await createClient()
      
      await supabase
        .from('worker_error_logs')
        .insert({
          queue_type: queueType,
          job_id: job.id,
          job_name: job.name,
          job_data: job.data,
          error_message: error.message,
          error_stack: error.stack,
          attempt: job.attemptsMade + 1,
          max_attempts: job.opts.attempts,
          created_at: new Date().toISOString()
        })
        
    } catch (logError) {
      console.error('Failed to log worker error:', logError)
    }
  }

  // Log dead letter jobs for analysis
  private async logDeadLetterJob(originalJob: any, error: any): Promise<void> {
    try {
      const supabase = await createClient()
      
      await supabase
        .from('dead_letter_jobs')
        .insert({
          original_job_id: originalJob?.id,
          job_name: originalJob?.name,
          job_data: originalJob?.data,
          queue_name: originalJob?.queueName,
          error_message: error?.message,
          error_stack: error?.stack,
          attempts_made: originalJob?.attemptsMade,
          failed_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        })
        
    } catch (logError) {
      console.error('Failed to log dead letter job:', logError)
    }
  }

  // Notify administrators of critical failures
  private async notifyAdministrators(originalJob: any, error: any): Promise<void> {
    try {
      console.warn('🚨 Critical job failure - Administrator notification triggered:', {
        jobId: originalJob?.id,
        jobType: originalJob?.name,
        error: error?.message
      })

      // Here you could implement various notification methods:
      // - Email alerts
      // - Slack notifications  
      // - SMS alerts for critical failures
      // - Dashboard alerts
      
      // Example notification logic could go here
      
    } catch (notifyError) {
      console.error('Failed to notify administrators:', notifyError)
    }
  }

  // Check if a job can be automatically recovered
  private async canRecoverJob(originalJob: any, error: any): Promise<boolean> {
    // Define recovery criteria
    const recoverableErrors = [
      /timeout/i,
      /connection/i,
      /rate limit/i,
      /temporary/i,
      /service unavailable/i
    ]

    const errorMessage = error?.message || ''
    const isRecoverableError = recoverableErrors.some(pattern => pattern.test(errorMessage))
    
    // Don't recover jobs that have been tried too many times recently
    const maxRecoveryAttempts = 2
    const recoveryWindow = 24 * 60 * 60 * 1000 // 24 hours
    
    // Check recovery history (this would need to be implemented)
    // const recoveryCount = await this.getRecoveryCount(originalJob?.id, recoveryWindow)
    
    return isRecoverableError // && recoveryCount < maxRecoveryAttempts
  }

  // Attempt to recover a failed job
  private async attemptJobRecovery(originalJob: any): Promise<void> {
    try {
      // Add job back to appropriate queue with modified parameters
      const jobData = originalJob?.data
      if (!jobData) return

      // Determine target queue based on job type
      let targetQueue = workflowQueue
      if (originalJob?.opts?.priority <= JobPriority.HIGH) {
        targetQueue = priorityQueue
      }

      if (!targetQueue) {
        console.warn('No target queue available for job recovery')
        return
      }

      // Re-enqueue with recovery metadata
      await targetQueue.add(
        originalJob.name,
        {
          ...jobData,
          metadata: {
            ...jobData.metadata,
            isRecovery: true,
            originalJobId: originalJob.id,
            recoveryAttempt: 1,
            recoveredAt: new Date().toISOString()
          }
        },
        {
          priority: JobPriority.HIGH, // Higher priority for recovered jobs
          delay: 60000, // Wait 1 minute before retry
          attempts: 2, // Fewer attempts for recovered jobs
        }
      )

      console.log(`💀 Job recovery attempted for: ${originalJob?.id}`)
      
    } catch (recoveryError) {
      console.error('Failed to recover job:', recoveryError)
    }
  }

  // Setup health checks
  private setupHealthChecks(): void {
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck()
    }, 60000) // Every minute
  }

  // Setup metrics collection
  private setupMetricsCollection(): void {
    this.metricsInterval = setInterval(async () => {
      await this.collectMetrics()
    }, 30000) // Every 30 seconds
  }

  // Perform health check on all workers
  private async performHealthCheck(): Promise<void> {
    try {
      const healthStatuses: WorkerHealth[] = []

      for (const [name, worker] of this.workers) {
        const stats = this.workerStats.get(name)
        const health = await this.getWorkerHealth(name, worker, stats)
        healthStatuses.push(health)
      }

      // Log health status
      const unhealthyWorkers = healthStatuses.filter(h => h.status !== 'healthy')
      if (unhealthyWorkers.length > 0) {
        console.warn('⚠️  Unhealthy workers detected:', unhealthyWorkers.map(w => w.name))
      }

      // Store health metrics
      await this.storeHealthMetrics(healthStatuses)
      
    } catch (error) {
      console.error('Health check failed:', error)
    }
  }

  // Get worker health status
  private async getWorkerHealth(name: string, worker: any, stats: any): Promise<WorkerHealth> {
    const uptime = Date.now() - this.startTime
    const memoryUsage = process.memoryUsage()

    let status: WorkerHealth['status'] = 'healthy'
    let isRunning = true
    let isPaused = false

    try {
      isPaused = await worker.isPaused?.() || false
      
      // Determine health status based on various factors
      if (!worker || worker.closing) {
        status = 'critical'
        isRunning = false
      } else if (isPaused) {
        status = 'warning'
      } else if (stats?.lastError && Date.now() - new Date(stats.lastError).getTime() < 300000) {
        status = 'warning' // Recent error within 5 minutes
      }
      
    } catch (error) {
      status = 'critical'
      isRunning = false
    }

    return {
      name,
      status,
      isRunning,
      isPaused,
      jobsProcessed: stats?.jobsProcessed || 0,
      jobsFailed: stats?.jobsFailed || 0,
      lastJobProcessed: stats?.lastJobProcessed,
      lastError: stats?.lastError,
      uptime,
      memoryUsage
    }
  }

  // Collect and store metrics
  private async collectMetrics(): Promise<void> {
    try {
      const metrics = {
        timestamp: new Date().toISOString(),
        workers: Array.from(this.workerStats.entries()).map(([name, stats]) => ({
          name,
          ...stats
        })),
        system: {
          uptime: Date.now() - this.startTime,
          memoryUsage: process.memoryUsage(),
          cpuUsage: process.cpuUsage()
        }
      }

      // Store metrics in database
      const supabase = await createClient()
      await supabase
        .from('worker_metrics')
        .insert({
          metrics_data: metrics,
          created_at: new Date().toISOString()
        })

    } catch (error) {
      console.error('Failed to collect metrics:', error)
    }
  }

  // Store health metrics
  private async storeHealthMetrics(healthStatuses: WorkerHealth[]): Promise<void> {
    try {
      const supabase = await createClient()
      
      for (const health of healthStatuses) {
        await supabase
          .from('worker_health')
          .insert({
            worker_name: health.name,
            status: health.status,
            is_running: health.isRunning,
            is_paused: health.isPaused,
            jobs_processed: health.jobsProcessed,
            jobs_failed: health.jobsFailed,
            last_job_processed: health.lastJobProcessed,
            last_error: health.lastError,
            uptime: health.uptime,
            memory_usage: health.memoryUsage,
            created_at: new Date().toISOString()
          })
      }
      
    } catch (error) {
      console.error('Failed to store health metrics:', error)
    }
  }

  // Setup graceful shutdown
  private setupGracefulShutdown(): void {
    const gracefulShutdown = async (signal: string) => {
      console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`)
      
      try {
        // Stop accepting new jobs
        for (const [name, worker] of this.workers) {
          try {
            await worker.pause()
            console.log(`⏸️  Paused worker: ${name}`)
          } catch (error) {
            console.error(`Failed to pause worker ${name}:`, error)
          }
        }

        // Wait for active jobs to complete (with timeout)
        const shutdownTimeout = parseInt(process.env.SHUTDOWN_TIMEOUT || '30000')
        const startTime = Date.now()
        
        while (Date.now() - startTime < shutdownTimeout) {
          const activeJobs = Array.from(this.workerStats.values())
            .reduce((total, stats) => total + (stats.jobsActive || 0), 0)
          
          if (activeJobs === 0) {
            console.log('✅ All jobs completed')
            break
          }
          
          console.log(`⏳ Waiting for ${activeJobs} active jobs to complete...`)
          await new Promise(resolve => setTimeout(resolve, 1000))
        }

        // Close all workers
        await this.stopAll()
        
        console.log('✅ Graceful shutdown completed')
        process.exit(0)
        
      } catch (error) {
        console.error('❌ Error during graceful shutdown:', error)
        process.exit(1)
      }
    }

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
    process.on('SIGINT', () => gracefulShutdown('SIGINT'))
  }

  // Get worker manager status
  getStatus(): any {
    return {
      workersCount: this.workers.size,
      uptime: Date.now() - this.startTime,
      workers: Array.from(this.workers.keys()),
      stats: Object.fromEntries(this.workerStats),
      memoryUsage: process.memoryUsage()
    }
  }

  // Get specific worker
  getWorker(name: string): any {
    return this.workers.get(name)
  }

  // Pause specific worker
  async pauseWorker(name: string): Promise<boolean> {
    const worker = this.workers.get(name)
    if (!worker) return false
    
    try {
      await worker.pause()
      console.log(`⏸️  Worker ${name} paused`)
      return true
    } catch (error) {
      console.error(`Failed to pause worker ${name}:`, error)
      return false
    }
  }

  // Resume specific worker
  async resumeWorker(name: string): Promise<boolean> {
    const worker = this.workers.get(name)
    if (!worker) return false
    
    try {
      await worker.resume()
      console.log(`▶️  Worker ${name} resumed`)
      return true
    } catch (error) {
      console.error(`Failed to resume worker ${name}:`, error)
      return false
    }
  }
}

// Export singleton worker manager
export const workerManager = new WorkerManager()

// Export worker health check function
export async function getWorkersHealth(): Promise<WorkerHealth[]> {
  const healthStatuses: WorkerHealth[] = []
  
  // This would need to be implemented to get actual health from workerManager
  return healthStatuses
}

// Worker types are already exported as interfaces above