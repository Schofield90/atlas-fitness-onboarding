// Dead Letter Queue Implementation for Advanced Error Handling

// Skip Redis imports during build
const isBuildTime = process.env.NODE_ENV === 'production' && process.env.VERCEL

let Queue: any = null
let Worker: any = null
let Redis: any = null

if (!isBuildTime) {
  try {
    const bullmq = require('bullmq')
    Queue = bullmq.Queue
    Worker = bullmq.Worker
    Redis = require('ioredis')
  } catch (error) {
    console.warn('BullMQ/Redis not available for DLQ:', error)
  }
}

import { createClient } from '@/app/lib/supabase/server'
import { redisConnection, JobType, JobData, JobPriority } from './queue'
import { sendEmail } from '@/app/lib/email'

// Dead Letter Job Data
export interface DeadLetterJobData {
  originalJob: {
    id: string
    name: string
    data: JobData
    opts: any
    attemptsMade: number
    finishedOn?: number
    processedOn?: number
    timestamp: number
    queueName: string
  }
  error: {
    message: string
    stack?: string
    name: string
    code?: string
  }
  failureContext: {
    failedAt: string
    totalAttempts: number
    finalAttemptAt: string
    queueName: string
    workerName?: string
    nodeId?: string
  }
  recovery: {
    isRecoverable: boolean
    recoveryStrategy?: string
    maxRecoveryAttempts: number
    recoveryAttempts: number
    lastRecoveryAt?: string
  }
  metadata: {
    organizationId: string
    workflowId?: string
    executionId?: string
    priority: JobPriority
    tags: string[]
    classification: 'transient' | 'persistent' | 'configuration' | 'data' | 'unknown'
  }
}

// Error Classification System
export class ErrorClassifier {
  // Classify error types for better handling
  static classifyError(error: any): 'transient' | 'persistent' | 'configuration' | 'data' | 'unknown' {
    const errorMessage = (error?.message || '').toLowerCase()
    const errorCode = error?.code
    
    // Transient errors - temporary issues that might resolve
    const transientPatterns = [
      /timeout/i, /connection/i, /network/i, /rate limit/i, /temporary/i,
      /unavailable/i, /overload/i, /throttle/i, /busy/i, /503/, /502/, /504/,
      /econnreset/i, /etimedout/i, /enotfound/i, /socket hang up/i
    ]
    
    // Configuration errors - setup or permission issues
    const configurationPatterns = [
      /authentication/i, /authorization/i, /permission/i, /access denied/i,
      /unauthorized/i, /forbidden/i, /api key/i, /token/i, /credential/i,
      /401/, /403/, /missing.*config/i, /invalid.*config/i
    ]
    
    // Data errors - invalid input or data format issues
    const dataPatterns = [
      /validation/i, /invalid.*data/i, /malformed/i, /parse/i, /format/i,
      /schema/i, /constraint/i, /duplicate/i, /not found/i, /missing.*field/i,
      /400/, /404/, /409/, /422/, /unprocessable/i
    ]
    
    // Persistent errors - code bugs or system issues
    const persistentPatterns = [
      /syntax error/i, /reference error/i, /type error/i, /undefined/i,
      /null pointer/i, /division by zero/i, /out of memory/i, /stack overflow/i,
      /500/, /internal server error/i
    ]
    
    if (transientPatterns.some(pattern => pattern.test(errorMessage) || (errorCode && pattern.test(errorCode)))) {
      return 'transient'
    }
    
    if (configurationPatterns.some(pattern => pattern.test(errorMessage) || (errorCode && pattern.test(errorCode)))) {
      return 'configuration'
    }
    
    if (dataPatterns.some(pattern => pattern.test(errorMessage) || (errorCode && pattern.test(errorCode)))) {
      return 'data'
    }
    
    if (persistentPatterns.some(pattern => pattern.test(errorMessage) || (errorCode && pattern.test(errorCode)))) {
      return 'persistent'
    }
    
    return 'unknown'
  }
  
  // Determine if error is recoverable
  static isRecoverable(classification: string, attemptsMade: number): boolean {
    switch (classification) {
      case 'transient':
        return attemptsMade < 5 // More attempts for transient errors
      case 'configuration':
        return attemptsMade < 2 // Fewer attempts, likely needs manual fix
      case 'data':
        return attemptsMade < 2 // Data issues usually need manual correction
      case 'persistent':
        return false // Code bugs need developer intervention
      case 'unknown':
        return attemptsMade < 3 // Conservative approach for unknown errors
      default:
        return false
    }
  }
  
  // Get recovery strategy
  static getRecoveryStrategy(classification: string): string {
    switch (classification) {
      case 'transient':
        return 'exponential_backoff'
      case 'configuration':
        return 'manual_review'
      case 'data':
        return 'data_validation'
      case 'persistent':
        return 'code_fix_required'
      case 'unknown':
        return 'investigate'
      default:
        return 'no_strategy'
    }
  }
}

// Dead Letter Queue Manager
export class DeadLetterQueueManager {
  private dlQueue: any = null
  private dlWorker: any = null
  private metrics = {
    totalProcessed: 0,
    totalRecovered: 0,
    totalPermanentFailures: 0,
    byClassification: new Map<string, number>(),
    byOrganization: new Map<string, number>()
  }

  constructor() {
    this.initializeQueue()
  }

  // Initialize dead letter queue
  private initializeQueue(): void {
    if (!redisConnection || !Queue) {
      console.warn('Dead Letter Queue not available - Redis not configured')
      return
    }

    try {
      this.dlQueue = new Queue('dead-letter-processing', {
        connection: redisConnection,
        defaultJobOptions: {
          removeOnComplete: {
            count: parseInt(process.env.DLQ_COMPLETED_JOBS_COUNT || '50'),
            age: parseInt(process.env.DLQ_COMPLETED_JOBS_AGE || '604800'), // 7 days
          },
          removeOnFail: {
            count: parseInt(process.env.DLQ_FAILED_JOBS_COUNT || '1000'),
            age: parseInt(process.env.DLQ_FAILED_JOBS_AGE || '2592000'), // 30 days
          },
          attempts: 1, // No retries in DLQ
          timeout: 300000, // 5 minutes
        }
      })

      console.log('✅ Dead Letter Queue initialized')
    } catch (error) {
      console.error('❌ Failed to initialize Dead Letter Queue:', error)
    }
  }

  // Start dead letter queue worker
  startWorker(): void {
    if (!this.dlQueue || !Worker) {
      console.warn('Cannot start DLQ worker - Queue not available')
      return
    }

    try {
      this.dlWorker = new Worker(
        'dead-letter-processing',
        async (job: any) => {
          return await this.processDeadLetterJob(job)
        },
        {
          connection: redisConnection,
          concurrency: parseInt(process.env.DLQ_WORKER_CONCURRENCY || '2'),
          limiter: {
            max: 10,
            duration: 60000 // 10 jobs per minute
          },
          settings: {
            stalledInterval: 120000, // 2 minutes
            maxStalledCount: 2,
          }
        }
      )

      this.setupWorkerEvents()
      console.log('✅ Dead Letter Queue worker started')
    } catch (error) {
      console.error('❌ Failed to start DLQ worker:', error)
    }
  }

  // Setup worker event handlers
  private setupWorkerEvents(): void {
    if (!this.dlWorker) return

    this.dlWorker.on('completed', (job: any, result: any) => {
      console.log(`💀✅ DLQ job completed:`, {
        jobId: job.id,
        recovered: result.recovered,
        action: result.action
      })
      
      this.metrics.totalProcessed++
      if (result.recovered) {
        this.metrics.totalRecovered++
      } else {
        this.metrics.totalPermanentFailures++
      }
    })

    this.dlWorker.on('failed', (job: any, err: Error) => {
      console.error(`💀❌ DLQ job failed:`, {
        jobId: job?.id,
        error: err.message
      })
    })

    this.dlWorker.on('error', (err: Error) => {
      console.error('💀❌ DLQ worker error:', err)
    })
  }

  // Add job to dead letter queue
  async addToDeadLetterQueue(
    originalJob: any,
    error: Error,
    context: any = {}
  ): Promise<string | null> {
    if (!this.dlQueue) {
      console.warn('Cannot add to DLQ - Queue not available')
      return null
    }

    try {
      // Classify the error
      const classification = ErrorClassifier.classifyError(error)
      const isRecoverable = ErrorClassifier.isRecoverable(classification, originalJob.attemptsMade)
      const recoveryStrategy = ErrorClassifier.getRecoveryStrategy(classification)

      // Extract metadata from original job
      const metadata = {
        organizationId: originalJob.data?.organizationId || 'unknown',
        workflowId: originalJob.data?.workflowId,
        executionId: originalJob.data?.executionId,
        priority: originalJob.opts?.priority || JobPriority.NORMAL,
        tags: this.generateErrorTags(classification, error),
        classification
      }

      // Create dead letter job data
      const dlJobData: DeadLetterJobData = {
        originalJob: {
          id: originalJob.id,
          name: originalJob.name,
          data: originalJob.data,
          opts: originalJob.opts,
          attemptsMade: originalJob.attemptsMade,
          finishedOn: originalJob.finishedOn,
          processedOn: originalJob.processedOn,
          timestamp: originalJob.timestamp,
          queueName: originalJob.queueName || 'unknown'
        },
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name,
          code: (error as any).code
        },
        failureContext: {
          failedAt: new Date().toISOString(),
          totalAttempts: originalJob.attemptsMade + 1,
          finalAttemptAt: new Date().toISOString(),
          queueName: originalJob.queueName || 'unknown',
          workerName: context.workerName,
          nodeId: context.nodeId
        },
        recovery: {
          isRecoverable,
          recoveryStrategy,
          maxRecoveryAttempts: this.getMaxRecoveryAttempts(classification),
          recoveryAttempts: 0
        },
        metadata
      }

      // Add to dead letter queue
      const job = await this.dlQueue.add(
        'process-dead-letter',
        dlJobData,
        {
          priority: this.getDLQPriority(classification),
          delay: this.getDLQDelay(classification),
          jobId: `dlq_${originalJob.id}_${Date.now()}`
        }
      )

      // Log to database
      await this.logDeadLetterJob(dlJobData)

      // Send immediate notifications for critical errors
      if (classification === 'persistent' || !isRecoverable) {
        await this.sendCriticalErrorNotification(dlJobData)
      }

      console.log(`💀 Job moved to dead letter queue:`, {
        originalJobId: originalJob.id,
        dlqJobId: job.id,
        classification,
        isRecoverable,
        recoveryStrategy
      })

      return job.id
    } catch (dlqError) {
      console.error('Failed to add job to dead letter queue:', dlqError)
      return null
    }
  }

  // Process dead letter job
  private async processDeadLetterJob(job: any): Promise<any> {
    const dlJobData: DeadLetterJobData = job.data

    console.log(`💀 Processing dead letter job:`, {
      jobId: job.id,
      originalJobId: dlJobData.originalJob.id,
      classification: dlJobData.metadata.classification,
      isRecoverable: dlJobData.recovery.isRecoverable
    })

    try {
      // Update processing metrics
      this.updateMetrics(dlJobData)

      // Perform analysis
      const analysis = await this.analyzeFailure(dlJobData)

      // Determine action based on analysis
      const action = await this.determineAction(dlJobData, analysis)

      // Execute action
      const result = await this.executeAction(dlJobData, action, analysis)

      // Update dead letter job record
      await this.updateDeadLetterJobRecord(dlJobData, {
        status: result.success ? 'processed' : 'failed',
        action: action.type,
        result: result,
        processedAt: new Date().toISOString()
      })

      return {
        jobId: job.id,
        originalJobId: dlJobData.originalJob.id,
        action: action.type,
        recovered: result.recovered || false,
        success: result.success,
        analysis,
        timestamp: new Date().toISOString()
      }
    } catch (processingError) {
      console.error(`💀 Failed to process dead letter job ${job.id}:`, processingError)
      
      await this.updateDeadLetterJobRecord(dlJobData, {
        status: 'processing_failed',
        error: processingError.message,
        processedAt: new Date().toISOString()
      })

      throw processingError
    }
  }

  // Analyze failure to determine best course of action
  private async analyzeFailure(dlJobData: DeadLetterJobData): Promise<any> {
    const { originalJob, error, metadata, recovery } = dlJobData

    // Check failure patterns
    const recentFailures = await this.getRecentFailures(
      metadata.organizationId,
      metadata.workflowId,
      error.message
    )

    // Check system health
    const systemHealth = await this.checkSystemHealth()

    // Check if this is a known issue
    const knownIssue = await this.checkKnownIssues(error.message)

    return {
      failurePattern: {
        isRecurring: recentFailures.length > 3,
        frequency: recentFailures.length,
        affectedWorkflows: new Set(recentFailures.map(f => f.workflow_id)).size,
        timespan: this.calculateTimespan(recentFailures)
      },
      systemHealth: {
        redisHealthy: systemHealth.redis,
        databaseHealthy: systemHealth.database,
        queueHealthy: systemHealth.queues
      },
      knownIssue: knownIssue ? {
        id: knownIssue.id,
        status: knownIssue.status,
        workaround: knownIssue.workaround,
        estimatedResolution: knownIssue.estimated_resolution
      } : null,
      recommendedAction: this.getRecommendedAction(dlJobData, recentFailures, systemHealth, knownIssue)
    }
  }

  // Determine action to take
  private async determineAction(dlJobData: DeadLetterJobData, analysis: any): Promise<any> {
    const { recovery, metadata } = dlJobData

    // If already attempted recovery too many times, escalate
    if (recovery.recoveryAttempts >= recovery.maxRecoveryAttempts) {
      return {
        type: 'escalate',
        reason: 'max_recovery_attempts_exceeded',
        priority: 'high'
      }
    }

    // If known issue with workaround, try workaround
    if (analysis.knownIssue?.workaround) {
      return {
        type: 'apply_workaround',
        workaround: analysis.knownIssue.workaround,
        issueId: analysis.knownIssue.id
      }
    }

    // If system is unhealthy, delay processing
    if (!analysis.systemHealth.redisHealthy || !analysis.systemHealth.databaseHealthy) {
      return {
        type: 'delay_retry',
        delay: 300000, // 5 minutes
        reason: 'system_unhealthy'
      }
    }

    // If recoverable and conditions are good, attempt recovery
    if (recovery.isRecoverable && analysis.systemHealth.queueHealthy) {
      return {
        type: 'recover',
        strategy: recovery.recoveryStrategy,
        delay: this.calculateRecoveryDelay(recovery.recoveryAttempts)
      }
    }

    // If not recoverable or conditions are bad, create manual task
    return {
      type: 'create_manual_task',
      priority: metadata.classification === 'persistent' ? 'high' : 'medium',
      assignTo: 'development_team'
    }
  }

  // Execute the determined action
  private async executeAction(dlJobData: DeadLetterJobData, action: any, analysis: any): Promise<any> {
    switch (action.type) {
      case 'recover':
        return await this.attemptRecovery(dlJobData, action)
        
      case 'apply_workaround':
        return await this.applyWorkaround(dlJobData, action)
        
      case 'delay_retry':
        return await this.scheduleDelayedRetry(dlJobData, action)
        
      case 'create_manual_task':
        return await this.createManualTask(dlJobData, action, analysis)
        
      case 'escalate':
        return await this.escalateToTeam(dlJobData, action, analysis)
        
      default:
        throw new Error(`Unknown action type: ${action.type}`)
    }
  }

  // Attempt recovery by re-enqueuing the job
  private async attemptRecovery(dlJobData: DeadLetterJobData, action: any): Promise<any> {
    try {
      const { originalJob } = dlJobData

      // Import queue functions to avoid circular dependencies
      const { enqueueWorkflowExecution } = await import('./queue')

      // Determine target queue and priority
      const recoveryPriority = JobPriority.HIGH // Higher priority for recovered jobs
      const delay = action.delay || 60000 // Default 1 minute delay

      // Re-enqueue with recovery metadata
      const executionId = await enqueueWorkflowExecution(
        originalJob.data.workflowId,
        {
          ...originalJob.data.triggerData,
          recoveryMetadata: {
            isRecovery: true,
            originalJobId: originalJob.id,
            recoveryAttempt: dlJobData.recovery.recoveryAttempts + 1,
            recoveryStrategy: action.strategy,
            recoveredAt: new Date().toISOString()
          }
        },
        {
          priority: recoveryPriority,
          delay,
          attempts: 2, // Fewer attempts for recovered jobs
          metadata: {
            ...originalJob.data.metadata,
            isRecovery: true,
            originalJobId: originalJob.id
          }
        }
      )

      // Update recovery count
      dlJobData.recovery.recoveryAttempts++
      dlJobData.recovery.lastRecoveryAt = new Date().toISOString()

      console.log(`💀🔄 Job recovery attempted:`, {
        originalJobId: originalJob.id,
        newExecutionId: executionId,
        recoveryAttempt: dlJobData.recovery.recoveryAttempts,
        strategy: action.strategy
      })

      return {
        success: true,
        recovered: true,
        newExecutionId: executionId,
        recoveryAttempt: dlJobData.recovery.recoveryAttempts
      }
    } catch (recoveryError) {
      console.error('Recovery attempt failed:', recoveryError)
      return {
        success: false,
        recovered: false,
        error: recoveryError.message
      }
    }
  }

  // Apply a known workaround
  private async applyWorkaround(dlJobData: DeadLetterJobData, action: any): Promise<any> {
    try {
      // This would implement specific workarounds for known issues
      console.log(`💀🔧 Applying workaround for issue ${action.issueId}`)

      // Example: Apply data transformation workaround
      if (action.workaround.type === 'data_transform') {
        // Transform the job data according to the workaround
        const modifiedJobData = this.applyDataTransformation(
          dlJobData.originalJob.data,
          action.workaround.transformation
        )

        // Re-enqueue with modified data
        return await this.attemptRecovery({
          ...dlJobData,
          originalJob: {
            ...dlJobData.originalJob,
            data: modifiedJobData
          }
        }, { strategy: 'workaround', delay: 30000 })
      }

      return {
        success: true,
        recovered: true,
        workaroundApplied: action.workaround.type
      }
    } catch (workaroundError) {
      console.error('Workaround application failed:', workaroundError)
      return {
        success: false,
        recovered: false,
        error: workaroundError.message
      }
    }
  }

  // Schedule delayed retry
  private async scheduleDelayedRetry(dlJobData: DeadLetterJobData, action: any): Promise<any> {
    try {
      // Add back to DLQ with delay
      const job = await this.dlQueue.add(
        'process-dead-letter',
        dlJobData,
        {
          delay: action.delay,
          jobId: `dlq_retry_${dlJobData.originalJob.id}_${Date.now()}`
        }
      )

      console.log(`💀⏰ Scheduled delayed retry:`, {
        originalJobId: dlJobData.originalJob.id,
        delayMs: action.delay,
        reason: action.reason
      })

      return {
        success: true,
        recovered: false,
        scheduledRetryId: job.id,
        delay: action.delay,
        reason: action.reason
      }
    } catch (scheduleError) {
      console.error('Failed to schedule delayed retry:', scheduleError)
      return {
        success: false,
        recovered: false,
        error: scheduleError.message
      }
    }
  }

  // Create manual task for human intervention
  private async createManualTask(dlJobData: DeadLetterJobData, action: any, analysis: any): Promise<any> {
    try {
      const supabase = await createClient()

      // Create manual task record
      const { data: task, error } = await supabase
        .from('manual_tasks')
        .insert({
          title: `Failed Job Requires Manual Attention: ${dlJobData.originalJob.name}`,
          description: this.generateTaskDescription(dlJobData, analysis),
          priority: action.priority,
          assigned_to: action.assignTo,
          task_type: 'job_failure',
          organization_id: dlJobData.metadata.organizationId,
          related_data: {
            originalJobId: dlJobData.originalJob.id,
            errorMessage: dlJobData.error.message,
            classification: dlJobData.metadata.classification,
            analysis
          },
          status: 'open',
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      // Notify assigned team
      await this.notifyTaskAssignment(task, dlJobData)

      console.log(`💀📋 Manual task created:`, {
        taskId: task.id,
        originalJobId: dlJobData.originalJob.id,
        priority: action.priority,
        assignedTo: action.assignTo
      })

      return {
        success: true,
        recovered: false,
        taskId: task.id,
        taskPriority: action.priority,
        assignedTo: action.assignTo
      }
    } catch (taskError) {
      console.error('Failed to create manual task:', taskError)
      return {
        success: false,
        recovered: false,
        error: taskError.message
      }
    }
  }

  // Escalate to development team
  private async escalateToTeam(dlJobData: DeadLetterJobData, action: any, analysis: any): Promise<any> {
    try {
      // Create high priority escalation
      const escalation = await this.createEscalation(dlJobData, analysis)
      
      // Send immediate notifications
      await this.sendEscalationNotifications(escalation, dlJobData)

      console.log(`💀🚨 Job escalated to development team:`, {
        escalationId: escalation.id,
        originalJobId: dlJobData.originalJob.id,
        reason: action.reason
      })

      return {
        success: true,
        recovered: false,
        escalated: true,
        escalationId: escalation.id,
        reason: action.reason
      }
    } catch (escalationError) {
      console.error('Failed to escalate to team:', escalationError)
      return {
        success: false,
        recovered: false,
        error: escalationError.message
      }
    }
  }

  // Helper methods
  private generateErrorTags(classification: string, error: Error): string[] {
    const tags = [`error:${classification}`]
    
    if (error.message.toLowerCase().includes('timeout')) tags.push('timeout')
    if (error.message.toLowerCase().includes('connection')) tags.push('connection')
    if (error.message.toLowerCase().includes('rate limit')) tags.push('rate-limit')
    if (error.message.toLowerCase().includes('permission')) tags.push('permission')
    if (error.message.toLowerCase().includes('validation')) tags.push('validation')
    
    return tags
  }

  private getMaxRecoveryAttempts(classification: string): number {
    switch (classification) {
      case 'transient': return 5
      case 'configuration': return 2
      case 'data': return 2
      case 'persistent': return 0
      case 'unknown': return 3
      default: return 1
    }
  }

  private getDLQPriority(classification: string): JobPriority {
    switch (classification) {
      case 'persistent': return JobPriority.CRITICAL
      case 'configuration': return JobPriority.HIGH
      case 'transient': return JobPriority.NORMAL
      case 'data': return JobPriority.NORMAL
      case 'unknown': return JobPriority.LOW
      default: return JobPriority.LOW
    }
  }

  private getDLQDelay(classification: string): number {
    switch (classification) {
      case 'transient': return 60000 // 1 minute
      case 'configuration': return 300000 // 5 minutes
      case 'data': return 300000 // 5 minutes
      case 'persistent': return 0 // Process immediately
      case 'unknown': return 120000 // 2 minutes
      default: return 60000
    }
  }

  private calculateRecoveryDelay(attemptNumber: number): number {
    // Exponential backoff: 1min, 2min, 4min, 8min, 16min
    return Math.min(60000 * Math.pow(2, attemptNumber), 960000) // Max 16 minutes
  }

  private async getRecentFailures(orgId: string, workflowId?: string, errorMessage?: string): Promise<any[]> {
    try {
      const supabase = await createClient()
      const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // Last 24 hours
      
      let query = supabase
        .from('dead_letter_jobs')
        .select('*')
        .eq('organization_id', orgId)
        .gte('created_at', cutoffTime)
        .order('created_at', { ascending: false })
        .limit(100)

      if (workflowId) {
        query = query.eq('workflow_id', workflowId)
      }

      if (errorMessage) {
        query = query.ilike('error_message', `%${errorMessage.substring(0, 50)}%`)
      }

      const { data, error } = await query
      
      if (error) {
        console.error('Failed to get recent failures:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error fetching recent failures:', error)
      return []
    }
  }

  private async checkSystemHealth(): Promise<any> {
    try {
      // Check Redis health
      const redisHealthy = redisConnection ? await redisConnection.ping() === 'PONG' : false
      
      // Check database health
      const supabase = await createClient()
      const { error: dbError } = await supabase.from('workflows').select('count').limit(1)
      const databaseHealthy = !dbError

      // Check queue health (this would need to be implemented)
      const queueHealthy = true // Placeholder

      return {
        redis: redisHealthy,
        database: databaseHealthy,
        queues: queueHealthy
      }
    } catch (error) {
      console.error('System health check failed:', error)
      return {
        redis: false,
        database: false,
        queues: false
      }
    }
  }

  private async checkKnownIssues(errorMessage: string): Promise<any> {
    try {
      const supabase = await createClient()
      
      const { data: issues, error } = await supabase
        .from('known_issues')
        .select('*')
        .eq('status', 'active')
        .or(`error_patterns.cs.{${errorMessage.substring(0, 100)}}`)
        .limit(1)

      if (error || !issues || issues.length === 0) {
        return null
      }

      return issues[0]
    } catch (error) {
      console.error('Failed to check known issues:', error)
      return null
    }
  }

  private getRecommendedAction(dlJobData: DeadLetterJobData, recentFailures: any[], systemHealth: any, knownIssue: any): string {
    if (knownIssue?.workaround) return 'apply_workaround'
    if (!systemHealth.redis || !systemHealth.database) return 'delay_retry'
    if (recentFailures.length > 10) return 'escalate'
    if (dlJobData.recovery.isRecoverable) return 'recover'
    return 'create_manual_task'
  }

  private calculateTimespan(failures: any[]): number {
    if (failures.length < 2) return 0
    const oldest = new Date(failures[failures.length - 1].created_at).getTime()
    const newest = new Date(failures[0].created_at).getTime()
    return newest - oldest
  }

  private applyDataTransformation(jobData: any, transformation: any): any {
    // Implement data transformation logic based on transformation rules
    // This is a placeholder for actual transformation logic
    return {
      ...jobData,
      transformed: true,
      transformationApplied: transformation.type
    }
  }

  private generateTaskDescription(dlJobData: DeadLetterJobData, analysis: any): string {
    const { originalJob, error, metadata } = dlJobData
    
    return `
**Job Failure Summary**
- Job ID: ${originalJob.id}
- Job Type: ${originalJob.name}
- Organization: ${metadata.organizationId}
- Workflow: ${metadata.workflowId || 'N/A'}
- Classification: ${metadata.classification}

**Error Details**
- Message: ${error.message}
- Type: ${error.name}
- Stack: ${error.stack?.substring(0, 500) || 'N/A'}

**Failure Context**
- Total Attempts: ${dlJobData.failureContext.totalAttempts}
- Queue: ${dlJobData.failureContext.queueName}
- Failed At: ${dlJobData.failureContext.failedAt}

**Analysis**
- Recurring Issue: ${analysis.failurePattern.isRecurring ? 'Yes' : 'No'}
- Similar Failures: ${analysis.failurePattern.frequency}
- System Health: Redis(${analysis.systemHealth.redisHealthy ? '✅' : '❌'}) DB(${analysis.systemHealth.databaseHealthy ? '✅' : '❌'})

**Recommended Action**
${analysis.recommendedAction}

Please investigate and resolve this issue. Update the task status when complete.
    `.trim()
  }

  private async logDeadLetterJob(dlJobData: DeadLetterJobData): Promise<void> {
    try {
      const supabase = await createClient()
      
      await supabase
        .from('dead_letter_jobs')
        .insert({
          original_job_id: dlJobData.originalJob.id,
          job_name: dlJobData.originalJob.name,
          job_data: dlJobData.originalJob.data,
          queue_name: dlJobData.originalJob.queueName,
          organization_id: dlJobData.metadata.organizationId,
          workflow_id: dlJobData.metadata.workflowId,
          execution_id: dlJobData.metadata.executionId,
          error_message: dlJobData.error.message,
          error_stack: dlJobData.error.stack,
          error_classification: dlJobData.metadata.classification,
          is_recoverable: dlJobData.recovery.isRecoverable,
          recovery_strategy: dlJobData.recovery.recoveryStrategy,
          attempts_made: dlJobData.originalJob.attemptsMade,
          tags: dlJobData.metadata.tags,
          failed_at: dlJobData.failureContext.failedAt,
          created_at: new Date().toISOString()
        })
        
    } catch (logError) {
      console.error('Failed to log dead letter job:', logError)
    }
  }

  private async updateDeadLetterJobRecord(dlJobData: DeadLetterJobData, updates: any): Promise<void> {
    try {
      const supabase = await createClient()
      
      await supabase
        .from('dead_letter_jobs')
        .update({
          processing_status: updates.status,
          processing_action: updates.action,
          processing_result: updates.result,
          processing_error: updates.error,
          processed_at: updates.processedAt,
          updated_at: new Date().toISOString()
        })
        .eq('original_job_id', dlJobData.originalJob.id)
        
    } catch (updateError) {
      console.error('Failed to update dead letter job record:', updateError)
    }
  }

  private updateMetrics(dlJobData: DeadLetterJobData): void {
    // Update classification metrics
    const classification = dlJobData.metadata.classification
    this.metrics.byClassification.set(
      classification,
      (this.metrics.byClassification.get(classification) || 0) + 1
    )

    // Update organization metrics
    const orgId = dlJobData.metadata.organizationId
    this.metrics.byOrganization.set(
      orgId,
      (this.metrics.byOrganization.get(orgId) || 0) + 1
    )
  }

  private async sendCriticalErrorNotification(dlJobData: DeadLetterJobData): Promise<void> {
    try {
      if (process.env.ENABLE_CRITICAL_ERROR_NOTIFICATIONS !== 'true') {
        return
      }

      const { metadata, error, originalJob } = dlJobData
      
      // Send email notification
      if (process.env.ADMIN_EMAIL) {
        await sendEmail({
          to: process.env.ADMIN_EMAIL,
          subject: `🚨 Critical Job Failure - ${originalJob.name}`,
          html: `
            <h2>Critical Job Failure Alert</h2>
            <p><strong>Job:</strong> ${originalJob.name} (${originalJob.id})</p>
            <p><strong>Organization:</strong> ${metadata.organizationId}</p>
            <p><strong>Error:</strong> ${error.message}</p>
            <p><strong>Classification:</strong> ${metadata.classification}</p>
            <p><strong>Recoverable:</strong> ${dlJobData.recovery.isRecoverable ? 'Yes' : 'No'}</p>
            <p><strong>Failed At:</strong> ${dlJobData.failureContext.failedAt}</p>
            
            <p>This error requires immediate attention. Please check the dead letter queue for more details.</p>
          `,
          organizationId: metadata.organizationId
        })
      }
    } catch (notificationError) {
      console.error('Failed to send critical error notification:', notificationError)
    }
  }

  private async createEscalation(dlJobData: DeadLetterJobData, analysis: any): Promise<any> {
    const supabase = await createClient()
    
    const { data: escalation, error } = await supabase
      .from('job_escalations')
      .insert({
        original_job_id: dlJobData.originalJob.id,
        organization_id: dlJobData.metadata.organizationId,
        severity: 'high',
        reason: 'max_recovery_attempts_exceeded',
        escalation_data: {
          jobData: dlJobData,
          analysis
        },
        status: 'open',
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return escalation
  }

  private async sendEscalationNotifications(escalation: any, dlJobData: DeadLetterJobData): Promise<void> {
    // Implementation for escalation notifications
    console.log(`🚨 Escalation notifications sent for job ${dlJobData.originalJob.id}`)
  }

  private async notifyTaskAssignment(task: any, dlJobData: DeadLetterJobData): Promise<void> {
    // Implementation for task assignment notifications
    console.log(`📋 Task assignment notifications sent for job ${dlJobData.originalJob.id}`)
  }

  // Public methods for external access
  async getMetrics(): Promise<any> {
    return {
      ...this.metrics,
      byClassification: Object.fromEntries(this.metrics.byClassification),
      byOrganization: Object.fromEntries(this.metrics.byOrganization),
      timestamp: new Date().toISOString()
    }
  }

  async getDLQStatus(): Promise<any> {
    if (!this.dlQueue) {
      return {
        available: false,
        status: 'not_configured'
      }
    }

    try {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        this.dlQueue.getWaitingCount(),
        this.dlQueue.getActiveCount(),
        this.dlQueue.getCompletedCount(),
        this.dlQueue.getFailedCount(),
        this.dlQueue.getDelayedCount(),
      ])

      return {
        available: true,
        status: 'healthy',
        counts: { waiting, active, completed, failed, delayed },
        metrics: await this.getMetrics(),
        worker: {
          running: this.dlWorker ? !this.dlWorker.closing : false,
          paused: this.dlWorker ? await this.dlWorker.isPaused() : false
        }
      }
    } catch (error) {
      return {
        available: true,
        status: 'error',
        error: error.message
      }
    }
  }

  async stopWorker(): Promise<void> {
    if (this.dlWorker) {
      await this.dlWorker.close()
      this.dlWorker = null
      console.log('💀 Dead Letter Queue worker stopped')
    }
  }
}

// Export singleton dead letter queue manager
export const deadLetterQueueManager = new DeadLetterQueueManager()

// Export types and classes
export type { DeadLetterJobData }