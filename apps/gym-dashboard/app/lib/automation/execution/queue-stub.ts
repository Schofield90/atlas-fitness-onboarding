// Queue stub for build time - prevents Redis connection attempts during build

export async function enqueueWorkflowExecution(
  workflowId: string,
  triggerData: Record<string, any>,
  options?: {
    priority?: number
    delay?: number
    jobId?: string
  }
): Promise<string> {
  console.warn('Workflow execution queuing is disabled - Redis not configured')
  return 'stub-execution-id'
}

export function createWorkflowWorker() {
  console.warn('Workflow worker is disabled - Redis not configured')
  return null
}

export function createPriorityWorker() {
  console.warn('Priority worker is disabled - Redis not configured')
  return null
}

export function createDelayedActionWorker() {
  console.warn('Delayed action worker is disabled - Redis not configured')
  return null
}

export async function getQueueStats() {
  return {
    workflow: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0, total: 0 },
    priority: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0, total: 0 },
    delayed: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0, total: 0 },
  }
}

export async function pauseQueue(queueName: 'workflow' | 'priority' | 'delayed') {
  console.warn(`Cannot pause ${queueName} queue - Redis not configured`)
}

export async function resumeQueue(queueName: 'workflow' | 'priority' | 'delayed') {
  console.warn(`Cannot resume ${queueName} queue - Redis not configured`)
}

export async function cleanupOldJobs(olderThan?: number) {
  console.warn('Cannot cleanup jobs - Redis not configured')
}

export async function scheduleDelayedAction(
  executionId: string,
  nodeId: string,
  delay: number,
  resumeData: Record<string, any>
): Promise<void> {
  console.warn('Cannot schedule delayed action - Redis not configured')
}

export async function cancelWorkflowExecution(executionId: string): Promise<void> {
  console.warn('Cannot cancel workflow execution - Redis not configured')
}

export function initializeQueueMonitoring() {
  console.warn('Queue monitoring disabled - Redis not configured')
}

export const workflowQueue = null
export const priorityQueue = null
export const delayedQueue = null