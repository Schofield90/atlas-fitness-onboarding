import { NextRequest, NextResponse } from "next/server";
import {
  cacheService,
  invalidateOrgCache,
  invalidateCache,
} from "@/app/lib/cache/cache-utils";
import { logger } from "@/app/lib/logger/logger";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

/**
 * Cache Invalidation API
 *
 * POST /api/cache/invalidate - Invalidate cache by pattern or organization
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, orgId, pattern, resource } = body;

    let invalidatedCount = 0;
    let message = "";

    switch (type) {
      case "organization":
        if (!orgId) {
          return NextResponse.json(
            {
              success: false,
              error: "Missing orgId",
              message:
                "Organization ID is required for organization cache invalidation",
            },
            { status: 400 },
          );
        }

        invalidatedCount = await invalidateOrgCache(orgId, resource);
        message = `Invalidated ${invalidatedCount} cache keys for organization ${orgId}${resource ? ` (resource: ${resource})` : ""}`;
        break;

      case "pattern":
        if (!pattern) {
          return NextResponse.json(
            {
              success: false,
              error: "Missing pattern",
              message:
                "Pattern is required for pattern-based cache invalidation",
            },
            { status: 400 },
          );
        }

        invalidatedCount = await invalidateCache(pattern);
        message = `Invalidated ${invalidatedCount} cache keys matching pattern: ${pattern}`;
        break;

      case "all":
        // WARNING: This flushes ALL cache - use with extreme caution
        await cacheService.flushAll();
        message = "All cache has been flushed";
        logger.warn(
          "ALL CACHE FLUSHED - This should only be done in emergency situations",
        );
        break;

      default:
        return NextResponse.json(
          {
            success: false,
            error: "Invalid type",
            message: 'Type must be "organization", "pattern", or "all"',
          },
          { status: 400 },
        );
    }

    logger.info(message);

    return NextResponse.json({
      success: true,
      message,
      data: {
        type,
        invalidatedCount: type === "all" ? "all" : invalidatedCount,
        orgId: orgId || null,
        pattern: pattern || null,
        resource: resource || null,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Cache invalidation failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Cache invalidation failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/cache/invalidate - Get cache invalidation options and patterns
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("orgId");

    const response = {
      success: true,
      data: {
        availableTypes: [
          {
            type: "organization",
            description: "Invalidate all cache for a specific organization",
            requiresOrgId: true,
            optionalResource: true,
          },
          {
            type: "pattern",
            description: "Invalidate cache matching a specific pattern",
            requiresPattern: true,
          },
          {
            type: "all",
            description: "Flush all cache (DANGER: use only in emergencies)",
            warning:
              "This will remove ALL cached data across all organizations",
          },
        ],
        commonPatterns: [
          "org:*:dashboard:*",
          "org:*:lead:*",
          "org:*:booking:*",
          "org:*:class:*",
          "org:*:analytics:*",
        ],
        resourceTypes: [
          "dashboard",
          "lead",
          "booking",
          "class",
          "analytics",
          "settings",
          "permissions",
        ],
      },
      timestamp: new Date().toISOString(),
    };

    if (orgId) {
      // Add organization-specific patterns
      response.data["organizationPatterns"] = [
        `org:${orgId}:*`,
        `org:${orgId}:dashboard:*`,
        `org:${orgId}:lead:*`,
        `org:${orgId}:booking:*`,
        `org:${orgId}:class:*`,
        `org:${orgId}:analytics:*`,
      ];
    }

    return NextResponse.json(response);
  } catch (error) {
    logger.error("Cache invalidation options retrieval failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to retrieve cache invalidation options",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
