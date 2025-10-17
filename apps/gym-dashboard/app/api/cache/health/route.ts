import { NextRequest, NextResponse } from "next/server";
import { cacheMonitor } from "@/app/lib/cache/cache-monitor";
import { getCacheHealth } from "@/app/lib/cache/cache-utils";
import { logger } from "@/app/lib/logger/logger";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

/**
 * Cache Health Monitoring API
 *
 * GET /api/cache/health - Get comprehensive cache health report
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const detailed = searchParams.get("detailed") === "true";

    if (detailed) {
      // Get detailed health report with monitoring
      const healthReport = await cacheMonitor.performHealthCheck();

      return NextResponse.json({
        success: true,
        data: healthReport,
        timestamp: new Date().toISOString(),
      });
    } else {
      // Get basic health info
      const health = await getCacheHealth();

      return NextResponse.json({
        success: true,
        data: {
          connected: health.connected,
          latency: health.latency,
          stats: health.stats,
          memory: health.memory,
        },
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    logger.error("Cache health check failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Cache health check failed",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/cache/health - Start/stop cache monitoring
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, interval } = body;

    switch (action) {
      case "start":
        const monitoringInterval = interval || 60000; // Default 1 minute
        cacheMonitor.startMonitoring(monitoringInterval);

        return NextResponse.json({
          success: true,
          message: `Cache monitoring started with ${monitoringInterval}ms interval`,
          timestamp: new Date().toISOString(),
        });

      case "stop":
        cacheMonitor.stopMonitoring();

        return NextResponse.json({
          success: true,
          message: "Cache monitoring stopped",
          timestamp: new Date().toISOString(),
        });

      default:
        return NextResponse.json(
          {
            success: false,
            error: "Invalid action",
            message: 'Action must be "start" or "stop"',
          },
          { status: 400 },
        );
    }
  } catch (error) {
    logger.error("Cache monitoring control failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Cache monitoring control failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
