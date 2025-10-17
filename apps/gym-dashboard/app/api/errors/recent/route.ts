/**
 * Recent Errors API Endpoint
 *
 * GET /api/errors/recent - Get recent errors for monitoring dashboard
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/app/lib/api/auth-check";
import { handleApiError } from "@/app/lib/errors/error-handler";
import { ValidationError } from "@/app/lib/errors/error-classes";
import { createAdminClient } from "@/app/lib/supabase/admin";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // Check authentication and get organization
    const userWithOrg = await requireAuth();

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200); // Max 200
    const offset = parseInt(searchParams.get("offset") || "0");
    const level = searchParams.get("level") || "error";
    const organizationId = searchParams.get("organization_id");
    const errorCode = searchParams.get("error_code");
    const timeRange = searchParams.get("time_range") || "24h"; // 1h, 24h, 7d, 30d

    // Validate time range
    const validTimeRanges = ["1h", "24h", "7d", "30d"];
    if (!validTimeRanges.includes(timeRange)) {
      throw ValidationError.invalid(
        "time_range",
        timeRange,
        "one of: 1h, 24h, 7d, 30d",
      );
    }

    // Calculate time filter
    const now = new Date();
    let startTime: Date;
    switch (timeRange) {
      case "1h":
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case "24h":
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case "7d":
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    // Build query
    const supabase = createAdminClient();
    let query = supabase
      .from("error_logs")
      .select(
        `
        id,
        timestamp,
        level,
        message,
        error_code,
        status_code,
        organization_id,
        user_id,
        request_id,
        method,
        endpoint,
        user_agent,
        ip_address,
        response_time,
        context,
        tags
      `,
      )
      .order("timestamp", { ascending: false })
      .gte("timestamp", startTime.toISOString())
      .limit(limit)
      .range(offset, offset + limit - 1);

    // Apply filters based on user role
    if (userWithOrg.role !== "owner") {
      // Non-owners can only see their organization's errors
      query = query.eq("organization_id", userWithOrg.organizationId);
    } else if (organizationId) {
      // Owners can filter by specific organization
      query = query.eq("organization_id", organizationId);
    }

    // Apply additional filters
    if (level !== "all") {
      query = query.eq("level", level);
    }

    if (errorCode) {
      query = query.eq("error_code", errorCode);
    }

    // Execute query
    const { data: errors, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch error logs: ${error.message}`);
    }

    // Get total count for pagination
    let countQuery = supabase
      .from("error_logs")
      .select("id", { count: "exact", head: true })
      .gte("timestamp", startTime.toISOString());

    if (userWithOrg.role !== "owner") {
      countQuery = countQuery.eq("organization_id", userWithOrg.organizationId);
    } else if (organizationId) {
      countQuery = countQuery.eq("organization_id", organizationId);
    }

    if (level !== "all") {
      countQuery = countQuery.eq("level", level);
    }

    if (errorCode) {
      countQuery = countQuery.eq("error_code", errorCode);
    }

    const { count: totalCount } = await countQuery;

    return NextResponse.json({
      success: true,
      data: {
        errors: errors || [],
        pagination: {
          limit,
          offset,
          total: totalCount || 0,
          hasMore: (totalCount || 0) > offset + limit,
        },
        filters: {
          timeRange,
          level,
          organizationId:
            userWithOrg.role !== "owner"
              ? userWithOrg.organizationId
              : organizationId,
          errorCode,
        },
        metadata: {
          timeRange: {
            start: startTime.toISOString(),
            end: now.toISOString(),
          },
          userRole: userWithOrg.role,
          organizationId: userWithOrg.organizationId,
        },
      },
    });
  } catch (error) {
    return handleApiError(error, request, {
      organizationId: (
        await requireAuth().catch(() => ({ organizationId: undefined }))
      ).organizationId,
      endpoint: "/api/errors/recent",
    });
  }
}
