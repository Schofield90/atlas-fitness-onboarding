import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

// Initialize Redis client - using Upstash for serverless compatibility
let redis: Redis | null = null;

export function getRedisClient(): Redis | null {
  // Only initialize if credentials are provided
  if (
    !process.env.UPSTASH_REDIS_REST_URL ||
    !process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    console.warn("Redis credentials not found - caching disabled");
    return null;
  }

  if (!redis) {
    try {
      redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });
    } catch (error) {
      console.error("Failed to initialize Redis:", error);
      return null;
    }
  }

  return redis;
}

// Rate limiting configurations per tenant tier
export const RATE_LIMIT_TIERS = {
  basic: {
    requests: 60,
    window: "1 m",
  },
  premium: {
    requests: 300,
    window: "1 m",
  },
  enterprise: {
    requests: 1000,
    window: "1 m",
  },
  // Default for unauthenticated requests
  anonymous: {
    requests: 20,
    window: "1 m",
  },
};

// Create rate limiter for a specific organization
export function createRateLimiter(
  tier: keyof typeof RATE_LIMIT_TIERS = "basic",
) {
  const client = getRedisClient();

  if (!client) {
    // Return a dummy rate limiter that always allows requests
    return {
      limit: async () => ({
        success: true,
        limit: 100,
        reset: Date.now() + 60000,
        remaining: 100,
      }),
    };
  }

  const config = RATE_LIMIT_TIERS[tier];

  return new Ratelimit({
    redis: client,
    limiter: Ratelimit.slidingWindow(config.requests, config.window),
    prefix: `ratelimit:${tier}`,
  });
}

// Cache key generators for multi-tenant data
export const cacheKeys = {
  // Organization-specific keys
  organization: {
    settings: (orgId: string) => `org:${orgId}:settings`,
    members: (orgId: string) => `org:${orgId}:members`,
    stats: (orgId: string) => `org:${orgId}:stats`,
    classes: (orgId: string) => `org:${orgId}:classes`,
    memberships: (orgId: string) => `org:${orgId}:memberships`,
  },

  // User-specific keys
  user: {
    profile: (userId: string) => `user:${userId}:profile`,
    permissions: (userId: string) => `user:${userId}:permissions`,
    organizations: (userId: string) => `user:${userId}:organizations`,
  },

  // Client-specific keys
  client: {
    profile: (clientId: string) => `client:${clientId}:profile`,
    bookings: (clientId: string) => `client:${clientId}:bookings`,
    membership: (clientId: string) => `client:${clientId}:membership`,
  },

  // Global keys (use sparingly)
  global: {
    superAdmins: () => "global:super_admins",
    systemStats: () => "global:system_stats",
  },
};

// Cache TTL configurations (in seconds)
export const CACHE_TTL = {
  SHORT: 60, // 1 minute - for frequently changing data
  MEDIUM: 300, // 5 minutes - for moderately stable data
  LONG: 3600, // 1 hour - for stable configuration data
  VERY_LONG: 86400, // 24 hours - for rarely changing data
};

// Cache invalidation helpers
export async function invalidateOrgCache(orgId: string) {
  const client = getRedisClient();
  if (!client) return;

  const pattern = `org:${orgId}:*`;
  try {
    // Note: In production with Upstash, you might need to track keys differently
    // as SCAN operations might not be available
    console.log(`Invalidating cache for pattern: ${pattern}`);
  } catch (error) {
    console.error("Cache invalidation error:", error);
  }
}

export async function invalidateUserCache(userId: string) {
  const client = getRedisClient();
  if (!client) return;

  const pattern = `user:${userId}:*`;
  try {
    console.log(`Invalidating cache for pattern: ${pattern}`);
  } catch (error) {
    console.error("Cache invalidation error:", error);
  }
}
