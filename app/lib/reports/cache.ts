import { generateCacheKey } from "./query";
import type {
  ReportType,
  QueryPerformanceMetrics,
  CacheMetrics,
} from "./types";

// ====================
// CACHE CONFIGURATION
// ====================

export const CACHE_CONFIG = {
  // Cache TTL in seconds
  DEFAULT_TTL: 1800, // 30 minutes
  SHORT_TTL: 300, // 5 minutes for real-time data
  LONG_TTL: 3600, // 1 hour for historical data

  // SWR configuration
  SWR_CONFIG: {
    refreshInterval: 30000, // 30 seconds
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    shouldRetryOnError: true,
    errorRetryInterval: 5000,
    errorRetryCount: 3,
    dedupingInterval: 2000,
  },

  // Cache key prefixes
  PREFIXES: {
    REPORT_DATA: "report_data",
    CHART_DATA: "chart_data",
    FILTER_OPTIONS: "filter_options",
    MATERIALIZED_VIEW: "mv",
  },
} as const;

// ====================
// CACHE KEY GENERATION
// ====================

/**
 * Generate cache key for report data
 */
export function generateReportCacheKey(
  reportType: ReportType,
  organizationId: string,
  filters: Record<string, any>,
): string {
  const baseKey = generateCacheKey(reportType, organizationId, filters);
  return `${CACHE_CONFIG.PREFIXES.REPORT_DATA}:${baseKey}`;
}

/**
 * Generate cache key for chart data
 */
export function generateChartCacheKey(
  reportType: ReportType,
  organizationId: string,
  chartType: string,
  filters: Record<string, any>,
): string {
  const baseKey = generateCacheKey(reportType, organizationId, filters);
  return `${CACHE_CONFIG.PREFIXES.CHART_DATA}:${chartType}:${baseKey}`;
}

/**
 * Generate cache key for filter options
 */
export function generateFilterOptionsCacheKey(
  organizationId: string,
  filterType: string,
): string {
  return `${CACHE_CONFIG.PREFIXES.FILTER_OPTIONS}:${organizationId}:${filterType}`;
}

/**
 * Generate cache key for materialized view data
 */
export function generateMaterializedViewCacheKey(
  viewName: string,
  organizationId: string,
  params?: Record<string, any>,
): string {
  const paramString = params ? `:${JSON.stringify(params)}` : "";
  return `${CACHE_CONFIG.PREFIXES.MATERIALIZED_VIEW}:${viewName}:${organizationId}${paramString}`;
}

// ====================
// CACHE TTL LOGIC
// ====================

/**
 * Determine appropriate TTL based on data characteristics
 */
export function getCacheTTL(
  reportType: ReportType,
  filters: Record<string, any>,
): number {
  // Real-time data (includes future dates or current day)
  if (filters.include_future || isCurrentDayQuery(filters)) {
    return CACHE_CONFIG.SHORT_TTL;
  }

  // Historical data (older than 7 days)
  if (isHistoricalQuery(filters)) {
    return CACHE_CONFIG.LONG_TTL;
  }

  // Default cache time for recent data
  return CACHE_CONFIG.DEFAULT_TTL;
}

/**
 * Check if query includes current day
 */
function isCurrentDayQuery(filters: Record<string, any>): boolean {
  if (!filters.date_to) return true; // No end date means current data

  const queryEndDate = new Date(filters.date_to);
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  return queryEndDate >= today;
}

/**
 * Check if query is for historical data only
 */
function isHistoricalQuery(filters: Record<string, any>): boolean {
  if (!filters.date_to) return false;

  const queryEndDate = new Date(filters.date_to);
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  return queryEndDate < weekAgo;
}

// ====================
// CACHE INVALIDATION
// ====================

/**
 * Get cache invalidation patterns for different events
 */
export function getCacheInvalidationPatterns(
  eventType: string,
  organizationId: string,
  metadata?: Record<string, any>,
): string[] {
  const patterns: string[] = [];

  switch (eventType) {
    case "booking_created":
    case "booking_updated":
    case "booking_cancelled":
      patterns.push(
        `${CACHE_CONFIG.PREFIXES.REPORT_DATA}:attendance:${organizationId}:*`,
        `${CACHE_CONFIG.PREFIXES.CHART_DATA}:*:attendance:${organizationId}:*`,
      );
      break;

    case "invoice_created":
    case "invoice_updated":
    case "payment_received":
      patterns.push(
        `${CACHE_CONFIG.PREFIXES.REPORT_DATA}:invoice:${organizationId}:*`,
        `${CACHE_CONFIG.PREFIXES.CHART_DATA}:*:invoice:${organizationId}:*`,
      );
      break;

    case "payout_created":
    case "payout_processed":
      patterns.push(
        `${CACHE_CONFIG.PREFIXES.REPORT_DATA}:payout:${organizationId}:*`,
        `${CACHE_CONFIG.PREFIXES.CHART_DATA}:*:payout:${organizationId}:*`,
      );
      break;

    case "discount_code_used":
      patterns.push(
        `${CACHE_CONFIG.PREFIXES.REPORT_DATA}:discount_code:${organizationId}:*`,
        `${CACHE_CONFIG.PREFIXES.CHART_DATA}:*:discount_code:${organizationId}:*`,
      );
      break;

    case "customer_created":
    case "customer_updated":
      // Invalidate filter options
      patterns.push(
        `${CACHE_CONFIG.PREFIXES.FILTER_OPTIONS}:${organizationId}:customer*`,
      );
      break;

    case "class_type_created":
    case "class_type_updated":
      patterns.push(
        `${CACHE_CONFIG.PREFIXES.FILTER_OPTIONS}:${organizationId}:class_type*`,
      );
      break;

    case "venue_created":
    case "venue_updated":
      patterns.push(
        `${CACHE_CONFIG.PREFIXES.FILTER_OPTIONS}:${organizationId}:venue*`,
      );
      break;

    case "instructor_created":
    case "instructor_updated":
      patterns.push(
        `${CACHE_CONFIG.PREFIXES.FILTER_OPTIONS}:${organizationId}:instructor*`,
      );
      break;

    case "membership_created":
    case "membership_updated":
      patterns.push(
        `${CACHE_CONFIG.PREFIXES.FILTER_OPTIONS}:${organizationId}:membership*`,
      );
      break;
  }

  return patterns;
}

/**
 * Invalidate cache based on patterns
 */
export async function invalidateCache(patterns: string[]): Promise<void> {
  // This would integrate with your cache implementation (Redis, in-memory, etc.)
  // For now, we'll create a placeholder that logs the invalidation

  console.log("Cache invalidation requested for patterns:", patterns);

  // TODO: Implement actual cache invalidation
  // Example with Redis:
  // const redis = await getRedisClient();
  // for (const pattern of patterns) {
  //   const keys = await redis.keys(pattern);
  //   if (keys.length > 0) {
  //     await redis.del(...keys);
  //   }
  // }
}

/**
 * Invalidate all cache for an organization
 */
export async function invalidateOrganizationCache(
  organizationId: string,
): Promise<void> {
  const patterns = [
    `${CACHE_CONFIG.PREFIXES.REPORT_DATA}:*:${organizationId}:*`,
    `${CACHE_CONFIG.PREFIXES.CHART_DATA}:*:${organizationId}:*`,
    `${CACHE_CONFIG.PREFIXES.FILTER_OPTIONS}:${organizationId}:*`,
    `${CACHE_CONFIG.PREFIXES.MATERIALIZED_VIEW}:*:${organizationId}:*`,
  ];

  await invalidateCache(patterns);
}

// ====================
// CACHE WARMING
// ====================

/**
 * Get common cache warming queries for an organization
 */
export function getWarmupQueries(organizationId: string): Array<{
  reportType: ReportType;
  filters: Record<string, any>;
  priority: number;
}> {
  const today = new Date();
  const last30Days = new Date();
  last30Days.setDate(today.getDate() - 30);

  const lastWeek = new Date();
  lastWeek.setDate(today.getDate() - 7);

  return [
    // High priority - dashboard data
    {
      reportType: "attendance",
      filters: {
        date_from: last30Days.toISOString(),
        date_to: today.toISOString(),
        group_by: "each",
        page: 1,
        page_size: 50,
      },
      priority: 1,
    },
    {
      reportType: "attendance",
      filters: {
        date_from: lastWeek.toISOString(),
        date_to: today.toISOString(),
        group_by: "day_of_week",
      },
      priority: 1,
    },

    // Medium priority - common reports
    {
      reportType: "invoice",
      filters: {
        date_from: last30Days.toISOString(),
        date_to: today.toISOString(),
        group_by: "each",
        page: 1,
        page_size: 50,
      },
      priority: 2,
    },
    {
      reportType: "attendance",
      filters: {
        date_from: last30Days.toISOString(),
        date_to: today.toISOString(),
        group_by: "class_type",
      },
      priority: 2,
    },

    // Lower priority - less common views
    {
      reportType: "payout",
      filters: {
        date_from: last30Days.toISOString(),
        date_to: today.toISOString(),
        group_by: "instructor",
      },
      priority: 3,
    },
  ];
}

/**
 * Warm cache with common queries
 */
export async function warmCache(organizationId: string): Promise<void> {
  const queries = getWarmupQueries(organizationId);

  // Sort by priority
  queries.sort((a, b) => a.priority - b.priority);

  console.log(
    `Warming cache for organization ${organizationId} with ${queries.length} queries`,
  );

  // TODO: Implement cache warming by pre-executing queries
  // This would involve calling your report APIs to populate cache
}

// ====================
// CACHE MONITORING
// ====================

/**
 * Record cache hit/miss for monitoring
 */
export function recordCacheMetrics(
  cacheKey: string,
  hit: boolean,
  executionTimeMs?: number,
): void {
  // TODO: Implement metrics recording
  console.log(`Cache ${hit ? "HIT" : "MISS"}: ${cacheKey}`, {
    executionTimeMs,
  });
}

/**
 * Record query performance metrics
 */
export function recordQueryPerformance(metrics: QueryPerformanceMetrics): void {
  // TODO: Implement performance metrics recording
  console.log("Query performance:", metrics);
}

/**
 * Get cache statistics for monitoring
 */
export async function getCacheStats(organizationId?: string): Promise<{
  hit_rate: number;
  total_keys: number;
  memory_usage_mb: number;
  top_keys: Array<{ key: string; hits: number; misses: number }>;
}> {
  // TODO: Implement cache statistics retrieval
  return {
    hit_rate: 0.85, // 85%
    total_keys: 1234,
    memory_usage_mb: 45.6,
    top_keys: [],
  };
}

// ====================
// CACHE HELPERS
// ====================

/**
 * Check if data should be cached based on query characteristics
 */
export function shouldCache(
  reportType: ReportType,
  filters: Record<string, any>,
): boolean {
  // Don't cache very specific queries (single record lookups)
  if (filters.page_size === 1) {
    return false;
  }

  // Don't cache real-time data queries with very short time ranges
  if (filters.date_from && filters.date_to) {
    const from = new Date(filters.date_from);
    const to = new Date(filters.date_to);
    const diffHours = (to.getTime() - from.getTime()) / (1000 * 60 * 60);

    if (diffHours < 1) {
      return false; // Less than 1 hour of data
    }
  }

  // Don't cache expensive queries that might timeout
  const hasComplexFilters = Object.keys(filters).length > 8;
  if (hasComplexFilters && filters.page_size > 1000) {
    return false;
  }

  return true;
}

/**
 * Generate cache tags for easier invalidation
 */
export function generateCacheTags(
  reportType: ReportType,
  organizationId: string,
  filters: Record<string, any>,
): string[] {
  const tags = [
    `org:${organizationId}`,
    `report:${reportType}`,
    `group:${filters.group_by || "each"}`,
  ];

  // Add entity-specific tags
  if (filters.customer_id) tags.push(`customer:${filters.customer_id}`);
  if (filters.class_type_id) tags.push(`class_type:${filters.class_type_id}`);
  if (filters.venue_id) tags.push(`venue:${filters.venue_id}`);
  if (filters.instructor_id) tags.push(`instructor:${filters.instructor_id}`);
  if (filters.membership_id) tags.push(`membership:${filters.membership_id}`);

  // Add time-based tags
  if (filters.date_from) {
    const date = new Date(filters.date_from);
    tags.push(`year:${date.getFullYear()}`);
    tags.push(
      `month:${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}`,
    );
  }

  return tags;
}

// ====================
// SWR CONFIGURATION
// ====================

/**
 * Get SWR configuration for report queries
 */
export function getSWRConfig(
  reportType: ReportType,
  filters: Record<string, any>,
) {
  const ttl = getCacheTTL(reportType, filters);

  return {
    ...CACHE_CONFIG.SWR_CONFIG,
    refreshInterval: isCurrentDayQuery(filters) ? 30000 : 300000, // 30s for current data, 5min for historical
    revalidateIfStale: true,
    dedupingInterval: Math.min((ttl * 1000) / 4, 30000), // 1/4 of TTL or 30s max

    // Custom error retry logic
    onErrorRetry: (
      error: any,
      key: string,
      config: any,
      revalidate: any,
      { retryCount }: any,
    ) => {
      // Don't retry on 4xx errors
      if (error.status >= 400 && error.status < 500) return;

      // Max 3 retries
      if (retryCount >= 3) return;

      // Exponential backoff
      setTimeout(
        () => revalidate({ retryCount }),
        Math.pow(2, retryCount) * 1000,
      );
    },
  };
}
