#!/bin/bash

echo "🔧 Fixing Redis connections to prevent build-time initialization..."

# Fix 1: Update calendars booking route to lazy-load Redis
echo "Fixing app/api/calendars/[slug]/book/route.ts..."
cat > /tmp/calendar-book-fix.txt << 'EOF'
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { isSlotAvailable } from "@/packages/core/availability/generateSlots";
import { parseISO } from "date-fns";
import { v4 as uuidv4 } from "uuid";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

// Lazy Redis initialization - only create when needed
let redis: any = null;

async function getRedisClient() {
  if (!redis && process.env.REDIS_URL) {
    try {
      const Redis = (await import("ioredis")).default;
      redis = new Redis(process.env.REDIS_URL);
    } catch (error) {
      console.warn("Failed to initialize Redis:", error);
    }
  }
  return redis;
}
EOF

# Replace the top of the file with lazy loading
sed -i '' '1,10d' app/api/calendars/[slug]/book/route.ts
cat /tmp/calendar-book-fix.txt <(echo "") <(cat app/api/calendars/[slug]/book/route.ts) > /tmp/new-calendar-book.ts
mv /tmp/new-calendar-book.ts app/api/calendars/[slug]/book/route.ts

# Fix 2: Update cache-utils.ts to lazy-load Redis
echo "Fixing app/lib/cache/cache-utils.ts..."
sed -i '' "s/import { Redis } from 'ioredis';/\/\/ Redis will be imported lazily when needed/" app/lib/cache/cache-utils.ts

# Fix 3: Update workflow.service.ts
echo "Fixing src/services/workflow.service.ts..."
if [ -f src/services/workflow.service.ts ]; then
  sed -i '' "s/import { Redis } from 'ioredis';/\/\/ Redis will be imported lazily when needed/" src/services/workflow.service.ts
fi

# Fix 4: Update analytics.service.ts
echo "Fixing src/services/analytics.service.ts..."
if [ -f src/services/analytics.service.ts ]; then
  sed -i '' "s/import { Redis } from 'ioredis';/\/\/ Redis will be imported lazily when needed/" src/services/analytics.service.ts
fi

# Fix 5: Make redis/config.ts initialization lazy
echo "Fixing app/lib/redis/config.ts..."
cat > app/lib/redis/config.ts << 'EOF'
import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

// Initialize Redis client - using Upstash for serverless compatibility
let redis: Redis | null = null;
let initialized = false;

export function getRedisClient(): Redis | null {
  // Skip Redis in build environment
  if (process.env.NODE_ENV === 'production' && !process.env.VERCEL_ENV) {
    return null;
  }
  
  // Only initialize if credentials are provided
  if (
    !process.env.UPSTASH_REDIS_REST_URL ||
    !process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    if (!initialized) {
      console.warn("Redis credentials not found - caching disabled");
      initialized = true;
    }
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
EOF

# Fix 6: Update redis-client.ts to skip initialization during build
echo "Fixing app/lib/cache/redis-client.ts..."
sed -i '' '24a\
    // Skip initialization during build\
    if (process.env.NODE_ENV === "production" && !process.env.VERCEL_ENV) {\
      return;\
    }' app/lib/cache/redis-client.ts

echo "✅ Fixed Redis connection issues to prevent build-time initialization"