// Workflow Execution Queue

// Skip Redis imports during build
const isBuildTime = process.env.NODE_ENV === 'production' && process.env.VERCEL

let Queue: any = null
let Worker: any = null
let Job: any = null
let QueueEvents: any = null
let Redis: any = null

if (!isBuildTime) {
  try {
    const bullmq = require('bullmq')
    Queue = bullmq.Queue
    Worker = bullmq.Worker
    Job = bullmq.Job
    QueueEvents = bullmq.QueueEvents
    Redis = require('ioredis')
  } catch (error) {
    console.warn('BullMQ/Redis not available:', error)
  }
}

import { createClient } from '@/app/lib/supabase/server'
import { WorkflowExecutor } from './executor'
import type { 
  Workflow, 
  WorkflowExecution, 
  ExecutionStatus,
  WorkflowEvent 
} from '@/app/lib/types/automation'

// Job types and priorities
export enum JobType {
  WORKFLOW_EXECUTION = 'workflow_execution',
  EMAIL_SEND = 'email_send',
  SMS_SEND = 'sms_send',
  WEBHOOK_CALL = 'webhook_call',
  DATA_UPDATE = 'data_update'
}

export enum JobPriority {
  HIGH = 1,
  NORMAL = 2,
  LOW = 3
}

// Job data types
export interface JobData {
  workflowId?: string
  executionId?: string
  organizationId?: string
  triggerData?: any
  nodeId?: string
  actionType?: string
  payload?: any
  context?: any
}

export interface EnqueueOptions {
  priority?: JobPriority
  delay?: number
  attempts?: number
  backoff?: {
    type: 'exponential' | 'fixed'
    delay: number
  }
  metadata?: Record<string, any>
}

export interface QueueConfig {
  redis?: any
  defaultJobOptions?: {
    removeOnComplete?: boolean
    removeOnFail?: boolean
    attempts?: number
    backoff?: {
      type: string
      delay: number
    }
  }
}

// Redis connection - only create if not during build
let redisConnection: any = null

if (!isBuildTime && Redis) {
  try {
    redisConnection = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: true,
    })
  } catch (error) {
    console.warn('Redis connection failed, workflow queues disabled:', error)
  }
}

// Create queues only if Redis is available
export const workflowQueue = redisConnection ? new Queue('workflow-executions', {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: {
      count: 100,
      age: 24 * 3600, // 24 hours
    },
    removeOnFail: {
      count: 50,
      age: 7 * 24 * 3600, // 7 days
    },
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
}) : null

export const priorityQueue = redisConnection ? new Queue('priority-executions', {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: {
      count: 50,
    },
    removeOnFail: {
      count: 25,
    },
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
  },
}) : null

// Queue for delayed actions (wait nodes)
export const delayedQueue = redisConnection ? new Queue('delayed-actions', {
  connection: redisConnection,
}) : null

// Queue events for monitoring
const queueEvents = redisConnection ? new QueueEvents('workflow-executions', {
  connection: redisConnection,
}) : null

// Enqueue workflow execution
export async function enqueueWorkflowExecution(
  workflowId: string,
  triggerData: Record<string, any>,
  options?: {
    priority?: number
    delay?: number
    jobId?: string
  }
): Promise<string> {
  const supabase = await createClient()
  
  // Get workflow
  const { data: workflow, error } = await supabase
    .from('workflows')
    .select('*')
    .eq('id', workflowId)
    .eq('status', 'active')
    .single()
  
  if (error || !workflow) {
    throw new Error(`Workflow not found or inactive: ${workflowId}`)
  }
  
  // Create execution record
  const { data: execution, error: execError } = await supabase
    .from('workflow_executions')
    .insert({
      workflow_id: workflowId,
      organization_id: workflow.organization_id,
      status: 'pending',
      trigger_data: triggerData,
      context: {
        variables: {
          trigger: triggerData,
          workflow: {
            id: workflow.id,
            name: workflow.name,
          },
          execution: {
            startedAt: new Date().toISOString(),
          },
        },
        currentNodeId: null,
        executionPath: [],
      },
    })
    .select()
    .single()
  
  if (execError || !execution) {
    throw new Error(`Failed to create execution record: ${execError?.message}`)
  }
  
  // Determine which queue to use
  const queue = options?.priority && options.priority > 5 ? priorityQueue : workflowQueue
  
  if (!queue) {
    console.warn('Workflow queue not available - Redis not configured')
    // Still return execution ID even if queue is not available
    return execution.id
  }
  
  // Add job to queue
  const job = await queue.add(
    'execute-workflow',
    {
      executionId: execution.id,
      workflowId: workflow.id,
      workflow: workflow,
      triggerData: triggerData,
    },
    {
      priority: options?.priority,
      delay: options?.delay,
      jobId: options?.jobId || execution.id,
    }
  )
  
  // Emit event
  await emitWorkflowEvent({
    type: 'execution_started',
    workflowId: workflow.id,
    executionId: execution.id,
    data: { triggerData },
    timestamp: new Date().toISOString(),
  })
  
  return execution.id
}

// Create workflow execution worker
export function createWorkflowWorker() {
  if (!Worker || !redisConnection) {
    console.warn('Workflow worker disabled - Redis not configured')
    return null
  }
  
  const worker = new Worker(
    'workflow-executions',
    async (job: any) => {
      const { executionId, workflowId, workflow, triggerData } = job.data
      
      try {
        // Update execution status
        await updateExecutionStatus(executionId, 'running')
        
        // Create executor
        const executor = new WorkflowExecutor(workflow, executionId)
        
        // Execute workflow
        const result = await executor.execute(triggerData)
        
        // Update execution status
        await updateExecutionStatus(executionId, 'completed', {
          completedAt: new Date().toISOString(),
          executionTimeMs: Date.now() - new Date(result.startedAt).getTime(),
        })
        
        // Emit completion event
        await emitWorkflowEvent({
          type: 'execution_completed',
          workflowId,
          executionId,
          data: result,
          timestamp: new Date().toISOString(),
        })
        
        return result
      } catch (error) {
        // Update execution status
        await updateExecutionStatus(executionId, 'failed', {
          error: error.message,
          completedAt: new Date().toISOString(),
        })
        
        // Emit failure event
        await emitWorkflowEvent({
          type: 'execution_failed',
          workflowId,
          executionId,
          data: { error: error.message },
          timestamp: new Date().toISOString(),
        })
        
        throw error
      }
    },
    {
      connection: redisConnection,
      concurrency: parseInt(process.env.WORKFLOW_WORKER_CONCURRENCY || '10'),
      limiter: {
        max: 100,
        duration: 60000, // 100 jobs per minute
      },
    }
  )
  
  // Worker event handlers
  worker.on('completed', (job) => {
    console.log(`Workflow execution completed: ${job.id}`)
  })
  
  worker.on('failed', (job, err) => {
    console.error(`Workflow execution failed: ${job?.id}`, err)
  })
  
  worker.on('active', (job) => {
    console.log(`Workflow execution started: ${job.id}`)
  })
  
  worker.on('stalled', (jobId) => {
    console.warn(`Workflow execution stalled: ${jobId}`)
  })
  
  return worker
}

// Create priority workflow worker
export function createPriorityWorker() {
  if (!Worker || !redisConnection) {
    console.warn('Priority worker disabled - Redis not configured')
    return null
  }
  
  const worker = new Worker(
    'priority-executions',
    async (job: any) => {
      const { executionId, workflowId, workflow, triggerData } = job.data
      
      try {
        // Update execution status
        await updateExecutionStatus(executionId, 'running')
        
        // Create executor
        const executor = new WorkflowExecutor(workflow, executionId)
        
        // Execute workflow
        const result = await executor.execute(triggerData)
        
        // Update execution status
        await updateExecutionStatus(executionId, 'completed', {
          completedAt: new Date().toISOString(),
          executionTimeMs: Date.now() - new Date(result.startedAt).getTime(),
        })
        
        // Emit completion event
        await emitWorkflowEvent({
          type: 'execution_completed',
          workflowId,
          executionId,
          data: result,
          timestamp: new Date().toISOString(),
        })
        
        return result
      } catch (error) {
        // Update execution status
        await updateExecutionStatus(executionId, 'failed', {
          error: error.message,
          completedAt: new Date().toISOString(),
        })
        
        // Emit failure event
        await emitWorkflowEvent({
          type: 'execution_failed',
          workflowId,
          executionId,
          data: { error: error.message },
          timestamp: new Date().toISOString(),
        })
        
        throw error
      }
    },
    {
      connection: redisConnection,
      concurrency: parseInt(process.env.PRIORITY_WORKER_CONCURRENCY || '5'),
    }
  )
  
  return worker
}

// Create delayed action worker
export function createDelayedActionWorker() {
  if (!Worker || !redisConnection) {
    console.warn('Delayed action worker disabled - Redis not configured')
    return null
  }
  
  const worker = new Worker(
    'delayed-actions',
    async (job: any) => {
      const { executionId, nodeId, resumeData } = job.data
      
      // Resume workflow execution at specific node
      const executor = await WorkflowExecutor.resume(executionId, nodeId, resumeData)
      return await executor.continue()
    },
    {
      connection: redisConnection,
      concurrency: parseInt(process.env.DELAYED_WORKER_CONCURRENCY || '20'),
    }
  )
  
  return worker
}

// Update execution status
async function updateExecutionStatus(
  executionId: string,
  status: ExecutionStatus,
  updates?: Record<string, any>
): Promise<void> {
  const supabase = await createClient()
  
  await supabase
    .from('workflow_executions')
    .update({
      status,
      ...updates,
    })
    .eq('id', executionId)
}

// Emit workflow event
async function emitWorkflowEvent(event: WorkflowEvent): Promise<void> {
  const supabase = await createClient()
  
  // Store event for history
  await supabase.from('workflow_events').insert({
    workflow_id: event.workflowId,
    execution_id: event.executionId,
    event_type: event.type,
    data: event.data,
  })
  
  // Broadcast real-time event
  await supabase
    .channel(`workflow-events-${event.workflowId}`)
    .send({
      type: 'broadcast',
      event: 'workflow-event',
      payload: event,
    })
}

// Queue monitoring functions
export async function getQueueStats() {
  const [workflowStats, priorityStats, delayedStats] = await Promise.all([
    getQueueMetrics(workflowQueue),
    getQueueMetrics(priorityQueue),
    getQueueMetrics(delayedQueue),
  ])
  
  return {
    workflow: workflowStats,
    priority: priorityStats,
    delayed: delayedStats,
  }
}

async function getQueueMetrics(queue: any) {
  if (!queue) {
    return {
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
      total: 0,
    }
  }
  
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ])
  
  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + delayed,
  }
}

// Pause/resume queue processing
export async function pauseQueue(queueName: 'workflow' | 'priority' | 'delayed') {
  const queue = queueName === 'workflow' ? workflowQueue : 
                queueName === 'priority' ? priorityQueue : delayedQueue
  if (!queue) {
    console.warn(`Cannot pause ${queueName} queue - Redis not configured`)
    return
  }
  await queue.pause()
}

export async function resumeQueue(queueName: 'workflow' | 'priority' | 'delayed') {
  const queue = queueName === 'workflow' ? workflowQueue : 
                queueName === 'priority' ? priorityQueue : delayedQueue
  if (!queue) {
    console.warn(`Cannot resume ${queueName} queue - Redis not configured`)
    return
  }
  await queue.resume()
}

// Export configuration and types
export type { JobData, EnqueueOptions, QueueConfig }
export { redisConnection }

// Clean up old jobs
export async function cleanupOldJobs(olderThan: number = 7 * 24 * 60 * 60 * 1000) {
  if (!workflowQueue || !priorityQueue || !delayedQueue) {
    console.warn('Cannot cleanup jobs - Redis not configured')
    return
  }
  
  const timestamp = Date.now() - olderThan
  
  await Promise.all([
    workflowQueue.clean(olderThan, 100, 'completed'),
    workflowQueue.clean(olderThan, 100, 'failed'),
    priorityQueue.clean(olderThan, 100, 'completed'),
    priorityQueue.clean(olderThan, 100, 'failed'),
    delayedQueue.clean(olderThan, 100, 'completed'),
  ])
}

// Schedule a delayed action
export async function scheduleDelayedAction(
  executionId: string,
  nodeId: string,
  delay: number,
  resumeData: Record<string, any>
): Promise<void> {
  if (!delayedQueue) {
    console.warn('Cannot schedule delayed action - Redis not configured')
    return
  }
  
  await delayedQueue.add(
    'resume-execution',
    {
      executionId,
      nodeId,
      resumeData,
    },
    {
      delay,
      jobId: `${executionId}-${nodeId}-${Date.now()}`,
    }
  )
}

// Cancel workflow execution
export async function cancelWorkflowExecution(executionId: string): Promise<void> {
  // Try to remove from all queues if they exist
  const removePromises = []
  if (workflowQueue) removePromises.push(workflowQueue.remove(executionId))
  if (priorityQueue) removePromises.push(priorityQueue.remove(executionId))
  if (delayedQueue) removePromises.push(delayedQueue.remove(executionId))
  
  if (removePromises.length > 0) {
    await Promise.all(removePromises).catch(() => {}) // Ignore errors if job not found
  }
  
  // Update execution status
  await updateExecutionStatus(executionId, 'cancelled', {
    completedAt: new Date().toISOString(),
  })
}

// Initialize queue monitoring
export function initializeQueueMonitoring() {
  if (!queueEvents) {
    console.warn('Queue monitoring disabled - Redis not configured')
    return
  }
  
  queueEvents.on('waiting', ({ jobId }) => {
    console.log(`Job ${jobId} is waiting`)
  })
  
  queueEvents.on('active', ({ jobId, prev }) => {
    console.log(`Job ${jobId} is active, previous status was ${prev}`)
  })
  
  queueEvents.on('completed', ({ jobId, returnvalue }) => {
    console.log(`Job ${jobId} completed`)
  })
  
  queueEvents.on('failed', ({ jobId, failedReason }) => {
    console.error(`Job ${jobId} failed: ${failedReason}`)
  })
  
  // Periodic cleanup
  setInterval(() => {
    cleanupOldJobs()
  }, 24 * 60 * 60 * 1000) // Daily cleanup
}