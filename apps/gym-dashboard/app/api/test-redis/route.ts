import { NextRequest, NextResponse } from "next/server";
import { getRedisClient } from "@/app/lib/redis/config";

/**
 * Test endpoint to verify Redis connection and basic operations
 * Access at: http://localhost:3000/api/test-redis
 */
export async function GET(request: NextRequest) {
  try {
    const redis = getRedisClient();

    if (!redis) {
      return NextResponse.json({
        success: false,
        error: "Redis not configured",
        message:
          "Please add UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to .env.local",
      });
    }

    // Test 1: Set a value
    const testKey = "test:atlas:connection";
    const testValue = {
      message: "Redis is working!",
      timestamp: new Date().toISOString(),
      platform: "Atlas Fitness",
    };

    await redis.set(testKey, JSON.stringify(testValue), {
      ex: 60, // Expire in 60 seconds
    });

    // Test 2: Get the value back
    const retrieved = await redis.get(testKey);

    // Test 3: Test increment (useful for rate limiting)
    const counterKey = "test:atlas:counter";
    const count = await redis.incr(counterKey);
    await redis.expire(counterKey, 60);

    // Test 4: Get Redis info (if available)
    let dbSize = null;
    try {
      dbSize = await redis.dbsize();
    } catch (e) {
      // Some Redis providers don't support this command
    }

    return NextResponse.json({
      success: true,
      message: "✅ Redis is configured and working correctly!",
      tests: {
        set_and_get: {
          status: "passed",
          stored: testValue,
          retrieved: retrieved,
        },
        increment: {
          status: "passed",
          counter_value: count,
        },
        connection: {
          status: "connected",
          database_size: dbSize,
        },
      },
      next_steps: [
        "Redis caching is now active for your API routes",
        "Rate limiting will work across all instances",
        "Check the example at /api/example-cached",
      ],
    });
  } catch (error: any) {
    console.error("Redis test error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        details: {
          message: "Failed to connect to Redis",
          possible_causes: [
            "Invalid UPSTASH_REDIS_REST_URL",
            "Invalid UPSTASH_REDIS_REST_TOKEN",
            "Database might be paused (check Upstash console)",
            "Network connectivity issues",
          ],
          check:
            "Verify your credentials in .env.local match those from console.upstash.com",
        },
      },
      { status: 500 },
    );
  }
}

/**
 * POST endpoint to test cache invalidation
 */
export async function POST(request: NextRequest) {
  try {
    const redis = getRedisClient();

    if (!redis) {
      return NextResponse.json({
        success: false,
        error: "Redis not configured",
      });
    }

    // Clear test keys
    await redis.del("test:atlas:connection");
    await redis.del("test:atlas:counter");

    return NextResponse.json({
      success: true,
      message: "Test cache entries cleared",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 },
    );
  }
}
