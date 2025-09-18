import type {
  QueryPerformanceMetrics,
  CacheMetrics,
  ReportType,
  ReportError,
} from "./types";

// ====================
// PERFORMANCE MONITORING
// ====================

interface PerformanceMetricsStore {
  queries: Map<string, QueryPerformanceMetrics[]>;
  cache: Map<string, CacheMetrics>;
  errors: ReportError[];
}

// In-memory store for performance metrics (consider using Redis in production)
const metricsStore: PerformanceMetricsStore = {
  queries: new Map(),
  cache: new Map(),
  errors: [],
};

// ====================
// QUERY PERFORMANCE TRACKING
// ====================

/**
 * Start tracking a query performance
 */
export function startQueryTracking(queryId: string): number {
  return performance.now();
}

/**
 * End tracking and record query performance
 */
export function endQueryTracking(
  queryId: string,
  startTime: number,
  organizationId: string,
  reportType: ReportType,
  filters: Record<string, any>,
  rowCount: number,
  cacheHit: boolean = false,
  cacheKey?: string,
): void {
  const endTime = performance.now();
  const executionTime = endTime - startTime;

  const metrics: QueryPerformanceMetrics = {
    query_id: queryId,
    organization_id: organizationId,
    report_type: reportType,
    filters,
    execution_time_ms: executionTime,
    row_count: rowCount,
    cache_hit: cacheHit,
    cache_key: cacheKey,
    executed_at: new Date().toISOString(),
  };

  recordQueryMetrics(metrics);

  // Log slow queries
  if (executionTime > 5000) {
    // 5 seconds
    console.warn("Slow query detected:", {
      queryId,
      executionTime: `${executionTime.toFixed(2)}ms`,
      reportType,
      rowCount,
      organizationId,
    });
  }
}

/**
 * Record query performance metrics
 */
function recordQueryMetrics(metrics: QueryPerformanceMetrics): void {
  const key = `${metrics.organization_id}:${metrics.report_type}`;

  if (!metricsStore.queries.has(key)) {
    metricsStore.queries.set(key, []);
  }

  const queries = metricsStore.queries.get(key)!;
  queries.push(metrics);

  // Keep only the last 1000 queries per org/report type
  if (queries.length > 1000) {
    queries.splice(0, queries.length - 1000);
  }

  // TODO: In production, consider persisting to database or external metrics service
}

/**
 * Get query performance statistics
 */
export function getQueryPerformanceStats(
  organizationId: string,
  reportType?: ReportType,
  timeRange?: { from: Date; to: Date },
): {
  avgExecutionTime: number;
  medianExecutionTime: number;
  p95ExecutionTime: number;
  totalQueries: number;
  slowQueries: number;
  cacheHitRate: number;
  avgRowCount: number;
} {
  let allQueries: QueryPerformanceMetrics[] = [];

  if (reportType) {
    const key = `${organizationId}:${reportType}`;
    allQueries = metricsStore.queries.get(key) || [];
  } else {
    // Aggregate across all report types for the organization
    for (const [key, queries] of metricsStore.queries.entries()) {
      if (key.startsWith(`${organizationId}:`)) {
        allQueries.push(...queries);
      }
    }
  }

  // Filter by time range if provided
  if (timeRange) {
    allQueries = allQueries.filter((q) => {
      const executedAt = new Date(q.executed_at);
      return executedAt >= timeRange.from && executedAt <= timeRange.to;
    });
  }

  if (allQueries.length === 0) {
    return {
      avgExecutionTime: 0,
      medianExecutionTime: 0,
      p95ExecutionTime: 0,
      totalQueries: 0,
      slowQueries: 0,
      cacheHitRate: 0,
      avgRowCount: 0,
    };
  }

  // Sort by execution time for percentile calculations
  const sortedTimes = allQueries
    .map((q) => q.execution_time_ms)
    .sort((a, b) => a - b);

  const cacheHits = allQueries.filter((q) => q.cache_hit).length;
  const slowQueries = allQueries.filter(
    (q) => q.execution_time_ms > 5000,
  ).length;

  return {
    avgExecutionTime:
      sortedTimes.reduce((sum, time) => sum + time, 0) / sortedTimes.length,
    medianExecutionTime: sortedTimes[Math.floor(sortedTimes.length / 2)],
    p95ExecutionTime: sortedTimes[Math.floor(sortedTimes.length * 0.95)],
    totalQueries: allQueries.length,
    slowQueries,
    cacheHitRate: (cacheHits / allQueries.length) * 100,
    avgRowCount:
      allQueries.reduce((sum, q) => sum + q.row_count, 0) / allQueries.length,
  };
}

// ====================
// CACHE PERFORMANCE TRACKING
// ====================

/**
 * Record cache hit/miss
 */
export function recordCacheEvent(cacheKey: string, hit: boolean): void {
  if (!metricsStore.cache.has(cacheKey)) {
    metricsStore.cache.set(cacheKey, {
      cache_key: cacheKey,
      hit_count: 0,
      miss_count: 0,
      hit_rate: 0,
      last_hit: "",
      last_miss: "",
      ttl_seconds: 0,
    });
  }

  const metrics = metricsStore.cache.get(cacheKey)!;
  const now = new Date().toISOString();

  if (hit) {
    metrics.hit_count++;
    metrics.last_hit = now;
  } else {
    metrics.miss_count++;
    metrics.last_miss = now;
  }

  // Recalculate hit rate
  const totalRequests = metrics.hit_count + metrics.miss_count;
  metrics.hit_rate = (metrics.hit_count / totalRequests) * 100;
}

/**
 * Get cache performance statistics
 */
export function getCachePerformanceStats(organizationId?: string): {
  totalKeys: number;
  overallHitRate: number;
  topPerformingKeys: Array<{
    key: string;
    hitRate: number;
    totalRequests: number;
  }>;
  underPerformingKeys: Array<{
    key: string;
    hitRate: number;
    totalRequests: number;
  }>;
} {
  let relevantMetrics: CacheMetrics[] = [];

  if (organizationId) {
    // Filter metrics for specific organization
    for (const [key, metrics] of metricsStore.cache.entries()) {
      if (key.includes(organizationId)) {
        relevantMetrics.push(metrics);
      }
    }
  } else {
    relevantMetrics = Array.from(metricsStore.cache.values());
  }

  if (relevantMetrics.length === 0) {
    return {
      totalKeys: 0,
      overallHitRate: 0,
      topPerformingKeys: [],
      underPerformingKeys: [],
    };
  }

  const totalHits = relevantMetrics.reduce((sum, m) => sum + m.hit_count, 0);
  const totalMisses = relevantMetrics.reduce((sum, m) => sum + m.miss_count, 0);
  const overallHitRate = (totalHits / (totalHits + totalMisses)) * 100;

  // Sort by hit rate for top/bottom performers
  const sortedMetrics = relevantMetrics
    .map((m) => ({
      key: m.cache_key,
      hitRate: m.hit_rate,
      totalRequests: m.hit_count + m.miss_count,
    }))
    .filter((m) => m.totalRequests >= 5) // Only include keys with meaningful usage
    .sort((a, b) => b.hitRate - a.hitRate);

  return {
    totalKeys: relevantMetrics.length,
    overallHitRate,
    topPerformingKeys: sortedMetrics.slice(0, 10),
    underPerformingKeys: sortedMetrics.slice(-10).reverse(),
  };
}

// ====================
// ERROR TRACKING
// ====================

/**
 * Record a report error
 */
export function recordReportError(
  code: string,
  message: string,
  details?: Record<string, any>,
  queryId?: string,
): void {
  const error: ReportError = {
    code,
    message,
    details,
    timestamp: new Date().toISOString(),
    query_id: queryId,
  };

  metricsStore.errors.push(error);

  // Keep only the last 1000 errors
  if (metricsStore.errors.length > 1000) {
    metricsStore.errors.splice(0, metricsStore.errors.length - 1000);
  }

  // Log critical errors
  if (code.startsWith("CRITICAL_")) {
    console.error("Critical report error:", error);
  }
}

/**
 * Get error statistics
 */
export function getErrorStats(timeRange?: { from: Date; to: Date }): {
  totalErrors: number;
  errorsByCode: Record<string, number>;
  recentErrors: ReportError[];
  errorRate: number; // errors per hour
} {
  let errors = metricsStore.errors;

  // Filter by time range if provided
  if (timeRange) {
    errors = errors.filter((e) => {
      const errorTime = new Date(e.timestamp);
      return errorTime >= timeRange.from && errorTime <= timeRange.to;
    });
  }

  // Group errors by code
  const errorsByCode = errors.reduce(
    (acc, error) => {
      acc[error.code] = (acc[error.code] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  // Calculate error rate (errors per hour)
  const timeRangeHours = timeRange
    ? (timeRange.to.getTime() - timeRange.from.getTime()) / (1000 * 60 * 60)
    : 24; // Default to last 24 hours

  const errorRate = errors.length / timeRangeHours;

  return {
    totalErrors: errors.length,
    errorsByCode,
    recentErrors: errors.slice(-10).reverse(), // Last 10 errors, most recent first
    errorRate,
  };
}

// ====================
// PERFORMANCE ALERTS
// ====================

interface PerformanceAlert {
  type:
    | "slow_query"
    | "high_error_rate"
    | "low_cache_hit_rate"
    | "high_memory_usage";
  severity: "warning" | "critical";
  message: string;
  timestamp: string;
  organizationId?: string;
  reportType?: ReportType;
  details?: Record<string, any>;
}

/**
 * Check for performance issues and generate alerts
 */
export function checkPerformanceAlerts(
  organizationId: string,
): PerformanceAlert[] {
  const alerts: PerformanceAlert[] = [];
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  // Check query performance
  const queryStats = getQueryPerformanceStats(organizationId, undefined, {
    from: oneHourAgo,
    to: now,
  });

  if (queryStats.p95ExecutionTime > 10000) {
    // 10 seconds
    alerts.push({
      type: "slow_query",
      severity: "critical",
      message: `95th percentile query time is ${(queryStats.p95ExecutionTime / 1000).toFixed(1)}s`,
      timestamp: now.toISOString(),
      organizationId,
      details: {
        p95Time: queryStats.p95ExecutionTime,
        totalQueries: queryStats.totalQueries,
      },
    });
  }

  // Check cache performance
  const cacheStats = getCachePerformanceStats(organizationId);

  if (cacheStats.overallHitRate < 70 && cacheStats.totalKeys > 0) {
    alerts.push({
      type: "low_cache_hit_rate",
      severity: "warning",
      message: `Cache hit rate is ${cacheStats.overallHitRate.toFixed(1)}%`,
      timestamp: now.toISOString(),
      organizationId,
      details: {
        hitRate: cacheStats.overallHitRate,
        totalKeys: cacheStats.totalKeys,
      },
    });
  }

  // Check error rate
  const errorStats = getErrorStats({ from: oneHourAgo, to: now });

  if (errorStats.errorRate > 5) {
    // More than 5 errors per hour
    alerts.push({
      type: "high_error_rate",
      severity: "critical",
      message: `High error rate: ${errorStats.errorRate.toFixed(1)} errors/hour`,
      timestamp: now.toISOString(),
      organizationId,
      details: {
        errorRate: errorStats.errorRate,
        totalErrors: errorStats.totalErrors,
      },
    });
  }

  return alerts;
}

// ====================
// PERFORMANCE DASHBOARD DATA
// ====================

/**
 * Get comprehensive performance dashboard data
 */
export function getPerformanceDashboard(organizationId: string): {
  overview: {
    totalQueries24h: number;
    avgResponseTime: number;
    cacheHitRate: number;
    errorRate: number;
  };
  queryStats: ReturnType<typeof getQueryPerformanceStats>;
  cacheStats: ReturnType<typeof getCachePerformanceStats>;
  errorStats: ReturnType<typeof getErrorStats>;
  alerts: PerformanceAlert[];
  trends: {
    queryTrends: Array<{ hour: string; avgTime: number; count: number }>;
    errorTrends: Array<{ hour: string; errorCount: number }>;
  };
} {
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const queryStats = getQueryPerformanceStats(organizationId, undefined, {
    from: twentyFourHoursAgo,
    to: now,
  });

  const cacheStats = getCachePerformanceStats(organizationId);
  const errorStats = getErrorStats({ from: twentyFourHoursAgo, to: now });
  const alerts = checkPerformanceAlerts(organizationId);

  // Generate hourly trends
  const queryTrends = generateQueryTrends(
    organizationId,
    twentyFourHoursAgo,
    now,
  );
  const errorTrends = generateErrorTrends(
    organizationId,
    twentyFourHoursAgo,
    now,
  );

  return {
    overview: {
      totalQueries24h: queryStats.totalQueries,
      avgResponseTime: queryStats.avgExecutionTime,
      cacheHitRate: queryStats.cacheHitRate,
      errorRate: errorStats.errorRate,
    },
    queryStats,
    cacheStats,
    errorStats,
    alerts,
    trends: {
      queryTrends,
      errorTrends,
    },
  };
}

/**
 * Generate hourly query trends
 */
function generateQueryTrends(
  organizationId: string,
  from: Date,
  to: Date,
): Array<{ hour: string; avgTime: number; count: number }> {
  const trends: Array<{ hour: string; avgTime: number; count: number }> = [];
  const hourMs = 60 * 60 * 1000;

  for (let time = from.getTime(); time < to.getTime(); time += hourMs) {
    const hourStart = new Date(time);
    const hourEnd = new Date(time + hourMs);

    // Get queries for this hour
    let hourQueries: QueryPerformanceMetrics[] = [];
    for (const [key, queries] of metricsStore.queries.entries()) {
      if (key.startsWith(`${organizationId}:`)) {
        const filtered = queries.filter((q) => {
          const executedAt = new Date(q.executed_at);
          return executedAt >= hourStart && executedAt < hourEnd;
        });
        hourQueries.push(...filtered);
      }
    }

    const avgTime =
      hourQueries.length > 0
        ? hourQueries.reduce((sum, q) => sum + q.execution_time_ms, 0) /
          hourQueries.length
        : 0;

    trends.push({
      hour: hourStart.toISOString(),
      avgTime,
      count: hourQueries.length,
    });
  }

  return trends;
}

/**
 * Generate hourly error trends
 */
function generateErrorTrends(
  organizationId: string,
  from: Date,
  to: Date,
): Array<{ hour: string; errorCount: number }> {
  const trends: Array<{ hour: string; errorCount: number }> = [];
  const hourMs = 60 * 60 * 1000;

  for (let time = from.getTime(); time < to.getTime(); time += hourMs) {
    const hourStart = new Date(time);
    const hourEnd = new Date(time + hourMs);

    // Count errors for this hour
    const hourErrors = metricsStore.errors.filter((e) => {
      const errorTime = new Date(e.timestamp);
      return errorTime >= hourStart && errorTime < hourEnd;
    });

    trends.push({
      hour: hourStart.toISOString(),
      errorCount: hourErrors.length,
    });
  }

  return trends;
}

// ====================
// CLEANUP AND MAINTENANCE
// ====================

/**
 * Clean up old performance data
 */
export function cleanupPerformanceData(retentionDays: number = 7): void {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  // Clean up old query metrics
  for (const [key, queries] of metricsStore.queries.entries()) {
    const filtered = queries.filter(
      (q) => new Date(q.executed_at) > cutoffDate,
    );
    metricsStore.queries.set(key, filtered);
  }

  // Clean up old errors
  metricsStore.errors = metricsStore.errors.filter(
    (e) => new Date(e.timestamp) > cutoffDate,
  );

  console.log(`Cleaned up performance data older than ${retentionDays} days`);
}

/**
 * Export performance metrics for external analysis
 */
export function exportPerformanceMetrics(organizationId?: string): {
  queries: QueryPerformanceMetrics[];
  cache: CacheMetrics[];
  errors: ReportError[];
  exportedAt: string;
} {
  let queries: QueryPerformanceMetrics[] = [];
  let cache: CacheMetrics[] = [];

  if (organizationId) {
    // Export for specific organization
    for (const [key, queryList] of metricsStore.queries.entries()) {
      if (key.startsWith(`${organizationId}:`)) {
        queries.push(...queryList);
      }
    }

    for (const [key, cacheMetrics] of metricsStore.cache.entries()) {
      if (key.includes(organizationId)) {
        cache.push(cacheMetrics);
      }
    }
  } else {
    // Export all data
    for (const queryList of metricsStore.queries.values()) {
      queries.push(...queryList);
    }
    cache = Array.from(metricsStore.cache.values());
  }

  return {
    queries,
    cache,
    errors: metricsStore.errors,
    exportedAt: new Date().toISOString(),
  };
}
