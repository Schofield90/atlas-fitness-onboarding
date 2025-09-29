import { redisClient } from "./redis-client";
import { logger } from "@/app/lib/logger/logger";

// Cache TTL constants in seconds
export const CACHE_TTL = {
  DASHBOARD_METRICS: 60, // 1 minute
  LEAD_LISTS: 300, // 5 minutes
  ORGANIZATION_SETTINGS: 600, // 10 minutes
  USER_PERMISSIONS: 300, // 5 minutes
  CLASS_SCHEDULES: 300, // 5 minutes
  CAMPAIGN_PERFORMANCE: 120, // 2 minutes
  AI_PROCESSING: 86400, // 24 hours
  SEARCH_RESULTS: 300, // 5 minutes
  SHORT_TERM: 60, // 1 minute
  MEDIUM_TERM: 300, // 5 minutes
  LONG_TERM: 3600, // 1 hour
  VERY_LONG_TERM: 86400, // 24 hours
} as const;

// Cache key prefixes for organization and namespace isolation
export const CACHE_PREFIXES = {
  ORG: "org",
  LEAD: "lead",
  USER: "user",
  CLASS: "class",
  BOOKING: "booking",
  DASHBOARD: "dashboard",
  ANALYTICS: "analytics",
  CAMPAIGN: "campaign",
  AI: "ai",
  SEARCH: "search",
  SETTINGS: "settings",
  PERMISSIONS: "permissions",
  METRICS: "metrics",
} as const;

// Cache statistics for monitoring
interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  errors: number;
  hitRatio: number;
}

class CacheService {
  private redis: any = null;
  private stats: Map<string, CacheStats> = new Map();
  private lockPrefix = "lock:";
  private lockTTL = 10; // 10 seconds for locks
  private initialized = false;

  constructor() {
    // Don't initialize Redis in constructor
  }

  private async ensureRedis() {
    if (!this.initialized) {
      this.redis = await redisClient.getClient();
      this.initialized = true;
    }
    return this.redis;
  }

  /**
   * Generate cache key with multi-tenant isolation
   */
  getCacheKey(
    orgId: string,
    resource: string,
    id?: string,
    ...additional: string[]
  ): string {
    const parts = [CACHE_PREFIXES.ORG, orgId, resource];
    if (id) parts.push(id);
    if (additional.length) parts.push(...additional);
    return parts.join(":");
  }

  /**
   * Get data from cache with automatic JSON parsing
   */
  async getFromCache<T>(key: string): Promise<T | null> {
    const redis = await this.ensureRedis();
    if (!redis) {
      this.updateStats(key, "miss");
      return null;
    }

    try {
      const cached = await redis.get(key);
      if (cached) {
        this.updateStats(key, "hit");
        return JSON.parse(cached);
      } else {
        this.updateStats(key, "miss");
        return null;
      }
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error);
      this.updateStats(key, "error");
      return null;
    }
  }

  /**
   * Set data in cache with TTL
   */
  async setInCache<T>(
    key: string,
    data: T,
    ttl: number = CACHE_TTL.MEDIUM_TERM,
  ): Promise<void> {
    const redis = await this.ensureRedis();
    if (!redis) return;

    try {
      await redis.setex(key, ttl, JSON.stringify(data));
      this.updateStats(key, "set");
      logger.debug(`Cache set: ${key} (TTL: ${ttl}s)`);
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error);
      this.updateStats(key, "error");
    }
  }

  /**
   * Get or set pattern with cache-aside logic and lock mechanism
   */
  async getOrSet<T>(
    key: string,
    fetchFunction: () => Promise<T>,
    ttl: number = CACHE_TTL.MEDIUM_TERM,
    lockTimeout: number = 30000, // 30 seconds
  ): Promise<T | null> {
    // Try to get from cache first
    const cached = await this.getFromCache<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Use distributed lock to prevent cache stampede
    const lockKey = `${this.lockPrefix}${key}`;
    const acquired = await this.acquireLock(lockKey, this.lockTTL);

    if (!acquired) {
      // If we can't acquire the lock, wait and try cache again
      await this.sleep(100 + Math.random() * 200); // Random jitter
      const retryCache = await this.getFromCache<T>(key);
      if (retryCache !== null) {
        return retryCache;
      }

      // If still no cache, fall back to fetch without lock (might cause duplicate work)
      logger.warn(
        `Lock acquisition failed for ${key}, proceeding without lock`,
      );
    }

    try {
      // Fetch data
      const data = await Promise.race([
        fetchFunction(),
        this.timeoutPromise<T>(lockTimeout),
      ]);

      // Store in cache
      await this.setInCache(key, data, ttl);
      return data;
    } catch (error) {
      logger.error(`Failed to fetch data for cache key ${key}:`, error);
      return null;
    } finally {
      // Always release the lock
      if (acquired) {
        await this.releaseLock(lockKey);
      }
    }
  }

  /**
   * Invalidate cache by pattern (multi-tenant aware)
   */
  async invalidateCache(pattern: string): Promise<number> {
    const redis = await this.ensureRedis();
    if (!redis) return 0;

    try {
      const keys = await redis.keys(pattern);
      if (keys.length === 0) return 0;

      const result = await redis.del(...keys);
      logger.info(
        `Invalidated ${result} cache keys matching pattern: ${pattern}`,
      );
      return result;
    } catch (error) {
      logger.error(`Cache invalidation error for pattern ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Invalidate all cache for a specific organization
   */
  async invalidateOrgCache(orgId: string, resource?: string): Promise<number> {
    const pattern = resource
      ? `${CACHE_PREFIXES.ORG}:${orgId}:${resource}:*`
      : `${CACHE_PREFIXES.ORG}:${orgId}:*`;

    return this.invalidateCache(pattern);
  }

  /**
   * Stale-while-revalidate pattern for better UX
   */
  async getStaleWhileRevalidate<T>(
    key: string,
    fetchFunction: () => Promise<T>,
    ttl: number = CACHE_TTL.MEDIUM_TERM,
    staleTtl: number = ttl * 2,
  ): Promise<T | null> {
    const staleKey = `${key}:stale`;

    // Try to get fresh data
    let data = await this.getFromCache<T>(key);

    if (data !== null) {
      // Fresh data available
      return data;
    }

    // Check for stale data
    const staleData = await this.getFromCache<T>(staleKey);

    // Start background refresh (fire and forget)
    this.backgroundRefresh(key, staleKey, fetchFunction, ttl, staleTtl);

    return staleData; // Return stale data immediately if available
  }

  /**
   * Background refresh for stale-while-revalidate
   */
  private async backgroundRefresh<T>(
    key: string,
    staleKey: string,
    fetchFunction: () => Promise<T>,
    ttl: number,
    staleTtl: number,
  ): Promise<void> {
    try {
      const freshData = await fetchFunction();

      // Set fresh data
      await this.setInCache(key, freshData, ttl);

      // Update stale cache
      await this.setInCache(staleKey, freshData, staleTtl);

      logger.debug(`Background refresh completed for ${key}`);
    } catch (error) {
      logger.error(`Background refresh failed for ${key}:`, error);
    }
  }

  /**
   * Multi-key cache operations
   */
  async mget<T>(keys: string[]): Promise<Array<T | null>> {
    const redis = await this.ensureRedis();
    if (!redis || keys.length === 0) {
      return keys.map(() => null);
    }

    try {
      const values = await redis.mget(...keys);
      return values.map((value, index) => {
        if (value) {
          this.updateStats(keys[index], "hit");
          return JSON.parse(value);
        } else {
          this.updateStats(keys[index], "miss");
          return null;
        }
      });
    } catch (error) {
      logger.error("Multi-get cache error:", error);
      keys.forEach((key) => this.updateStats(key, "error"));
      return keys.map(() => null);
    }
  }

  /**
   * Multi-key cache set
   */
  async mset<T>(
    items: Array<{ key: string; data: T; ttl?: number }>,
  ): Promise<void> {
    const redis = await this.ensureRedis();
    if (!redis || items.length === 0) return;

    const pipeline = redis.pipeline();

    items.forEach(({ key, data, ttl = CACHE_TTL.MEDIUM_TERM }) => {
      pipeline.setex(key, ttl, JSON.stringify(data));
    });

    try {
      await pipeline.exec();
      items.forEach(({ key }) => this.updateStats(key, "set"));
      logger.debug(`Multi-set completed for ${items.length} keys`);
    } catch (error) {
      logger.error("Multi-set cache error:", error);
      items.forEach(({ key }) => this.updateStats(key, "error"));
    }
  }

  /**
   * Cache warming for critical data
   */
  async warmCache<T>(
    items: Array<{
      key: string;
      fetchFunction: () => Promise<T>;
      ttl?: number;
    }>,
  ): Promise<void> {
    logger.info(`Warming cache for ${items.length} items`);

    const warmPromises = items.map(
      async ({ key, fetchFunction, ttl = CACHE_TTL.MEDIUM_TERM }) => {
        try {
          const data = await fetchFunction();
          await this.setInCache(key, data, ttl);
          logger.debug(`Cache warmed: ${key}`);
        } catch (error) {
          logger.error(`Cache warm failed for ${key}:`, error);
        }
      },
    );

    await Promise.allSettled(warmPromises);
    logger.info("Cache warming completed");
  }

  /**
   * Acquire distributed lock
   */
  private async acquireLock(lockKey: string, ttl: number): Promise<boolean> {
    const redis = await this.ensureRedis();
    if (!redis) return false;

    try {
      const result = await redis.set(lockKey, "1", "EX", ttl, "NX");
      return result === "OK";
    } catch (error) {
      logger.error(`Lock acquisition error for ${lockKey}:`, error);
      return false;
    }
  }

  /**
   * Release distributed lock
   */
  private async releaseLock(lockKey: string): Promise<void> {
    const redis = await this.ensureRedis();
    if (!redis) return;

    try {
      await redis.del(lockKey);
    } catch (error) {
      logger.error(`Lock release error for ${lockKey}:`, error);
    }
  }

  /**
   * Timeout promise helper
   */
  private timeoutPromise<T>(ms: number): Promise<T> {
    return new Promise((_, reject) => {
      setTimeout(
        () => reject(new Error(`Operation timed out after ${ms}ms`)),
        ms,
      );
    });
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Update cache statistics
   */
  private updateStats(
    key: string,
    operation: "hit" | "miss" | "set" | "error",
  ): void {
    const prefix = key.split(":")[0] || "unknown";
    const stats = this.stats.get(prefix) || {
      hits: 0,
      misses: 0,
      sets: 0,
      errors: 0,
      hitRatio: 0,
    };

    stats[
      operation === "hit"
        ? "hits"
        : operation === "miss"
          ? "misses"
          : operation === "set"
            ? "sets"
            : "errors"
    ]++;
    stats.hitRatio = stats.hits / (stats.hits + stats.misses) || 0;

    this.stats.set(prefix, stats);
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): Record<string, CacheStats> {
    const result: Record<string, CacheStats> = {};
    this.stats.forEach((stats, prefix) => {
      result[prefix] = { ...stats };
    });
    return result;
  }

  /**
   * Reset cache statistics
   */
  resetStats(): void {
    this.stats.clear();
  }

  /**
   * Get cache health information
   */
  async getCacheHealth(): Promise<{
    connected: boolean;
    latency: number | null;
    stats: Record<string, CacheStats>;
    memory?: any;
  }> {
    const health = await redisClient.healthCheck();
    const stats = this.getCacheStats();

    return {
      ...health,
      stats,
    };
  }

  /**
   * Flush all cache (use with caution in production)
   */
  async flushAll(): Promise<void> {
    const redis = await this.ensureRedis();
    if (!redis) return;

    try {
      await redis.flushall();
      this.resetStats();
      logger.warn("All cache flushed");
    } catch (error) {
      logger.error("Cache flush error:", error);
    }
  }
}

// Export singleton instance
export const cacheService = new CacheService();

// Convenience functions for common operations
export const getCacheKey = (
  orgId: string,
  resource: string,
  id?: string,
  ...additional: string[]
): string => {
  return cacheService.getCacheKey(orgId, resource, id, ...additional);
};

export const getFromCache = async <T>(key: string): Promise<T | null> => {
  return cacheService.getFromCache<T>(key);
};

export const setInCache = async <T>(
  key: string,
  data: T,
  ttl?: number,
): Promise<void> => {
  return cacheService.setInCache(key, data, ttl);
};

export const getOrSet = async <T>(
  key: string,
  fetchFunction: () => Promise<T>,
  ttl?: number,
  lockTimeout?: number,
): Promise<T | null> => {
  return cacheService.getOrSet(key, fetchFunction, ttl, lockTimeout);
};

export const invalidateCache = async (pattern: string): Promise<number> => {
  return cacheService.invalidateCache(pattern);
};

export const invalidateOrgCache = async (
  orgId: string,
  resource?: string,
): Promise<number> => {
  return cacheService.invalidateOrgCache(orgId, resource);
};

export const getCacheStats = (): Record<string, CacheStats> => {
  return cacheService.getCacheStats();
};

export const getCacheHealth = async () => {
  return cacheService.getCacheHealth();
};
