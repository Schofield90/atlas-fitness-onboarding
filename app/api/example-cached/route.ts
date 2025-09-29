import { NextRequest, NextResponse } from "next/server";
import {
  withOrgCache,
  cacheKeys,
  CACHE_TTL,
  clearOrgCache,
} from "@/app/lib/redis";
import { rateLimit } from "@/app/lib/redis/rate-limit";
import { queryWithTenantIsolation } from "@/app/lib/supabase/pooled-client";
import { createClient } from "@/app/lib/supabase/server";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

/**
 * Example API route demonstrating:
 * 1. Tenant-aware rate limiting
 * 2. Redis caching with organization isolation
 * 3. Connection pooling for database queries
 * 4. Proper error handling
 */

export async function GET(request: NextRequest) {
  try {
    // 1. Get organization ID from headers (set by middleware)
    const orgId = request.headers.get("x-organization-id");

    if (!orgId) {
      return NextResponse.json(
        { error: "Organization context required" },
        { status: 400 },
      );
    }

    // 2. Apply rate limiting
    const rateLimitResult = await rateLimit(request, {
      organizationId: orgId,
      tier: "basic", // In production, fetch from org subscription
    });

    if (rateLimitResult && "status" in rateLimitResult) {
      return rateLimitResult; // Return 429 if rate limited
    }

    // 3. Use caching with organization isolation
    const stats = await withOrgCache(
      orgId,
      "dashboard-stats",
      async () => {
        // This expensive operation will be cached
        console.log(`[Cache Miss] Fetching dashboard stats for org: ${orgId}`);

        // 4. Use connection pooling for database query
        const data = await queryWithTenantIsolation(orgId, async (client) => {
          // Fetch multiple stats in parallel
          const [members, classes, revenue] = await Promise.all([
            client
              .from("clients")
              .select("count", { count: "exact" })
              .eq("organization_id", orgId),

            client
              .from("class_sessions")
              .select("count", { count: "exact" })
              .eq("organization_id", orgId)
              .gte("date", new Date().toISOString()),

            client
              .from("payments")
              .select("amount")
              .eq("organization_id", orgId)
              .eq("status", "completed")
              .gte(
                "created_at",
                new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
              ),
          ]);

          // Calculate total revenue
          const totalRevenue =
            revenue.data?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

          return {
            totalMembers: members.count || 0,
            upcomingClasses: classes.count || 0,
            monthlyRevenue: totalRevenue,
            lastUpdated: new Date().toISOString(),
          };
        });

        return data;
      },
      CACHE_TTL.MEDIUM, // Cache for 5 minutes
    );

    // 5. Return cached or fresh data with rate limit headers
    const response = NextResponse.json({
      success: true,
      data: stats,
      cached: stats.lastUpdated !== new Date().toISOString(), // Indicates if data was cached
    });

    // Add rate limit headers
    if (rateLimitResult && "headers" in rateLimitResult) {
      Object.entries(rateLimitResult.headers).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
    }

    return response;
  } catch (error: any) {
    console.error("[Dashboard Stats API] Error:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch dashboard statistics",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 },
    );
  }
}

/**
 * POST endpoint to invalidate cache for an organization
 * This would typically be called after data mutations
 */
export async function POST(request: NextRequest) {
  try {
    const orgId = request.headers.get("x-organization-id");
    const userRole = request.headers.get("x-user-role");

    if (!orgId) {
      return NextResponse.json(
        { error: "Organization context required" },
        { status: 400 },
      );
    }

    // Only allow owners and admins to clear cache
    if (userRole !== "owner" && userRole !== "admin") {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 },
      );
    }

    // Clear all cache entries for this organization
    await clearOrgCache(orgId);

    return NextResponse.json({
      success: true,
      message: `Cache cleared for organization: ${orgId}`,
    });
  } catch (error: any) {
    console.error("[Cache Clear API] Error:", error);

    return NextResponse.json(
      {
        error: "Failed to clear cache",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 },
    );
  }
}
