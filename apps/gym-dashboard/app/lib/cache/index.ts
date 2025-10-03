/**
 * Redis Caching Layer - Main Exports
 * 
 * This file provides a centralized export for all caching functionality
 * in the Atlas Fitness CRM system.
 */

// Core cache infrastructure
export { redisClient, getRedisClient, checkRedisHealth } from './redis-client';
export { 
  cacheService,
  getCacheKey,
  getFromCache,
  setInCache,
  getOrSet,
  invalidateCache,
  invalidateOrgCache,
  getCacheStats,
  getCacheHealth,
  CACHE_TTL,
  CACHE_PREFIXES
} from './cache-utils';

// Cached services
export { cachedLeadService } from './cached-lead-service';
export { cachedAnalyticsService } from './cached-analytics-service';
export { cachedOrganizationService } from './cached-organization-service';
export { cachedBookingService } from './cached-booking-service';

// Monitoring and management
export { 
  cacheMonitor,
  type CacheHealthReport,
  type OrganizationCacheMetrics,
  type CacheOptimizationResult,
  type CacheWarmingPlan
} from './cache-monitor';

// Initialization and middleware
export { 
  CacheInitializer,
  initializeCache,
  getCacheConfig,
  createCacheMiddleware,
  type CacheConfig
} from './initialize-cache';

export { 
  cacheMiddleware,
  advancedCacheWarming,
  DEFAULT_WARMING_STRATEGIES,
  type CacheWarmingStrategy
} from './cache-middleware';

// Re-export types from services for convenience
export type { 
  Lead, 
  LeadFilter 
} from './cached-lead-service';

export type { 
  DashboardMetrics, 
  LeadAnalytics, 
  RevenueAnalytics 
} from './cached-analytics-service';

/**
 * Convenience functions for common caching operations
 */

/**
 * Quick cache health check
 */
export async function isCacheHealthy(): Promise<boolean> {
  try {
    const health = await getCacheHealth();
    return health.connected && (health.latency === null || health.latency < 1000);
  } catch {
    return false;
  }
}

/**
 * Get cache performance summary
 */
export async function getCachePerformanceSummary() {
  const [health, stats] = await Promise.all([
    getCacheHealth(),
    getCacheStats()
  ]);
  
  // Calculate overall performance
  let totalHits = 0;
  let totalRequests = 0;
  
  Object.values(stats).forEach(stat => {
    totalHits += stat.hits || 0;
    totalRequests += (stat.hits || 0) + (stat.misses || 0);
  });
  
  const hitRatio = totalRequests > 0 ? totalHits / totalRequests : 0;
  
  return {
    connected: health.connected,
    latency: health.latency,
    hitRatio,
    totalRequests,
    performance: hitRatio > 0.8 ? 'excellent' : hitRatio > 0.6 ? 'good' : 'needs improvement',
    recommendations: generatePerformanceRecommendations(hitRatio, health.latency)
  };
}

/**
 * Warm caches for organization (all services)
 */
export async function warmAllCaches(orgId: string, userId?: string): Promise<void> {
  const warmingTasks = [
    cachedAnalyticsService.warmAnalyticsCaches(orgId),
    cachedLeadService.warmLeadCaches(orgId),
    cachedBookingService.warmBookingCaches(orgId)
  ];
  
  // Add organization cache warming if userId provided
  if (userId) {
    warmingTasks.push(
      cachedOrganizationService.warmOrganizationCaches(userId, orgId)
    );
  }
  
  await Promise.allSettled(warmingTasks);
}

/**
 * Clear all caches for organization
 */
export async function clearAllOrgCaches(orgId: string): Promise<number> {
  const patterns = [
    `org:${orgId}:*`,
  ];
  
  let totalCleared = 0;
  for (const pattern of patterns) {
    totalCleared += await invalidateCache(pattern);
  }
  
  return totalCleared;
}

/**
 * Emergency cache flush (use with caution)
 */
export async function emergencyFlushCache(reason?: string): Promise<void> {
  console.warn(`EMERGENCY CACHE FLUSH: ${reason || 'No reason provided'}`);
  await cacheService.flushAll();
}

function generatePerformanceRecommendations(hitRatio: number, latency: number | null): string[] {
  const recommendations = [];
  
  if (hitRatio < 0.5) {
    recommendations.push('Cache hit ratio is low - consider implementing cache warming');
    recommendations.push('Review TTL values for frequently accessed data');
  }
  
  if (latency && latency > 100) {
    recommendations.push('Redis latency is high - check network connection');
    recommendations.push('Consider Redis optimization or infrastructure upgrade');
  }
  
  if (hitRatio < 0.3) {
    recommendations.push('CRITICAL: Very low cache performance - immediate attention required');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Cache performance is optimal');
  }
  
  return recommendations;
}

/**
 * Cache debugging utilities
 */
export const cacheDebug = {
  /**
   * Get all cache keys for organization
   */
  async getOrgKeys(orgId: string): Promise<string[]> {
    const redis = getRedisClient();
    if (!redis) return [];
    
    try {
      return await redis.keys(`org:${orgId}:*`);
    } catch (error) {
      console.error('Failed to get org keys:', error);
      return [];
    }
  },
  
  /**
   * Get cache key details
   */
  async getKeyDetails(key: string) {
    const redis = getRedisClient();
    if (!redis) return null;
    
    try {
      const [type, ttl, size] = await Promise.all([
        redis.type(key),
        redis.ttl(key),
        redis.memory('usage', key).catch(() => 0)
      ]);
      
      return { key, type, ttl, size };
    } catch (error) {
      console.error(`Failed to get details for key ${key}:`, error);
      return null;
    }
  },
  
  /**
   * Sample cache content (for debugging)
   */
  async sampleCacheContent(orgId: string, limit = 10) {
    const keys = await this.getOrgKeys(orgId);
    const samples = keys.slice(0, limit);
    
    const details = await Promise.all(
      samples.map(key => this.getKeyDetails(key))
    );
    
    return details.filter(Boolean);
  }
};

/**
 * Production-ready cache configuration
 */
export const PRODUCTION_CACHE_CONFIG = {
  // TTL values optimized for production
  TTL: {
    DASHBOARD_METRICS: 60,      // 1 minute
    LEAD_LISTS: 300,           // 5 minutes  
    ORGANIZATION_SETTINGS: 600, // 10 minutes
    USER_PERMISSIONS: 300,      // 5 minutes
    CLASS_SCHEDULES: 300,       // 5 minutes
    CAMPAIGN_PERFORMANCE: 120,  // 2 minutes
    AI_PROCESSING: 86400,       // 24 hours
  },
  
  // Memory limits
  MEMORY: {
    MAX_KEY_SIZE: 1024 * 1024,     // 1MB per key
    WARNING_THRESHOLD: 0.8,         // 80% memory usage warning
    CRITICAL_THRESHOLD: 0.95,       // 95% memory usage critical
  },
  
  // Performance thresholds
  PERFORMANCE: {
    TARGET_HIT_RATIO: 0.8,         // 80% hit ratio target
    MAX_LATENCY_MS: 100,           // 100ms max latency
    WARNING_LATENCY_MS: 50,        // 50ms warning threshold
  }
};

// Default export for convenience
export default {
  // Services
  lead: cachedLeadService,
  analytics: cachedAnalyticsService,
  organization: cachedOrganizationService,
  booking: cachedBookingService,
  
  // Utilities
  cache: cacheService,
  monitor: cacheMonitor,
  
  // Functions
  initialize: initializeCache,
  getCacheHealth,
  warmAllCaches,
  clearAllOrgCaches,
  
  // Debug
  debug: cacheDebug
};