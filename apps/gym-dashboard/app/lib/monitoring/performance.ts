import { logger } from '../logger/logger'

interface PerformanceMetric {
  name: string
  value: number
  unit: 'ms' | 'MB' | 'count' | 'percent'
  tags?: Record<string, string>
}

interface TimerHandle {
  end: (metadata?: Record<string, any>) => number
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = []
  private timers: Map<string, number> = new Map()
  
  /**
   * Start a timer for measuring duration
   */
  startTimer(name: string, tags?: Record<string, string>): TimerHandle {
    const startTime = performance.now()
    const timerId = `${name}_${Date.now()}`
    this.timers.set(timerId, startTime)
    
    return {
      end: (metadata?: Record<string, any>) => {
        const endTime = performance.now()
        const duration = endTime - startTime
        
        this.timers.delete(timerId)
        
        // Log the performance metric
        this.recordMetric({
          name,
          value: duration,
          unit: 'ms',
          tags
        })
        
        // Log if duration exceeds threshold
        const threshold = this.getThreshold(name)
        if (duration > threshold) {
          logger.warn(`Performance warning: ${name} took ${duration.toFixed(2)}ms (threshold: ${threshold}ms)`, {
            metadata: {
              duration,
              threshold,
              tags,
              ...metadata
            }
          })
        }
        
        return duration
      }
    }
  }
  
  /**
   * Get performance threshold for different operations
   */
  private getThreshold(operation: string): number {
    const thresholds: Record<string, number> = {
      'api.request': 1000,      // 1 second for API requests
      'db.query': 100,          // 100ms for database queries
      'external.api': 3000,     // 3 seconds for external APIs
      'ai.generation': 5000,    // 5 seconds for AI generation
      'image.processing': 2000, // 2 seconds for image processing
      'email.send': 2000,       // 2 seconds for sending emails
      'default': 500           // 500ms default
    }
    
    // Find matching threshold by prefix
    for (const [key, value] of Object.entries(thresholds)) {
      if (operation.startsWith(key)) {
        return value
      }
    }
    
    return thresholds.default
  }
  
  /**
   * Record a performance metric
   */
  recordMetric(metric: PerformanceMetric): void {
    this.metrics.push({
      ...metric,
      tags: {
        ...metric.tags,
        timestamp: new Date().toISOString()
      }
    })
    
    // Keep only last 1000 metrics in memory
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000)
    }
    
    logger.debug(`Performance metric: ${metric.name}`, {
      metadata: {
        value: metric.value,
        unit: metric.unit,
        tags: metric.tags
      }
    })
  }
  
  /**
   * Track database query performance
   */
  async trackDatabaseQuery<T>(
    queryName: string,
    queryFn: () => Promise<T>
  ): Promise<T> {
    const timer = this.startTimer(`db.query.${queryName}`)
    
    try {
      const result = await queryFn()
      timer.end({ status: 'success' })
      return result
    } catch (error) {
      timer.end({ status: 'error', error: error instanceof Error ? error.message : 'Unknown error' })
      throw error
    }
  }
  
  /**
   * Track external API call performance
   */
  async trackExternalAPI<T>(
    apiName: string,
    apiCall: () => Promise<T>
  ): Promise<T> {
    const timer = this.startTimer(`external.api.${apiName}`)
    
    try {
      const result = await apiCall()
      timer.end({ status: 'success' })
      return result
    } catch (error) {
      timer.end({ status: 'error', error: error instanceof Error ? error.message : 'Unknown error' })
      throw error
    }
  }
  
  /**
   * Track memory usage
   */
  trackMemoryUsage(): void {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage()
      
      this.recordMetric({
        name: 'memory.heap.used',
        value: usage.heapUsed / 1024 / 1024, // Convert to MB
        unit: 'MB'
      })
      
      this.recordMetric({
        name: 'memory.heap.total',
        value: usage.heapTotal / 1024 / 1024, // Convert to MB
        unit: 'MB'
      })
      
      // Warn if memory usage is high
      const heapUsedPercent = (usage.heapUsed / usage.heapTotal) * 100
      if (heapUsedPercent > 80) {
        logger.warn(`High memory usage: ${heapUsedPercent.toFixed(2)}%`, {
          metadata: {
            heapUsed: usage.heapUsed,
            heapTotal: usage.heapTotal,
            external: usage.external,
            rss: usage.rss
          }
        })
      }
    }
  }
  
  /**
   * Get current performance metrics
   */
  getMetrics(filter?: { name?: string; tags?: Record<string, string> }): PerformanceMetric[] {
    if (!filter) return [...this.metrics]
    
    return this.metrics.filter(metric => {
      if (filter.name && !metric.name.includes(filter.name)) {
        return false
      }
      
      if (filter.tags) {
        for (const [key, value] of Object.entries(filter.tags)) {
          if (metric.tags?.[key] !== value) {
            return false
          }
        }
      }
      
      return true
    })
  }
  
  /**
   * Get performance summary
   */
  getSummary(): Record<string, any> {
    const summary: Record<string, any> = {
      totalMetrics: this.metrics.length,
      averages: {},
      counts: {},
      slowestOperations: []
    }
    
    // Group metrics by name
    const grouped = this.metrics.reduce((acc, metric) => {
      if (!acc[metric.name]) {
        acc[metric.name] = []
      }
      acc[metric.name].push(metric)
      return acc
    }, {} as Record<string, PerformanceMetric[]>)
    
    // Calculate averages and counts
    for (const [name, metrics] of Object.entries(grouped)) {
      const values = metrics.map(m => m.value)
      const avg = values.reduce((a, b) => a + b, 0) / values.length
      
      summary.averages[name] = {
        value: avg.toFixed(2),
        unit: metrics[0].unit,
        count: metrics.length
      }
      
      summary.counts[name] = metrics.length
    }
    
    // Find slowest operations
    const timedMetrics = this.metrics
      .filter(m => m.unit === 'ms')
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
    
    summary.slowestOperations = timedMetrics.map(m => ({
      name: m.name,
      duration: `${m.value.toFixed(2)}ms`,
      timestamp: m.tags?.timestamp
    }))
    
    return summary
  }
  
  /**
   * Clear all metrics (useful for testing)
   */
  clear(): void {
    this.metrics = []
    this.timers.clear()
  }
  
  /**
   * Start periodic memory monitoring
   */
  startMemoryMonitoring(intervalMs: number = 60000): () => void {
    const interval = setInterval(() => {
      this.trackMemoryUsage()
    }, intervalMs)
    
    // Return cleanup function
    return () => clearInterval(interval)
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor()

// Convenience exports
export const startTimer = performanceMonitor.startTimer.bind(performanceMonitor)
export const trackDatabaseQuery = performanceMonitor.trackDatabaseQuery.bind(performanceMonitor)
export const trackExternalAPI = performanceMonitor.trackExternalAPI.bind(performanceMonitor)

// Example usage:
/*
// In your API routes:
import { startTimer, trackDatabaseQuery } from '@/app/lib/monitoring/performance'

// Simple timing
const timer = startTimer('api.request.createLead')
// ... do work ...
timer.end({ leadId: lead.id })

// Database query tracking
const leads = await trackDatabaseQuery('getLeads', async () => {
  return await supabase.from('leads').select('*')
})

// External API tracking
const aiResponse = await trackExternalAPI('anthropic', async () => {
  return await anthropic.messages.create(...)
})
*/