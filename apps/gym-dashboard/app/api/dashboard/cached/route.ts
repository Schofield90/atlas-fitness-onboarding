import { NextRequest, NextResponse } from "next/server";
import { requireAuth, createErrorResponse } from "@/app/lib/api/auth-check";
import { cachedAnalyticsService } from "@/app/lib/cache/cached-analytics-service";
import { cachedOrganizationService } from "@/app/lib/cache/cached-organization-service";
import { logger } from "@/app/lib/logger/logger";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

/**
 * Enhanced Dashboard API with Redis Caching
 *
 * Provides dashboard data with aggressive caching for optimal performance
 */

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Check authentication and get organization
    const userWithOrg = await requireAuth();

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "full"; // full, metrics, realtime
    const refresh = searchParams.get("refresh") === "true";

    let responseData: any = {};

    switch (type) {
      case "metrics":
        // Get dashboard metrics only
        responseData = await cachedAnalyticsService.getDashboardMetrics(
          userWithOrg.organizationId,
        );
        break;

      case "realtime":
        // Get real-time metrics with shorter cache
        responseData = await cachedAnalyticsService.getRealTimeDashboardMetrics(
          userWithOrg.organizationId,
        );
        break;

      case "full":
      default:
        // Get full dashboard data
        responseData = await cachedAnalyticsService.getFullDashboard(
          userWithOrg.organizationId,
        );
        break;
    }

    const responseTime = Date.now() - startTime;

    // Log performance metrics
    logger.info(
      `Dashboard API (cached) - Org: ${userWithOrg.organizationId}, Type: ${type}, Response time: ${responseTime}ms`,
      {
        organizationId: userWithOrg.organizationId,
        responseTime,
        type,
        refresh,
        hasData: !!responseData,
      },
    );

    return NextResponse.json({
      success: true,
      data: responseData,
      meta: {
        organizationId: userWithOrg.organizationId,
        type,
        cached: true,
        responseTime,
        timestamp: new Date().toISOString(),
        refresh,
      },
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;
    logger.error(`Cached dashboard API error (${responseTime}ms):`, error);

    return createErrorResponse(error, {
      cached: true,
      responseTime,
    });
  }
}

/**
 * POST /api/dashboard/cached - Refresh dashboard cache or perform actions
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Check authentication and get organization
    const userWithOrg = await requireAuth();

    const body = await request.json();
    const { action, date } = body;

    let result: any = {};
    let message = "";

    switch (action) {
      case "refresh-metrics":
        // Refresh daily metrics and invalidate cache
        const targetDate = date ? new Date(date) : new Date();
        await cachedAnalyticsService.refreshDailyMetrics(
          userWithOrg.organizationId,
          targetDate,
        );
        message = `Daily metrics refreshed for ${targetDate.toISOString().split("T")[0]}`;
        break;

      case "clear-cache":
        // Clear all analytics cache for organization
        await cachedAnalyticsService.clearCache(userWithOrg.organizationId);
        message = "Analytics cache cleared for organization";
        break;

      case "warm-cache":
        // Warm analytics caches
        await cachedAnalyticsService.warmAnalyticsCaches(
          userWithOrg.organizationId,
        );
        message = "Analytics cache warming completed";
        break;

      case "schedule-refresh":
        // Schedule periodic cache refresh
        const intervalMinutes = body.intervalMinutes || 60;
        await cachedAnalyticsService.scheduleAnalyticsRefresh(
          userWithOrg.organizationId,
          intervalMinutes,
        );
        message = `Analytics refresh scheduled every ${intervalMinutes} minutes`;
        result = { intervalMinutes };
        break;

      default:
        return NextResponse.json(
          {
            success: false,
            error: "Invalid action",
            availableActions: [
              "refresh-metrics",
              "clear-cache",
              "warm-cache",
              "schedule-refresh",
            ],
          },
          { status: 400 },
        );
    }

    const responseTime = Date.now() - startTime;

    logger.info(
      `Dashboard action completed - Org: ${userWithOrg.organizationId}, Action: ${action}, Response time: ${responseTime}ms`,
    );

    return NextResponse.json({
      success: true,
      message,
      result,
      meta: {
        organizationId: userWithOrg.organizationId,
        action,
        responseTime,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;
    logger.error(`Dashboard action error (${responseTime}ms):`, error);

    return createErrorResponse(error, {
      responseTime,
    });
  }
}

/**
 * PUT /api/dashboard/cached - Update dashboard configuration
 */
export async function PUT(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Check authentication and get organization
    const userWithOrg = await requireAuth();

    const body = await request.json();
    const { settings } = body;

    if (!settings) {
      return NextResponse.json(
        {
          success: false,
          error: "Dashboard settings are required",
        },
        { status: 400 },
      );
    }

    // Update dashboard settings (this would extend the organization service)
    await cachedOrganizationService.updateOrganizationSettings(
      userWithOrg.organizationId,
      { dashboard_settings: settings },
    );

    const responseTime = Date.now() - startTime;

    logger.info(
      `Dashboard settings updated - Org: ${userWithOrg.organizationId}, Response time: ${responseTime}ms`,
    );

    return NextResponse.json({
      success: true,
      message: "Dashboard settings updated",
      meta: {
        organizationId: userWithOrg.organizationId,
        responseTime,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;
    logger.error(`Dashboard settings update error (${responseTime}ms):`, error);

    return createErrorResponse(error, {
      responseTime,
    });
  }
}
