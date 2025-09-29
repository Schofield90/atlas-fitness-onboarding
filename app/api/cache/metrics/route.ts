import { NextRequest, NextResponse } from "next/server";
import { cacheMonitor } from "@/app/lib/cache/cache-monitor";
import { cacheService } from "@/app/lib/cache/cache-utils";
import { logger } from "@/app/lib/logger/logger";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

/**
 * Cache Metrics API
 *
 * GET /api/cache/metrics?orgId=xxx - Get organization-specific cache metrics
 * POST /api/cache/metrics/reset - Reset cache statistics
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("orgId");

    if (orgId) {
      // Get organization-specific metrics
      const orgMetrics = await cacheMonitor.getOrganizationMetrics(orgId);

      return NextResponse.json({
        success: true,
        data: orgMetrics,
        timestamp: new Date().toISOString(),
      });
    } else {
      // Get global cache statistics
      const stats = cacheService.getCacheStats();

      return NextResponse.json({
        success: true,
        data: {
          globalStats: stats,
          aggregated: this.calculateAggregatedStats(stats),
        },
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    logger.error("Cache metrics retrieval failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Cache metrics retrieval failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/cache/metrics - Reset cache statistics or perform actions
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "reset":
        cacheService.resetStats();

        return NextResponse.json({
          success: true,
          message: "Cache statistics reset successfully",
          timestamp: new Date().toISOString(),
        });

      case "optimize":
        const optimizationResult = await cacheMonitor.optimizeCache();

        return NextResponse.json({
          success: true,
          message: "Cache optimization completed",
          data: optimizationResult,
          timestamp: new Date().toISOString(),
        });

      default:
        return NextResponse.json(
          {
            success: false,
            error: "Invalid action",
            message: 'Action must be "reset" or "optimize"',
          },
          { status: 400 },
        );
    }
  } catch (error) {
    logger.error("Cache metrics action failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Cache metrics action failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

function calculateAggregatedStats(stats: Record<string, any>) {
  let totalHits = 0;
  let totalMisses = 0;
  let totalSets = 0;
  let totalErrors = 0;

  Object.values(stats).forEach((stat: any) => {
    totalHits += stat.hits || 0;
    totalMisses += stat.misses || 0;
    totalSets += stat.sets || 0;
    totalErrors += stat.errors || 0;
  });

  const totalRequests = totalHits + totalMisses;
  const totalOperations = totalHits + totalMisses + totalSets;

  return {
    totalRequests,
    totalOperations,
    overallHitRatio: totalRequests > 0 ? totalHits / totalRequests : 0,
    errorRate: totalOperations > 0 ? totalErrors / totalOperations : 0,
    performance: {
      excellent: totalRequests > 0 && totalHits / totalRequests > 0.8,
      good: totalRequests > 0 && totalHits / totalRequests > 0.6,
      needsImprovement: totalRequests > 0 && totalHits / totalRequests <= 0.6,
    },
  };
}
