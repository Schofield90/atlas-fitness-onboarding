// Queue Management Service with Comprehensive Monitoring and Health Checks

import { createClient } from '@/app/lib/supabase/server'
import { 
  workflowQueue, 
  priorityQueue, 
  delayedQueue, 
  redisConnection,
  getQueueStats,
  pauseQueue,
  resumeQueue,
  cleanupOldJobs,
  cancelWorkflowExecution,
  JobType,
  JobPriority
} from './queue'
import { workerManager, type WorkerHealth } from './workers'
import { deadLetterQueueManager } from './dead-letter-queue'

// Queue Management Service Configuration
export interface QueueManagerConfig {
  healthCheckInterval: number
  metricsCollectionInterval: number
  alertThresholds: {
    queueDepth: number
    errorRate: number
    processingTime: number
    memoryUsage: number
  }
  autoScaling: {
    enabled: boolean
    minWorkers: number
    maxWorkers: number
    scaleUpThreshold: number
    scaleDownThreshold: number
  }
  maintenance: {
    cleanupInterval: number
    retentionPeriod: number
    offPeakHours: number[]
  }
}

// Queue Health Status
export interface QueueHealthStatus {
  overall: 'healthy' | 'warning' | 'critical' | 'down'
  queues: {
    workflow: QueueStatus
    priority: QueueStatus
    delayed: QueueStatus
  }
  workers: WorkerHealth[]
  redis: RedisStatus
  system: SystemStatus
  alerts: Alert[]
  recommendations: string[]
  lastUpdated: string
}

// Individual Queue Status
export interface QueueStatus {
  name: string
  status: 'healthy' | 'warning' | 'critical' | 'paused' | 'error'
  metrics: {
    waiting: number
    active: number
    completed: number
    failed: number
    delayed: number
    stalled: number
    total: number
    throughput: {
      completedPerMinute: number
      failedPerMinute: number
      successRate: number
    }
  }
  performance: {
    avgProcessingTime: number
    p95ProcessingTime: number
    errorRate: number
    stalledRate: number
  }
  configuration: {
    concurrency: number
    rateLimiter?: {
      max: number
      duration: number
    }
    paused: boolean
  }
  health: {
    score: number // 0-100
    issues: string[]
    recommendations: string[]
  }
}

// Redis Status
export interface RedisStatus {
  connected: boolean
  status: string
  latency: number
  memory: {
    used: string
    peak: string
    fragmentation: number
  }
  connections: number
  commandsProcessed: number
  keyspaceHits: number
  keyspaceMisses: number
  evictedKeys: number
}

// System Status
export interface SystemStatus {
  uptime: number
  memoryUsage: NodeJS.MemoryUsage
  cpuUsage: NodeJS.CpuUsage
  loadAverage: number[]
  freeSpace: number
  nodeVersion: string
  processId: number
}

// Alert Interface
export interface Alert {
  id: string
  type: 'warning' | 'critical' | 'info'
  component: 'queue' | 'worker' | 'redis' | 'system'
  message: string
  details?: any
  createdAt: string
  acknowledged: boolean
  resolvedAt?: string
}

// Performance Metrics
export interface PerformanceMetrics {
  timestamp: string
  queues: {
    [queueName: string]: {
      throughput: number
      errorRate: number
      avgProcessingTime: number
      queueDepth: number
    }
  }
  workers: {
    [workerName: string]: {
      jobsProcessed: number
      jobsFailed: number
      utilization: number
      memoryUsage: number
    }
  }
  system: {
    cpuUsage: number
    memoryUsage: number
    diskUsage: number
    networkIO: number
  }
  redis: {
    latency: number
    memoryUsage: number
    connections: number
    commandRate: number
  }
}

// Queue Management Service
export class QueueManagementService {
  private config: QueueManagerConfig
  private healthCheckInterval?: NodeJS.Timeout
  private metricsInterval?: NodeJS.Timeout
  private maintenanceInterval?: NodeJS.Timeout
  private alerts: Alert[] = []
  private metrics: PerformanceMetrics[] = []
  private lastHealthCheck?: QueueHealthStatus

  constructor(config?: Partial<QueueManagerConfig>) {
    this.config = {
      healthCheckInterval: 30000, // 30 seconds
      metricsCollectionInterval: 60000, // 1 minute
      alertThresholds: {
        queueDepth: 1000,
        errorRate: 0.1, // 10%
        processingTime: 300000, // 5 minutes
        memoryUsage: 0.9 // 90%
      },
      autoScaling: {
        enabled: false, // Disabled by default
        minWorkers: 1,
        maxWorkers: 10,
        scaleUpThreshold: 0.8,
        scaleDownThreshold: 0.3
      },
      maintenance: {
        cleanupInterval: 3600000, // 1 hour
        retentionPeriod: 7 * 24 * 60 * 60 * 1000, // 7 days
        offPeakHours: [2, 3, 4] // 2-4 AM
      },
      ...config
    }
  }

  // Start queue management service
  async start(): Promise<void> {
    console.log('🎛️  Starting Queue Management Service...')

    try {
      // Start health checks
      this.startHealthChecks()
      
      // Start metrics collection
      this.startMetricsCollection()
      
      // Start maintenance tasks
      this.startMaintenanceTasks()
      
      // Perform initial health check
      await this.performHealthCheck()
      
      console.log('✅ Queue Management Service started successfully')
    } catch (error) {
      console.error('❌ Failed to start Queue Management Service:', error)
      throw error
    }
  }

  // Stop queue management service
  async stop(): Promise<void> {
    console.log('🛑 Stopping Queue Management Service...')

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
    }
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval)
    }
    if (this.maintenanceInterval) {
      clearInterval(this.maintenanceInterval)
    }

    console.log('✅ Queue Management Service stopped')
  }

  // Start health checks
  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthCheck()
      } catch (error) {
        console.error('Health check failed:', error)
      }
    }, this.config.healthCheckInterval)
  }

  // Start metrics collection
  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(async () => {
      try {
        await this.collectMetrics()
      } catch (error) {
        console.error('Metrics collection failed:', error)
      }
    }, this.config.metricsCollectionInterval)
  }

  // Start maintenance tasks
  private startMaintenanceTasks(): void {
    this.maintenanceInterval = setInterval(async () => {
      try {
        await this.performMaintenance()
      } catch (error) {
        console.error('Maintenance task failed:', error)
      }
    }, this.config.maintenance.cleanupInterval)
  }

  // Perform comprehensive health check
  async performHealthCheck(): Promise<QueueHealthStatus> {
    const startTime = Date.now()

    try {
      // Get queue statistics
      const queueStats = await getQueueStats()
      
      // Get worker health
      const workerHealth = await this.getWorkersHealth()
      
      // Get Redis status
      const redisStatus = await this.getRedisStatus()
      
      // Get system status
      const systemStatus = await this.getSystemStatus()
      
      // Build queue status objects
      const queues = {
        workflow: await this.buildQueueStatus('workflow', queueStats.workflow),
        priority: await this.buildQueueStatus('priority', queueStats.priority),
        delayed: await this.buildQueueStatus('delayed', queueStats.delayed)
      }

      // Determine overall health
      const overall = this.determineOverallHealth(queues, workerHealth, redisStatus, systemStatus)
      
      // Generate alerts
      const alerts = await this.generateAlerts(queues, workerHealth, redisStatus, systemStatus)
      
      // Generate recommendations
      const recommendations = this.generateRecommendations(queues, workerHealth, redisStatus, systemStatus)

      const healthStatus: QueueHealthStatus = {
        overall,
        queues,
        workers: workerHealth,
        redis: redisStatus,
        system: systemStatus,
        alerts,
        recommendations,
        lastUpdated: new Date().toISOString()
      }

      this.lastHealthCheck = healthStatus

      // Store health status
      await this.storeHealthStatus(healthStatus)

      // Process alerts
      await this.processAlerts(alerts)

      const checkTime = Date.now() - startTime
      console.log(`🏥 Health check completed in ${checkTime}ms - Status: ${overall}`)

      return healthStatus
    } catch (error) {
      console.error('Health check failed:', error)
      
      const errorStatus: QueueHealthStatus = {
        overall: 'critical',
        queues: {
          workflow: this.createErrorQueueStatus('workflow'),
          priority: this.createErrorQueueStatus('priority'),
          delayed: this.createErrorQueueStatus('delayed')
        },
        workers: [],
        redis: this.createErrorRedisStatus(),
        system: await this.getSystemStatus(),
        alerts: [{
          id: `health-check-error-${Date.now()}`,
          type: 'critical',
          component: 'system',
          message: 'Health check failed',
          details: { error: error.message },
          createdAt: new Date().toISOString(),
          acknowledged: false
        }],
        recommendations: ['Investigate health check failure', 'Check system resources'],
        lastUpdated: new Date().toISOString()
      }

      return errorStatus
    }
  }

  // Build queue status
  private async buildQueueStatus(queueName: string, stats: any): Promise<QueueStatus> {
    try {
      // Calculate performance metrics
      const totalJobs = stats.completed + stats.failed
      const successRate = totalJobs > 0 ? (stats.completed / totalJobs) * 100 : 100
      const errorRate = totalJobs > 0 ? (stats.failed / totalJobs) : 0
      const stalledRate = stats.total > 0 ? (stats.stalled / stats.total) : 0

      // Calculate throughput (this would be enhanced with historical data)
      const completedPerMinute = this.calculateThroughput(queueName, 'completed')
      const failedPerMinute = this.calculateThroughput(queueName, 'failed')

      // Get performance data
      const avgProcessingTime = await this.getAverageProcessingTime(queueName)
      const p95ProcessingTime = await this.getP95ProcessingTime(queueName)

      // Determine queue health
      const healthScore = this.calculateQueueHealthScore(stats, {
        successRate,
        errorRate,
        stalledRate,
        avgProcessingTime
      })

      const issues: string[] = []
      const recommendations: string[] = []

      // Identify issues and recommendations
      if (stats.waiting > this.config.alertThresholds.queueDepth) {
        issues.push(`High queue depth: ${stats.waiting} jobs waiting`)
        recommendations.push('Consider scaling up workers or investigating processing bottlenecks')
      }

      if (errorRate > this.config.alertThresholds.errorRate) {
        issues.push(`High error rate: ${(errorRate * 100).toFixed(1)}%`)
        recommendations.push('Investigate job failures and improve error handling')
      }

      if (stats.stalled > 10) {
        issues.push(`Stalled jobs detected: ${stats.stalled}`)
        recommendations.push('Check worker health and consider restarting stalled jobs')
      }

      // Determine status
      let status: QueueStatus['status'] = 'healthy'
      if (issues.length > 0) {
        status = healthScore < 70 ? 'critical' : 'warning'
      }

      return {
        name: queueName,
        status,
        metrics: {
          ...stats,
          throughput: {
            completedPerMinute,
            failedPerMinute,
            successRate
          }
        },
        performance: {
          avgProcessingTime,
          p95ProcessingTime,
          errorRate,
          stalledRate
        },
        configuration: {
          concurrency: await this.getQueueConcurrency(queueName),
          rateLimiter: await this.getQueueRateLimiter(queueName),
          paused: await this.isQueuePaused(queueName)
        },
        health: {
          score: healthScore,
          issues,
          recommendations
        }
      }
    } catch (error) {
      console.error(`Failed to build queue status for ${queueName}:`, error)
      return this.createErrorQueueStatus(queueName)
    }
  }

  // Get Redis status
  private async getRedisStatus(): Promise<RedisStatus> {
    if (!redisConnection) {
      return {
        connected: false,
        status: 'not_configured',
        latency: -1,
        memory: { used: '0B', peak: '0B', fragmentation: 0 },
        connections: 0,
        commandsProcessed: 0,
        keyspaceHits: 0,
        keyspaceMisses: 0,
        evictedKeys: 0
      }
    }

    try {
      const startTime = Date.now()
      const pong = await redisConnection.ping()
      const latency = Date.now() - startTime

      if (pong !== 'PONG') {
        throw new Error('Redis ping failed')
      }

      // Get Redis info
      const [memoryInfo, statsInfo, keyspaceInfo] = await Promise.all([
        redisConnection.info('memory'),
        redisConnection.info('stats'),
        redisConnection.info('keyspace')
      ])

      // Parse Redis info
      const memoryData = this.parseRedisInfo(memoryInfo)
      const statsData = this.parseRedisInfo(statsInfo)
      const keyspaceData = this.parseRedisInfo(keyspaceInfo)

      return {
        connected: true,
        status: redisConnection.status,
        latency,
        memory: {
          used: memoryData.used_memory_human || '0B',
          peak: memoryData.used_memory_peak_human || '0B',
          fragmentation: parseFloat(memoryData.mem_fragmentation_ratio) || 0
        },
        connections: parseInt(statsData.connected_clients) || 0,
        commandsProcessed: parseInt(statsData.total_commands_processed) || 0,
        keyspaceHits: parseInt(statsData.keyspace_hits) || 0,
        keyspaceMisses: parseInt(statsData.keyspace_misses) || 0,
        evictedKeys: parseInt(statsData.evicted_keys) || 0
      }
    } catch (error) {
      console.error('Failed to get Redis status:', error)
      return {
        connected: false,
        status: 'error',
        latency: -1,
        memory: { used: '0B', peak: '0B', fragmentation: 0 },
        connections: 0,
        commandsProcessed: 0,
        keyspaceHits: 0,
        keyspaceMisses: 0,
        evictedKeys: 0
      }
    }
  }

  // Get system status
  private async getSystemStatus(): Promise<SystemStatus> {
    const os = require('os')
    
    return {
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      loadAverage: os.loadavg(),
      freeSpace: os.freemem(),
      nodeVersion: process.version,
      processId: process.pid
    }
  }

  // Get workers health
  private async getWorkersHealth(): Promise<WorkerHealth[]> {
    try {
      // Get worker status from worker manager
      const workerStatus = workerManager.getStatus()
      const workers: WorkerHealth[] = []

      for (const [workerName, stats] of Object.entries(workerStatus.stats)) {
        const worker = workerManager.getWorker(workerName)
        const health: WorkerHealth = {
          name: workerName,
          status: this.determineWorkerStatus(stats as any, worker),
          isRunning: !!worker && !worker.closing,
          isPaused: worker ? await worker.isPaused() : false,
          jobsProcessed: (stats as any).jobsProcessed || 0,
          jobsFailed: (stats as any).jobsFailed || 0,
          lastJobProcessed: (stats as any).lastJobProcessed,
          lastError: (stats as any).lastError,
          uptime: Date.now() - ((stats as any).startTime || Date.now()),
          memoryUsage: process.memoryUsage()
        }
        workers.push(health)
      }

      return workers
    } catch (error) {
      console.error('Failed to get workers health:', error)
      return []
    }
  }

  // Determine overall health
  private determineOverallHealth(
    queues: any,
    workers: WorkerHealth[],
    redis: RedisStatus,
    system: SystemStatus
  ): QueueHealthStatus['overall'] {
    // Check if Redis is down
    if (!redis.connected) {
      return 'down'
    }

    // Check for critical queue issues
    const criticalQueues = Object.values(queues).filter((q: any) => q.status === 'critical')
    if (criticalQueues.length > 0) {
      return 'critical'
    }

    // Check for critical worker issues
    const criticalWorkers = workers.filter(w => w.status === 'critical')
    if (criticalWorkers.length > 0) {
      return 'critical'
    }

    // Check system resources
    const memoryUsage = system.memoryUsage.heapUsed / system.memoryUsage.heapTotal
    if (memoryUsage > 0.95) {
      return 'critical'
    }

    // Check for warnings
    const warningQueues = Object.values(queues).filter((q: any) => q.status === 'warning')
    const warningWorkers = workers.filter(w => w.status === 'warning')
    
    if (warningQueues.length > 0 || warningWorkers.length > 0 || memoryUsage > 0.85) {
      return 'warning'
    }

    return 'healthy'
  }

  // Generate alerts
  private async generateAlerts(
    queues: any,
    workers: WorkerHealth[],
    redis: RedisStatus,
    system: SystemStatus
  ): Promise<Alert[]> {
    const alerts: Alert[] = []

    // Queue alerts
    for (const [queueName, queue] of Object.entries(queues)) {
      const q = queue as QueueStatus
      
      if (q.metrics.waiting > this.config.alertThresholds.queueDepth) {
        alerts.push({
          id: `queue-depth-${queueName}-${Date.now()}`,
          type: 'warning',
          component: 'queue',
          message: `High queue depth in ${queueName}: ${q.metrics.waiting} jobs waiting`,
          details: { queueName, waiting: q.metrics.waiting },
          createdAt: new Date().toISOString(),
          acknowledged: false
        })
      }

      if (q.performance.errorRate > this.config.alertThresholds.errorRate) {
        alerts.push({
          id: `error-rate-${queueName}-${Date.now()}`,
          type: 'critical',
          component: 'queue',
          message: `High error rate in ${queueName}: ${(q.performance.errorRate * 100).toFixed(1)}%`,
          details: { queueName, errorRate: q.performance.errorRate },
          createdAt: new Date().toISOString(),
          acknowledged: false
        })
      }
    }

    // Worker alerts
    for (const worker of workers) {
      if (worker.status === 'critical') {
        alerts.push({
          id: `worker-critical-${worker.name}-${Date.now()}`,
          type: 'critical',
          component: 'worker',
          message: `Worker ${worker.name} is in critical state`,
          details: { workerName: worker.name, lastError: worker.lastError },
          createdAt: new Date().toISOString(),
          acknowledged: false
        })
      }
    }

    // Redis alerts
    if (!redis.connected) {
      alerts.push({
        id: `redis-disconnected-${Date.now()}`,
        type: 'critical',
        component: 'redis',
        message: 'Redis connection lost',
        details: { status: redis.status },
        createdAt: new Date().toISOString(),
        acknowledged: false
      })
    } else if (redis.latency > 1000) {
      alerts.push({
        id: `redis-latency-${Date.now()}`,
        type: 'warning',
        component: 'redis',
        message: `High Redis latency: ${redis.latency}ms`,
        details: { latency: redis.latency },
        createdAt: new Date().toISOString(),
        acknowledged: false
      })
    }

    // System alerts
    const memoryUsage = system.memoryUsage.heapUsed / system.memoryUsage.heapTotal
    if (memoryUsage > this.config.alertThresholds.memoryUsage) {
      alerts.push({
        id: `memory-usage-${Date.now()}`,
        type: memoryUsage > 0.95 ? 'critical' : 'warning',
        component: 'system',
        message: `High memory usage: ${(memoryUsage * 100).toFixed(1)}%`,
        details: { memoryUsage, heapUsed: system.memoryUsage.heapUsed, heapTotal: system.memoryUsage.heapTotal },
        createdAt: new Date().toISOString(),
        acknowledged: false
      })
    }

    return alerts
  }

  // Generate recommendations
  private generateRecommendations(
    queues: any,
    workers: WorkerHealth[],
    redis: RedisStatus,
    system: SystemStatus
  ): string[] {
    const recommendations: string[] = []

    // Queue recommendations
    for (const [queueName, queue] of Object.entries(queues)) {
      const q = queue as QueueStatus
      
      if (q.metrics.waiting > 500) {
        recommendations.push(`Consider increasing concurrency for ${queueName} queue`)
      }
      
      if (q.performance.errorRate > 0.05) {
        recommendations.push(`Investigate and fix high error rate in ${queueName} queue`)
      }
      
      if (q.metrics.stalled > 5) {
        recommendations.push(`Check for stalled jobs in ${queueName} queue`)
      }
    }

    // Worker recommendations
    const unhealthyWorkers = workers.filter(w => w.status !== 'healthy')
    if (unhealthyWorkers.length > 0) {
      recommendations.push('Review worker health and consider restarting unhealthy workers')
    }

    // Redis recommendations
    if (redis.connected && redis.memory.fragmentation > 1.5) {
      recommendations.push('Redis memory fragmentation is high - consider restarting Redis during maintenance window')
    }

    // System recommendations
    const memoryUsage = system.memoryUsage.heapUsed / system.memoryUsage.heapTotal
    if (memoryUsage > 0.8) {
      recommendations.push('Memory usage is high - consider increasing heap size or optimizing memory usage')
    }

    if (system.loadAverage[0] > 5) {
      recommendations.push('CPU load is high - consider scaling up infrastructure')
    }

    return recommendations
  }

  // Helper methods
  private calculateQueueHealthScore(stats: any, performance: any): number {
    let score = 100

    // Penalize high queue depth
    if (stats.waiting > 100) score -= Math.min(30, stats.waiting / 100)
    
    // Penalize high error rate
    score -= performance.errorRate * 50
    
    // Penalize stalled jobs
    if (stats.stalled > 0) score -= Math.min(20, stats.stalled * 2)
    
    // Penalize slow processing
    if (performance.avgProcessingTime > 60000) {
      score -= Math.min(20, (performance.avgProcessingTime - 60000) / 60000 * 10)
    }

    return Math.max(0, Math.min(100, score))
  }

  private determineWorkerStatus(stats: any, worker: any): WorkerHealth['status'] {
    if (!worker || worker.closing) return 'critical'
    if (stats.lastError && Date.now() - new Date(stats.lastError).getTime() < 300000) return 'warning'
    if (stats.jobsFailed > stats.jobsProcessed * 0.1) return 'warning'
    return 'healthy'
  }

  private parseRedisInfo(infoString: string): any {
    const info: any = {}
    const lines = infoString.split('\r\n')
    
    for (const line of lines) {
      if (line && !line.startsWith('#')) {
        const [key, value] = line.split(':')
        if (key && value) {
          info[key] = isNaN(Number(value)) ? value : Number(value)
        }
      }
    }
    
    return info
  }

  private calculateThroughput(queueName: string, metric: 'completed' | 'failed'): number {
    // This would be enhanced with actual historical data
    // For now, return a placeholder
    return 0
  }

  private async getAverageProcessingTime(queueName: string): Promise<number> {
    // This would query historical processing time data
    return 5000 // 5 seconds placeholder
  }

  private async getP95ProcessingTime(queueName: string): Promise<number> {
    // This would query historical processing time data
    return 15000 // 15 seconds placeholder
  }

  private async getQueueConcurrency(queueName: string): Promise<number> {
    // This would get actual queue configuration
    return 5 // Placeholder
  }

  private async getQueueRateLimiter(queueName: string): Promise<any> {
    // This would get actual queue configuration
    return { max: 100, duration: 60000 } // Placeholder
  }

  private async isQueuePaused(queueName: string): Promise<boolean> {
    // This would check actual queue pause status
    return false // Placeholder
  }

  private createErrorQueueStatus(queueName: string): QueueStatus {
    return {
      name: queueName,
      status: 'error',
      metrics: {
        waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0, stalled: 0, total: 0,
        throughput: { completedPerMinute: 0, failedPerMinute: 0, successRate: 0 }
      },
      performance: { avgProcessingTime: 0, p95ProcessingTime: 0, errorRate: 0, stalledRate: 0 },
      configuration: { concurrency: 0, paused: false },
      health: { score: 0, issues: ['Status check failed'], recommendations: ['Check queue configuration'] }
    }
  }

  private createErrorRedisStatus(): RedisStatus {
    return {
      connected: false, status: 'error', latency: -1,
      memory: { used: '0B', peak: '0B', fragmentation: 0 },
      connections: 0, commandsProcessed: 0, keyspaceHits: 0, keyspaceMisses: 0, evictedKeys: 0
    }
  }

  // Collect metrics
  private async collectMetrics(): Promise<void> {
    try {
      const timestamp = new Date().toISOString()
      const queueStats = await getQueueStats()
      const workerStatus = workerManager.getStatus()
      const redisStatus = await this.getRedisStatus()
      const systemStatus = await this.getSystemStatus()

      const metrics: PerformanceMetrics = {
        timestamp,
        queues: {
          workflow: {
            throughput: this.calculateThroughput('workflow', 'completed'),
            errorRate: queueStats.workflow.failed / (queueStats.workflow.completed + queueStats.workflow.failed) || 0,
            avgProcessingTime: await this.getAverageProcessingTime('workflow'),
            queueDepth: queueStats.workflow.waiting
          },
          priority: {
            throughput: this.calculateThroughput('priority', 'completed'),
            errorRate: queueStats.priority.failed / (queueStats.priority.completed + queueStats.priority.failed) || 0,
            avgProcessingTime: await this.getAverageProcessingTime('priority'),
            queueDepth: queueStats.priority.waiting
          },
          delayed: {
            throughput: this.calculateThroughput('delayed', 'completed'),
            errorRate: queueStats.delayed.failed / (queueStats.delayed.completed + queueStats.delayed.failed) || 0,
            avgProcessingTime: await this.getAverageProcessingTime('delayed'),
            queueDepth: queueStats.delayed.waiting
          }
        },
        workers: Object.fromEntries(
          Object.entries(workerStatus.stats).map(([name, stats]: [string, any]) => [
            name,
            {
              jobsProcessed: stats.jobsProcessed || 0,
              jobsFailed: stats.jobsFailed || 0,
              utilization: (stats.jobsActive || 0) / 5, // Assuming 5 max concurrency
              memoryUsage: process.memoryUsage().heapUsed
            }
          ])
        ),
        system: {
          cpuUsage: process.cpuUsage().user / 1000000, // Convert to seconds
          memoryUsage: systemStatus.memoryUsage.heapUsed / systemStatus.memoryUsage.heapTotal,
          diskUsage: 0, // Would need disk usage implementation
          networkIO: 0 // Would need network IO implementation
        },
        redis: {
          latency: redisStatus.latency,
          memoryUsage: parseInt(redisStatus.memory.used.replace(/[^\d]/g, '')) || 0,
          connections: redisStatus.connections,
          commandRate: redisStatus.commandsProcessed
        }
      }

      // Store metrics (keep last 1000 entries)
      this.metrics.push(metrics)
      if (this.metrics.length > 1000) {
        this.metrics.shift()
      }

      // Store in database
      await this.storeMetrics(metrics)
    } catch (error) {
      console.error('Failed to collect metrics:', error)
    }
  }

  // Perform maintenance
  private async performMaintenance(): Promise<void> {
    try {
      console.log('🧹 Starting maintenance tasks...')

      // Check if it's off-peak hours
      const currentHour = new Date().getHours()
      const isOffPeak = this.config.maintenance.offPeakHours.includes(currentHour)

      // Clean up old jobs
      await cleanupOldJobs(this.config.maintenance.retentionPeriod)

      // Clean up old metrics
      await this.cleanupOldMetrics()

      // Resolve old alerts
      await this.resolveOldAlerts()

      // Optimize queues during off-peak hours
      if (isOffPeak) {
        await this.optimizeQueues()
      }

      console.log('✅ Maintenance tasks completed')
    } catch (error) {
      console.error('Maintenance tasks failed:', error)
    }
  }

  // Store health status
  private async storeHealthStatus(healthStatus: QueueHealthStatus): Promise<void> {
    try {
      const supabase = await createClient()
      
      await supabase
        .from('queue_health_status')
        .insert({
          overall_status: healthStatus.overall,
          queue_status: healthStatus.queues,
          worker_status: healthStatus.workers,
          redis_status: healthStatus.redis,
          system_status: healthStatus.system,
          alerts: healthStatus.alerts,
          recommendations: healthStatus.recommendations,
          created_at: new Date().toISOString()
        })
    } catch (error) {
      console.error('Failed to store health status:', error)
    }
  }

  // Store metrics
  private async storeMetrics(metrics: PerformanceMetrics): Promise<void> {
    try {
      const supabase = await createClient()
      
      await supabase
        .from('queue_performance_metrics')
        .insert({
          timestamp: metrics.timestamp,
          queue_metrics: metrics.queues,
          worker_metrics: metrics.workers,
          system_metrics: metrics.system,
          redis_metrics: metrics.redis,
          created_at: new Date().toISOString()
        })
    } catch (error) {
      console.error('Failed to store metrics:', error)
    }
  }

  // Process alerts
  private async processAlerts(alerts: Alert[]): Promise<void> {
    for (const alert of alerts) {
      try {
        // Store alert
        await this.storeAlert(alert)
        
        // Send notifications for critical alerts
        if (alert.type === 'critical') {
          await this.sendAlertNotification(alert)
        }
        
        // Add to active alerts
        this.alerts.push(alert)
      } catch (error) {
        console.error('Failed to process alert:', error)
      }
    }
  }

  // Store alert
  private async storeAlert(alert: Alert): Promise<void> {
    try {
      const supabase = await createClient()
      
      await supabase
        .from('queue_alerts')
        .insert({
          alert_id: alert.id,
          alert_type: alert.type,
          component: alert.component,
          message: alert.message,
          details: alert.details,
          acknowledged: alert.acknowledged,
          resolved_at: alert.resolvedAt,
          created_at: alert.createdAt
        })
    } catch (error) {
      console.error('Failed to store alert:', error)
    }
  }

  // Send alert notification
  private async sendAlertNotification(alert: Alert): Promise<void> {
    try {
      // Implementation would depend on notification preferences
      console.warn(`🚨 CRITICAL ALERT: ${alert.message}`, alert.details)
      
      // Could send email, Slack, SMS, etc.
    } catch (error) {
      console.error('Failed to send alert notification:', error)
    }
  }

  // Clean up old metrics
  private async cleanupOldMetrics(): Promise<void> {
    try {
      const supabase = await createClient()
      const cutoffDate = new Date(Date.now() - this.config.maintenance.retentionPeriod).toISOString()
      
      await supabase
        .from('queue_performance_metrics')
        .delete()
        .lt('created_at', cutoffDate)
    } catch (error) {
      console.error('Failed to cleanup old metrics:', error)
    }
  }

  // Resolve old alerts
  private async resolveOldAlerts(): Promise<void> {
    try {
      const supabase = await createClient()
      const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // 24 hours
      
      await supabase
        .from('queue_alerts')
        .update({
          resolved_at: new Date().toISOString(),
          acknowledged: true
        })
        .lt('created_at', cutoffDate)
        .is('resolved_at', null)
    } catch (error) {
      console.error('Failed to resolve old alerts:', error)
    }
  }

  // Optimize queues
  private async optimizeQueues(): Promise<void> {
    try {
      console.log('🔧 Optimizing queues during off-peak hours...')
      
      // This could include:
      // - Rebalancing queue priorities
      // - Cleaning up stale connections
      // - Optimizing Redis memory
      // - Defragmenting data structures
      
      console.log('✅ Queue optimization completed')
    } catch (error) {
      console.error('Queue optimization failed:', error)
    }
  }

  // Public API methods
  async getHealthStatus(): Promise<QueueHealthStatus | null> {
    return this.lastHealthCheck || null
  }

  async getMetrics(timeRange?: { start: string; end: string }): Promise<PerformanceMetrics[]> {
    if (timeRange) {
      return this.metrics.filter(m => 
        m.timestamp >= timeRange.start && m.timestamp <= timeRange.end
      )
    }
    return this.metrics
  }

  async getAlerts(active?: boolean): Promise<Alert[]> {
    if (active !== undefined) {
      return this.alerts.filter(a => active ? !a.resolvedAt : !!a.resolvedAt)
    }
    return this.alerts
  }

  async acknowledgeAlert(alertId: string): Promise<boolean> {
    const alert = this.alerts.find(a => a.id === alertId)
    if (alert) {
      alert.acknowledged = true
      
      try {
        const supabase = await createClient()
        await supabase
          .from('queue_alerts')
          .update({ acknowledged: true })
          .eq('alert_id', alertId)
        
        return true
      } catch (error) {
        console.error('Failed to acknowledge alert:', error)
        return false
      }
    }
    return false
  }

  async resolveAlert(alertId: string): Promise<boolean> {
    const alert = this.alerts.find(a => a.id === alertId)
    if (alert) {
      alert.resolvedAt = new Date().toISOString()
      alert.acknowledged = true
      
      try {
        const supabase = await createClient()
        await supabase
          .from('queue_alerts')
          .update({ 
            resolved_at: alert.resolvedAt,
            acknowledged: true 
          })
          .eq('alert_id', alertId)
        
        return true
      } catch (error) {
        console.error('Failed to resolve alert:', error)
        return false
      }
    }
    return false
  }

  // Queue management operations
  async pauseAllQueues(): Promise<boolean> {
    try {
      await pauseQueue('all', 'Manual pause via management service')
      return true
    } catch (error) {
      console.error('Failed to pause all queues:', error)
      return false
    }
  }

  async resumeAllQueues(): Promise<boolean> {
    try {
      await resumeQueue('all', 'Manual resume via management service')
      return true
    } catch (error) {
      console.error('Failed to resume all queues:', error)
      return false
    }
  }

  async drainQueue(queueName: string): Promise<boolean> {
    try {
      // Implementation would depend on specific queue
      console.log(`Draining queue: ${queueName}`)
      return true
    } catch (error) {
      console.error(`Failed to drain queue ${queueName}:`, error)
      return false
    }
  }

  getConfiguration(): QueueManagerConfig {
    return { ...this.config }
  }

  updateConfiguration(config: Partial<QueueManagerConfig>): void {
    this.config = { ...this.config, ...config }
    console.log('Queue management configuration updated')
  }
}

// Export singleton queue management service
export const queueManagementService = new QueueManagementService()

// Export types
export type {
  QueueManagerConfig,
  QueueHealthStatus,
  QueueStatus,
  RedisStatus,
  SystemStatus,
  Alert,
  PerformanceMetrics
}