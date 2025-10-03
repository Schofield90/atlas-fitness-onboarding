import { getRedisClient, CACHE_TTL, cacheKeys } from "./config";

export interface CacheOptions {
  ttl?: number;
  organizationId?: string;
  userId?: string;
}

/**
 * Generic cache wrapper for any async function
 * Automatically handles caching with tenant isolation
 */
export async function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {},
): Promise<T> {
  const { ttl = CACHE_TTL.MEDIUM } = options;
  const redis = getRedisClient();

  // If Redis is not available, just execute the fetcher
  if (!redis) {
    return fetcher();
  }

  try {
    // Try to get from cache
    const cached = await redis.get(key);
    if (cached !== null) {
      console.log(`Cache hit for key: ${key}`);
      return cached as T;
    }
  } catch (error) {
    console.error(`Cache get error for key ${key}:`, error);
  }

  // Cache miss - fetch fresh data
  console.log(`Cache miss for key: ${key}`);
  const fresh = await fetcher();

  // Store in cache (fire and forget)
  try {
    await redis.set(key, JSON.stringify(fresh), {
      ex: ttl,
    });
  } catch (error) {
    console.error(`Cache set error for key ${key}:`, error);
  }

  return fresh;
}

/**
 * Cache wrapper specifically for organization data
 */
export async function withOrgCache<T>(
  orgId: string,
  resource: string,
  fetcher: () => Promise<T>,
  ttl: number = CACHE_TTL.MEDIUM,
): Promise<T> {
  const key = `org:${orgId}:${resource}`;
  return withCache(key, fetcher, { ttl, organizationId: orgId });
}

/**
 * Cache wrapper specifically for user data
 */
export async function withUserCache<T>(
  userId: string,
  resource: string,
  fetcher: () => Promise<T>,
  ttl: number = CACHE_TTL.SHORT,
): Promise<T> {
  const key = `user:${userId}:${resource}`;
  return withCache(key, fetcher, { ttl, userId });
}

/**
 * Clear cache for a specific key
 */
export async function clearCache(key: string): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;

  try {
    await redis.del(key);
    console.log(`Cache cleared for key: ${key}`);
  } catch (error) {
    console.error(`Cache clear error for key ${key}:`, error);
  }
}

/**
 * Clear all cache entries for an organization
 */
export async function clearOrgCache(orgId: string): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;

  // In production, you might need to maintain a set of keys per org
  // For now, we'll clear specific known keys
  const keysToDelete = [
    cacheKeys.organization.settings(orgId),
    cacheKeys.organization.members(orgId),
    cacheKeys.organization.stats(orgId),
    cacheKeys.organization.classes(orgId),
    cacheKeys.organization.memberships(orgId),
  ];

  try {
    await Promise.all(keysToDelete.map((key) => redis.del(key)));
    console.log(`Cache cleared for organization: ${orgId}`);
  } catch (error) {
    console.error(`Org cache clear error for ${orgId}:`, error);
  }
}

/**
 * Batch cache operations for efficiency
 */
export class CacheBatch {
  private operations: Array<() => Promise<any>> = [];
  private redis = getRedisClient();

  set(key: string, value: any, ttl: number = CACHE_TTL.MEDIUM) {
    if (!this.redis) return this;

    this.operations.push(async () => {
      await this.redis!.set(key, JSON.stringify(value), { ex: ttl });
    });
    return this;
  }

  get(key: string) {
    if (!this.redis) return Promise.resolve(null);

    return this.redis.get(key);
  }

  del(key: string) {
    if (!this.redis) return this;

    this.operations.push(async () => {
      await this.redis!.del(key);
    });
    return this;
  }

  async execute() {
    if (!this.redis || this.operations.length === 0) return;

    try {
      await Promise.all(this.operations.map((op) => op()));
      console.log(`Executed ${this.operations.length} cache operations`);
    } catch (error) {
      console.error("Batch cache operation error:", error);
    } finally {
      this.operations = [];
    }
  }
}

/**
 * Memoization decorator for class methods
 * Usage: @memoize(300) // Cache for 5 minutes
 */
export function memoize(ttl: number = CACHE_TTL.MEDIUM) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const key = `memoize:${target.constructor.name}:${propertyName}:${JSON.stringify(args)}`;

      return withCache(
        key,
        async () => {
          return originalMethod.apply(this, args);
        },
        { ttl },
      );
    };

    return descriptor;
  };
}
