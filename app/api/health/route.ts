import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { performanceMonitor } from '@/app/lib/monitoring/performance'
import { logger } from '@/app/lib/logger/logger'
import { headers } from 'next/headers'

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  uptime: number
  checks: {
    database: CheckResult
    authentication: CheckResult
    performance: CheckResult
  }
  metrics: {
    memory: MemoryMetrics
    performance: PerformanceMetrics
  }
  version: {
    app: string
    node: string
    nextjs: string
  }
}

interface CheckResult {
  status: 'pass' | 'fail'
  message: string
  duration?: number
  error?: string
}

interface MemoryMetrics {
  used: string
  total: string
  percentage: number
}

interface PerformanceMetrics {
  averageResponseTime: string
  totalRequests: number
  slowRequests: number
}

// Track app start time
const appStartTime = Date.now()

export async function GET(request: NextRequest) {
  const startTime = performance.now()
  const healthCheck: HealthCheckResult = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: Date.now() - appStartTime,
    checks: {
      database: { status: 'pass', message: 'Not checked' },
      authentication: { status: 'pass', message: 'Not checked' },
      performance: { status: 'pass', message: 'Not checked' }
    },
    metrics: {
      memory: { used: '0MB', total: '0MB', percentage: 0 },
      performance: {
        averageResponseTime: '0ms',
        totalRequests: 0,
        slowRequests: 0
      }
    },
    version: {
      app: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
      node: process.version,
      nextjs: process.env.NEXT_RUNTIME === 'edge' ? 'edge' : 'nodejs'
    }
  }
  
  try {
    // 1. Check database connection
    const dbTimer = performanceMonitor.startTimer('health.database')
    try {
      const supabase = await createClient()
      const { count, error } = await supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
      
      const dbDuration = dbTimer.end()
      
      if (error) throw error
      
      healthCheck.checks.database = {
        status: 'pass',
        message: 'Database connection successful',
        duration: dbDuration
      }
    } catch (error) {
      const dbDuration = dbTimer.end()
      healthCheck.checks.database = {
        status: 'fail',
        message: 'Database connection failed',
        duration: dbDuration,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
      healthCheck.status = 'unhealthy'
    }
    
    // 2. Check authentication service
    const authTimer = performanceMonitor.startTimer('health.auth')
    try {
      const supabase = await createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const authDuration = authTimer.end()
      
      healthCheck.checks.authentication = {
        status: 'pass',
        message: 'Authentication service operational',
        duration: authDuration
      }
    } catch (error) {
      const authDuration = authTimer.end()
      healthCheck.checks.authentication = {
        status: 'fail',
        message: 'Authentication service error',
        duration: authDuration,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
      healthCheck.status = 'degraded'
    }
    
    // 3. Check performance metrics
    const perfTimer = performanceMonitor.startTimer('health.performance')
    try {
      // Get performance summary
      const perfSummary = performanceMonitor.getSummary()
      const apiMetrics = perfSummary.averages['api.request'] || { value: 0, count: 0 }
      
      // Check if average response time is acceptable
      const avgResponseTime = parseFloat(apiMetrics.value || '0')
      const slowThreshold = 1000 // 1 second
      
      if (avgResponseTime > slowThreshold) {
        healthCheck.checks.performance = {
          status: 'fail',
          message: `Average response time too high: ${avgResponseTime.toFixed(2)}ms`,
          duration: perfTimer.end()
        }
        healthCheck.status = 'degraded'
      } else {
        healthCheck.checks.performance = {
          status: 'pass',
          message: 'Performance metrics within acceptable range',
          duration: perfTimer.end()
        }
      }
      
      // Add performance metrics
      healthCheck.metrics.performance = {
        averageResponseTime: `${avgResponseTime.toFixed(2)}ms`,
        totalRequests: apiMetrics.count || 0,
        slowRequests: perfSummary.slowestOperations?.length || 0
      }
    } catch (error) {
      perfTimer.end()
      healthCheck.checks.performance = {
        status: 'fail',
        message: 'Could not retrieve performance metrics',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
    
    // 4. Get memory metrics
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const memUsage = process.memoryUsage()
      const heapUsedMB = memUsage.heapUsed / 1024 / 1024
      const heapTotalMB = memUsage.heapTotal / 1024 / 1024
      const percentage = (memUsage.heapUsed / memUsage.heapTotal) * 100
      
      healthCheck.metrics.memory = {
        used: `${heapUsedMB.toFixed(2)}MB`,
        total: `${heapTotalMB.toFixed(2)}MB`,
        percentage: parseFloat(percentage.toFixed(2))
      }
      
      // Check for high memory usage
      if (percentage > 80) {
        healthCheck.status = 'degraded'
        logger.warn('High memory usage detected in health check', {
          metadata: { percentage, heapUsedMB, heapTotalMB }
        })
      }
    }
    
    // Calculate total duration
    const totalDuration = performance.now() - startTime
    
    // Log health check
    logger.info('Health check completed', {
      metadata: {
        status: healthCheck.status,
        duration: totalDuration,
        checks: Object.entries(healthCheck.checks).reduce((acc, [key, value]) => {
          acc[key] = value.status
          return acc
        }, {} as Record<string, string>)
      }
    })
    
    // Set appropriate status code
    const statusCode = healthCheck.status === 'healthy' ? 200 : 
                      healthCheck.status === 'degraded' ? 200 : 503
    
    // Add cache headers to prevent excessive health checks
    const response = NextResponse.json(healthCheck, { status: statusCode })
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    response.headers.set('X-Health-Status', healthCheck.status)
    response.headers.set('X-Response-Time', `${totalDuration.toFixed(2)}ms`)
    
    return response
    
  } catch (error) {
    logger.error('Health check failed', error as Error)
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: Date.now() - appStartTime,
      error: error instanceof Error ? error.message : 'Unknown error',
      checks: healthCheck.checks,
      metrics: healthCheck.metrics,
      version: healthCheck.version
    }, { status: 503 })
  }
}

// Simple health check endpoint (for uptime monitors)
export async function HEAD(request: NextRequest) {
  try {
    // Quick database check
    const supabase = await createClient()
    const { error } = await supabase.from('leads').select('id', { count: 'exact', head: true })
    
    if (error) {
      return new NextResponse(null, { status: 503 })
    }
    
    return new NextResponse(null, { status: 200 })
  } catch (error) {
    return new NextResponse(null, { status: 503 })
  }
}

// Example response:
/*
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600000,
  "checks": {
    "database": {
      "status": "pass",
      "message": "Database connection successful",
      "duration": 45.2
    },
    "authentication": {
      "status": "pass",
      "message": "Authentication service operational",
      "duration": 12.5
    },
    "performance": {
      "status": "pass",
      "message": "Performance metrics within acceptable range",
      "duration": 2.1
    }
  },
  "metrics": {
    "memory": {
      "used": "125.45MB",
      "total": "512.00MB",
      "percentage": 24.5
    },
    "performance": {
      "averageResponseTime": "234.56ms",
      "totalRequests": 1543,
      "slowRequests": 5
    }
  },
  "version": {
    "app": "1.0.0",
    "node": "v18.17.0",
    "nextjs": "nodejs"
  }
}
*/