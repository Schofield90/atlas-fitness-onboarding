// Workflow Scheduler Service

// Skip Redis imports during build
const isBuildTime = process.env.NODE_ENV === 'production' && process.env.VERCEL

let Queue: any = null
let Worker: any = null
let Job: any = null
let Redis: any = null

if (!isBuildTime) {
  try {
    const bullmq = require('bullmq')
    Queue = bullmq.Queue
    Worker = bullmq.Worker
    Job = bullmq.Job
    Redis = require('ioredis')
  } catch (error) {
    console.warn('BullMQ/Redis not available for scheduler:', error)
  }
}

const parser = require('cron-parser')
import { createClient } from '@/app/lib/supabase/server'
import { enqueueWorkflowExecution } from './queue'

// Redis connection
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
    console.warn('Redis connection failed for scheduler:', error)
  }
}

// Scheduler queue
export const schedulerQueue = redisConnection && Queue ? new Queue('workflow-scheduler', {
  connection: redisConnection,
}) : null

// Active schedules map
const activeSchedules = new Map<string, any>()

// Schedule a workflow
export async function scheduleWorkflow(
  triggerId: string,
  workflowId: string,
  config: {
    scheduleType: 'cron' | 'interval' | 'once'
    cronExpression?: string
    interval?: { value: number; unit: 'minutes' | 'hours' | 'days' | 'weeks' }
    runAt?: string
    timezone?: string
  }
): Promise<void> {
  // Calculate next run time
  const nextRunTime = calculateNextRunTime(config)
  
  if (!nextRunTime) {
    throw new Error('Unable to calculate next run time')
  }
  
  // Add job to scheduler queue
  if (!schedulerQueue) {
    console.warn('Scheduler queue not available - Redis not configured')
    return
  }
  
  const job = await schedulerQueue.add(
    'execute-scheduled-workflow',
    {
      triggerId,
      workflowId,
      config,
    },
    {
      delay: nextRunTime.getTime() - Date.now(),
      jobId: `schedule-${triggerId}`,
    }
  )
  
  activeSchedules.set(triggerId, job)
  
  // Update database with next run time
  const supabase = await createClient()
  await supabase
    .from('schedule_triggers')
    .update({ 
      next_run_at: nextRunTime.toISOString(),
      last_scheduled_at: new Date().toISOString()
    })
    .eq('id', triggerId)
}

// Unschedule a workflow
export async function unscheduleWorkflow(triggerId: string): Promise<void> {
  // Remove from queue
  const job = activeSchedules.get(triggerId)
  if (job) {
    await job.remove()
    activeSchedules.delete(triggerId)
  }
  
  // Remove any pending jobs
  if (schedulerQueue) {
    await schedulerQueue.remove(`schedule-${triggerId}`)
  }
  
  // Update database
  const supabase = await createClient()
  await supabase
    .from('schedule_triggers')
    .update({ 
      is_active: false,
      next_run_at: null 
    })
    .eq('id', triggerId)
}

// Calculate next run time
function calculateNextRunTime(config: any): Date | null {
  const now = new Date()
  const timezone = config.timezone || 'Europe/London'
  
  switch (config.scheduleType) {
    case 'cron':
      if (!config.cronExpression) return null
      try {
        const interval = parser.parseExpression(config.cronExpression, {
          tz: timezone,
          currentDate: now,
        })
        return interval.next().toDate()
      } catch (error) {
        console.error('Invalid cron expression:', error)
        return null
      }
    
    case 'interval':
      if (!config.interval) return null
      const { value, unit } = config.interval
      const next = new Date(now)
      
      switch (unit) {
        case 'minutes':
          next.setMinutes(next.getMinutes() + value)
          break
        case 'hours':
          next.setHours(next.getHours() + value)
          break
        case 'days':
          next.setDate(next.getDate() + value)
          break
        case 'weeks':
          next.setDate(next.getDate() + (value * 7))
          break
      }
      
      return next
    
    case 'once':
      if (!config.runAt) return null
      return new Date(config.runAt)
    
    default:
      return null
  }
}

// Create scheduler worker
export function createSchedulerWorker() {
  if (!Worker || !redisConnection) {
    console.warn('Scheduler worker disabled - Redis not configured')
    return null
  }
  
  const worker = new Worker(
    'workflow-scheduler',
    async (job: any) => {
      const { triggerId, workflowId, config } = job.data
      
      try {
        // Trigger workflow execution
        await enqueueWorkflowExecution(workflowId, {
          trigger: 'scheduled',
          scheduledTime: new Date().toISOString(),
          triggerId,
        })
        
        // Update last run time
        const supabase = await createClient()
        await supabase
          .from('schedule_triggers')
          .update({ 
            last_run_at: new Date().toISOString(),
            run_count: supabase.rpc('increment', { x: 1 })
          })
          .eq('id', triggerId)
        
        // Schedule next run for recurring schedules
        if (config.scheduleType !== 'once') {
          await scheduleWorkflow(triggerId, workflowId, config)
        } else {
          // Mark one-time schedules as inactive
          await supabase
            .from('schedule_triggers')
            .update({ is_active: false })
            .eq('id', triggerId)
        }
        
      } catch (error) {
        console.error(`Failed to execute scheduled workflow ${workflowId}:`, error)
        
        // Update error count
        const supabase = await createClient()
        await supabase
          .from('schedule_triggers')
          .update({ 
            last_error: error.message,
            error_count: supabase.rpc('increment', { x: 1 })
          })
          .eq('id', triggerId)
        
        // Reschedule if not one-time
        if (config.scheduleType !== 'once') {
          await scheduleWorkflow(triggerId, workflowId, config)
        }
        
        throw error
      }
    },
    {
      connection: redisConnection,
      concurrency: 10,
    }
  )
  
  return worker
}

// Initialize scheduler service
export async function initializeScheduler() {
  const supabase = await createClient()
  
  // Load all active schedules
  const { data: schedules, error } = await supabase
    .from('schedule_triggers')
    .select('*, workflows!inner(id)')
    .eq('is_active', true)
  
  if (error) {
    console.error('Failed to load schedules:', error)
    return
  }
  
  // Schedule all active workflows
  for (const schedule of schedules || []) {
    try {
      await scheduleWorkflow(
        schedule.id,
        schedule.workflow_id,
        schedule.schedule_config
      )
      console.log(`Scheduled workflow ${schedule.workflow_id} with trigger ${schedule.id}`)
    } catch (error) {
      console.error(`Failed to schedule workflow ${schedule.workflow_id}:`, error)
    }
  }
  
  // Check for missed schedules periodically
  setInterval(async () => {
    await checkMissedSchedules()
  }, 60000) // Every minute
}

// Check for missed schedules
async function checkMissedSchedules() {
  const supabase = await createClient()
  const now = new Date()
  
  // Find schedules that should have run
  const { data: missedSchedules, error } = await supabase
    .from('schedule_triggers')
    .select('*, workflows!inner(id)')
    .eq('is_active', true)
    .lt('next_run_at', now.toISOString())
    .is('last_run_at', null)
  
  if (error) {
    console.error('Failed to check missed schedules:', error)
    return
  }
  
  // Execute missed schedules
  for (const schedule of missedSchedules || []) {
    console.warn(`Found missed schedule ${schedule.id}, executing now`)
    
    try {
      // Trigger immediate execution
      await enqueueWorkflowExecution(schedule.workflow_id, {
        trigger: 'scheduled',
        scheduledTime: schedule.next_run_at,
        triggerId: schedule.id,
        missed: true,
      })
      
      // Reschedule for next run
      await scheduleWorkflow(
        schedule.id,
        schedule.workflow_id,
        schedule.schedule_config
      )
    } catch (error) {
      console.error(`Failed to execute missed schedule ${schedule.id}:`, error)
    }
  }
}

// Validate cron expression
export function validateCronExpression(expression: string): { valid: boolean; error?: string } {
  try {
    parser.parseExpression(expression)
    return { valid: true }
  } catch (error) {
    return { 
      valid: false, 
      error: error.message 
    }
  }
}

// Get next N run times for a schedule
export function getNextRunTimes(
  config: any,
  count: number = 5
): Date[] {
  const times: Date[] = []
  let currentTime = new Date()
  
  for (let i = 0; i < count; i++) {
    const nextTime = calculateNextRunTime(config)
    
    if (!nextTime) break
    
    times.push(nextTime)
    currentTime = new Date(nextTime.getTime() + 1000) // Add 1 second to get next
  }
  
  return times
}

// Common cron patterns
export const CRON_PATTERNS = {
  everyMinute: '* * * * *',
  everyHour: '0 * * * *',
  everyDay: '0 0 * * *',
  everyWeek: '0 0 * * 0',
  everyMonth: '0 0 1 * *',
  everyWeekday: '0 0 * * 1-5',
  everyWeekend: '0 0 * * 0,6',
  businessHours: '0 9-17 * * 1-5',
  
  // Specific times
  daily9am: '0 9 * * *',
  daily12pm: '0 12 * * *',
  daily5pm: '0 17 * * *',
  
  // Multiple times per day
  twiceDaily: '0 9,17 * * *',
  threeTimesDaily: '0 9,13,17 * * *',
  
  // Specific days
  mondayMorning: '0 9 * * 1',
  fridayAfternoon: '0 15 * * 5',
  
  // Monthly
  firstOfMonth: '0 0 1 * *',
  lastOfMonth: '0 0 L * *',
  fifteenthOfMonth: '0 0 15 * *',
}

// Helper to generate cron from simple config
export function generateCronExpression(config: {
  frequency: 'minute' | 'hour' | 'day' | 'week' | 'month'
  interval?: number
  time?: { hour: number; minute: number }
  daysOfWeek?: number[]
  dayOfMonth?: number
}): string {
  const { frequency, interval = 1, time, daysOfWeek, dayOfMonth } = config
  
  switch (frequency) {
    case 'minute':
      return interval === 1 ? '* * * * *' : `*/${interval} * * * *`
    
    case 'hour':
      return interval === 1 ? '0 * * * *' : `0 */${interval} * * *`
    
    case 'day':
      const minute = time?.minute || 0
      const hour = time?.hour || 0
      return `${minute} ${hour} * * *`
    
    case 'week':
      const weekMinute = time?.minute || 0
      const weekHour = time?.hour || 0
      const days = daysOfWeek?.join(',') || '0'
      return `${weekMinute} ${weekHour} * * ${days}`
    
    case 'month':
      const monthMinute = time?.minute || 0
      const monthHour = time?.hour || 0
      const day = dayOfMonth || 1
      return `${monthMinute} ${monthHour} ${day} * *`
    
    default:
      return '0 * * * *' // Default to every hour
  }
}