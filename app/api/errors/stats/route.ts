/**
 * Error Statistics API Endpoint
 * 
 * GET /api/errors/stats - Get error statistics for monitoring dashboard
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/app/lib/api/auth-check'
import { handleApiError } from '@/app/lib/errors/error-handler'
import { ValidationError } from '@/app/lib/errors/error-classes'
import { errorLogger } from '@/app/lib/errors/error-logger'
import { errorMonitor } from '@/app/lib/errors/error-monitoring'
import { globalRecoveryManager } from '@/app/lib/errors/error-recovery'
import { createAdminClient } from '@/app/lib/supabase/admin'

export async function GET(request: NextRequest) {
  try {
    // Check authentication and get organization
    const userWithOrg = await requireAuth()
    
    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const timeRange = searchParams.get('time_range') || 'day'
    const organizationId = searchParams.get('organization_id')
    const includeTrends = searchParams.get('include_trends') === 'true'
    const includeCircuitBreakers = searchParams.get('include_circuit_breakers') === 'true'
    const includeAlerts = searchParams.get('include_alerts') === 'true'
    
    // Validate time range
    const validTimeRanges = ['hour', 'day', 'week', 'month']
    if (!validTimeRanges.includes(timeRange)) {
      throw ValidationError.invalid('time_range', timeRange, 'one of: hour, day, week, month')
    }

    // Determine which organization to query
    const targetOrgId = userWithOrg.role === 'owner' ? organizationId : userWithOrg.organizationId

    // Get basic error statistics
    const errorStats = await errorLogger.getErrorStats(targetOrgId, timeRange as any)

    // Get detailed statistics from database
    const supabase = createAdminClient()
    
    // Calculate time window
    const now = new Date()
    let startTime: Date
    switch (timeRange) {
      case 'hour':
        startTime = new Date(now.getTime() - 60 * 60 * 1000)
        break
      case 'day':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        break
      case 'week':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'month':
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      default:
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    }

    // Build query for detailed stats
    let query = supabase
      .from('error_logs')
      .select('error_code, status_code, endpoint, timestamp, response_time')
      .eq('level', 'error')
      .gte('timestamp', startTime.toISOString())

    if (targetOrgId) {
      query = query.eq('organization_id', targetOrgId)
    }

    const { data: errorData } = await query

    // Calculate additional metrics
    const additionalStats = calculateAdditionalStats(errorData || [])

    // Prepare response data
    const responseData: any = {
      summary: {
        totalErrors: errorStats.totalErrors,
        criticalErrors: errorStats.criticalErrors,
        retryableErrors: errorStats.retryableErrors,
        errorRate: calculateErrorRate(errorStats.totalErrors, timeRange),
        ...additionalStats
      },
      breakdown: {
        byErrorCode: errorStats.errorsByCode,
        byOrganization: errorStats.errorsByOrganization,
        byEndpoint: errorStats.errorsByEndpoint,
        byTimeRange: errorStats.errorsByTimeRange
      },
      performance: {
        avgResponseTime: errorStats.avgResponseTime
      },
      filters: {
        timeRange,
        organizationId: targetOrgId,
        startTime: startTime.toISOString(),
        endTime: now.toISOString()
      },
      metadata: {
        userRole: userWithOrg.role,
        organizationId: userWithOrg.organizationId,
        generatedAt: now.toISOString()
      }
    }

    // Add trends if requested
    if (includeTrends) {
      responseData.trends = await errorMonitor.getErrorTrends(timeRange as any, targetOrgId)
    }

    // Add circuit breaker status if requested
    if (includeCircuitBreakers) {
      responseData.circuitBreakers = globalRecoveryManager.getCircuitBreakerStatus()
      responseData.degradation = globalRecoveryManager.getDegradationStatus()
    }

    // Add recent alerts if requested
    if (includeAlerts) {
      const alertsQuery = supabase
        .from('alert_history')
        .select('*')
        .order('timestamp', { ascending: false })
        .gte('timestamp', startTime.toISOString())
        .limit(10)

      if (targetOrgId) {
        alertsQuery.eq('organization_id', targetOrgId)
      }

      const { data: alerts } = await alertsQuery
      responseData.recentAlerts = alerts || []
    }

    return NextResponse.json({
      success: true,
      data: responseData
    })

  } catch (error) {
    return handleApiError(error, request, {
      organizationId: (await requireAuth().catch(() => ({ organizationId: undefined }))).organizationId,
      endpoint: '/api/errors/stats'
    })
  }
}

/**
 * Calculate additional statistics from error data
 */
function calculateAdditionalStats(errorData: any[]) {
  const stats = {
    uniqueEndpoints: new Set<string>(),
    statusCodeBreakdown: {} as Record<number, number>,
    avgResponseTime: 0,
    slowestEndpoints: [] as { endpoint: string; avgResponseTime: number }[],
    mostFrequentErrors: [] as { errorCode: string; count: number; percentage: number }[]
  }

  let totalResponseTime = 0
  let responseTimeCount = 0
  const endpointResponseTimes = {} as Record<string, number[]>
  const errorCodeCounts = {} as Record<string, number>

  errorData.forEach(error => {
    // Track unique endpoints
    if (error.endpoint) {
      stats.uniqueEndpoints.add(error.endpoint)
    }

    // Track status codes
    if (error.status_code) {
      stats.statusCodeBreakdown[error.status_code] = (stats.statusCodeBreakdown[error.status_code] || 0) + 1
    }

    // Track response times
    if (error.response_time) {
      totalResponseTime += error.response_time
      responseTimeCount++

      // Track by endpoint
      if (error.endpoint) {
        if (!endpointResponseTimes[error.endpoint]) {
          endpointResponseTimes[error.endpoint] = []
        }
        endpointResponseTimes[error.endpoint].push(error.response_time)
      }
    }

    // Track error codes
    if (error.error_code) {
      errorCodeCounts[error.error_code] = (errorCodeCounts[error.error_code] || 0) + 1
    }
  })

  // Calculate averages
  stats.avgResponseTime = responseTimeCount > 0 ? totalResponseTime / responseTimeCount : 0

  // Calculate slowest endpoints
  stats.slowestEndpoints = Object.entries(endpointResponseTimes)
    .map(([endpoint, times]) => ({
      endpoint,
      avgResponseTime: times.reduce((sum, time) => sum + time, 0) / times.length
    }))
    .sort((a, b) => b.avgResponseTime - a.avgResponseTime)
    .slice(0, 5)

  // Calculate most frequent errors
  const totalErrors = errorData.length
  stats.mostFrequentErrors = Object.entries(errorCodeCounts)
    .map(([errorCode, count]) => ({
      errorCode,
      count,
      percentage: totalErrors > 0 ? (count / totalErrors) * 100 : 0
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  return {
    ...stats,
    uniqueEndpoints: stats.uniqueEndpoints.size
  }
}

/**
 * Calculate error rate based on time range
 */
function calculateErrorRate(totalErrors: number, timeRange: string): number {
  let timeInMinutes: number
  
  switch (timeRange) {
    case 'hour':
      timeInMinutes = 60
      break
    case 'day':
      timeInMinutes = 24 * 60
      break
    case 'week':
      timeInMinutes = 7 * 24 * 60
      break
    case 'month':
      timeInMinutes = 30 * 24 * 60
      break
    default:
      timeInMinutes = 24 * 60
  }
  
  return totalErrors / timeInMinutes // errors per minute
}