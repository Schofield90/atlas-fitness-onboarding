import { NextRequest } from "next/server";
import { secureRoute, SecureResponse } from "@/app/lib/api/secure-route";
import { OrganizationSecurityMiddleware } from "@/app/lib/middleware/organization-security";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

/**
 * Security audit endpoint for monitoring access attempts and security events
 * Only accessible by organization owners and admins
 */

export const GET = secureRoute(
  async ({ organizationId, userId, request }) => {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "100");
    const organizationFilter = searchParams.get("organization_id");

    // Get audit logs
    const auditLogs = OrganizationSecurityMiddleware.getAuditLogs(
      organizationFilter || organizationId,
      limit,
    );

    // Filter logs to only include relevant events for this organization
    const filteredLogs = auditLogs.filter(
      (log) => !log.organizationId || log.organizationId === organizationId,
    );

    // Aggregate security metrics
    const metrics = {
      totalEvents: filteredLogs.length,
      unauthorizedAttempts: filteredLogs.filter(
        (log) => log.result === "unauthorized" || log.result === "forbidden",
      ).length,
      successfulAccess: filteredLogs.filter((log) => log.result === "success")
        .length,
      errorEvents: filteredLogs.filter((log) => log.result === "error").length,
      uniqueUsers: [
        ...new Set(filteredLogs.map((log) => log.userId).filter(Boolean)),
      ].length,
      mostAccessedRoutes: getMostAccessedRoutes(filteredLogs),
      suspiciousActivity: getSuspiciousActivity(filteredLogs),
    };

    return SecureResponse.success({
      logs: filteredLogs,
      metrics,
      organizationId,
    });
  },
  {
    requiredRole: "admin",
  },
);

// Helper function to get most accessed routes
function getMostAccessedRoutes(
  logs: any[],
): Array<{ route: string; count: number }> {
  const routeCounts = logs.reduce(
    (acc, log) => {
      acc[log.route] = (acc[log.route] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return Object.entries(routeCounts)
    .map(([route, count]) => ({ route, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

// Helper function to identify suspicious activity
function getSuspiciousActivity(logs: any[]): Array<{
  type: string;
  description: string;
  count: number;
  details: any;
}> {
  const suspicious = [];

  // Multiple failed attempts from same IP
  const failedByIp = logs
    .filter(
      (log) => log.result === "unauthorized" || log.result === "forbidden",
    )
    .reduce(
      (acc, log) => {
        acc[log.ip] = (acc[log.ip] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

  Object.entries(failedByIp).forEach(([ip, count]) => {
    if (count >= 5) {
      suspicious.push({
        type: "multiple_failed_attempts",
        description: `Multiple failed access attempts from IP ${ip}`,
        count,
        details: { ip },
      });
    }
  });

  // Cross-organization access attempts
  const crossOrgAttempts = logs.filter(
    (log) =>
      log.details?.includes("cross-organization") ||
      log.details?.includes("unauthorized organization"),
  );

  if (crossOrgAttempts.length > 0) {
    suspicious.push({
      type: "cross_organization_access",
      description: "Attempts to access data from other organizations",
      count: crossOrgAttempts.length,
      details: crossOrgAttempts,
    });
  }

  // High frequency access patterns
  const recentLogs = logs.filter(
    (log) => new Date(log.timestamp).getTime() > Date.now() - 5 * 60 * 1000, // Last 5 minutes
  );

  const userFrequency = recentLogs.reduce(
    (acc, log) => {
      if (log.userId) {
        acc[log.userId] = (acc[log.userId] || 0) + 1;
      }
      return acc;
    },
    {} as Record<string, number>,
  );

  Object.entries(userFrequency).forEach(([userId, count]) => {
    if (count > 50) {
      // More than 50 requests in 5 minutes
      suspicious.push({
        type: "high_frequency_access",
        description: `Unusually high request frequency from user ${userId}`,
        count,
        details: { userId, timeWindow: "5 minutes" },
      });
    }
  });

  return suspicious;
}

// Clear audit logs (owner only)
export const DELETE = secureRoute(
  async ({ organizationId }) => {
    OrganizationSecurityMiddleware.clearAuditLogs();

    return SecureResponse.success({
      message: "Audit logs cleared",
      timestamp: new Date().toISOString(),
    });
  },
  {
    requiredRole: "owner",
  },
);
