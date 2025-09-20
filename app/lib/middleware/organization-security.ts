import { NextRequest, NextResponse } from "next/server";
import { createMiddlewareClient } from "@/app/lib/supabase/middleware";

export interface OrganizationSecurityResult {
  success: boolean;
  organizationId?: string;
  userId?: string;
  role?: string;
  error?: string;
  statusCode?: number;
}

/**
 * Organization Security Middleware
 * Validates organization-level access for API routes
 */
export class OrganizationSecurityMiddleware {
  private static auditLog: Array<{
    timestamp: string;
    userId?: string;
    organizationId?: string;
    route: string;
    action: string;
    ip: string;
    userAgent: string;
    result: "success" | "unauthorized" | "forbidden" | "error";
    details?: string;
  }> = [];

  /**
   * Core organization validation for API routes
   */
  static async validateOrganizationAccess(
    request: NextRequest,
  ): Promise<OrganizationSecurityResult> {
    const startTime = Date.now();
    const pathname = request.nextUrl.pathname;
    const ip =
      request.ip || request.headers.get("x-forwarded-for") || "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    try {
      // Skip validation for public routes
      if (this.isPublicRoute(pathname)) {
        return { success: true };
      }

      // Skip validation for webhook routes (they have their own security)
      if (this.isWebhookRoute(pathname)) {
        return { success: true };
      }

      // Create supabase client
      const response = NextResponse.next();
      const supabase = createMiddlewareClient(request, response);

      // Get user session with timeout
      const {
        data: { session },
        error: sessionError,
      } = await Promise.race([
        supabase.auth.getSession(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Auth timeout")), 3000),
        ),
      ]);

      if (sessionError || !session?.user) {
        this.logAccess({
          timestamp: new Date().toISOString(),
          route: pathname,
          action: "auth_check",
          ip,
          userAgent,
          result: "unauthorized",
          details: sessionError?.message || "No session",
        });

        return {
          success: false,
          error: "Authentication required",
          statusCode: 401,
        };
      }

      const userId = session.user.id;

      // Get user's organization from headers (set by main middleware)
      let organizationId = request.headers.get("x-organization-id");
      let role = request.headers.get("x-user-role");

      // If not in headers, query directly
      if (!organizationId) {
        const orgResult = await this.getUserOrganization(supabase, userId);
        if (!orgResult.success) {
          this.logAccess({
            timestamp: new Date().toISOString(),
            userId,
            route: pathname,
            action: "org_lookup",
            ip,
            userAgent,
            result: "forbidden",
            details: orgResult.error,
          });

          return {
            success: false,
            error: orgResult.error || "Organization access required",
            statusCode: 403,
          };
        }
        organizationId = orgResult.organizationId;
        role = orgResult.role;
      }

      // Validate organization-specific routes
      const validationResult = await this.validateRouteAccess(
        pathname,
        organizationId!,
        role || "member",
        supabase,
      );

      if (!validationResult.success) {
        this.logAccess({
          timestamp: new Date().toISOString(),
          userId,
          organizationId,
          route: pathname,
          action: "route_access",
          ip,
          userAgent,
          result: "forbidden",
          details: validationResult.error,
        });

        return validationResult;
      }

      // Log successful access
      this.logAccess({
        timestamp: new Date().toISOString(),
        userId,
        organizationId,
        route: pathname,
        action: "access_granted",
        ip,
        userAgent,
        result: "success",
        details: `${Date.now() - startTime}ms`,
      });

      return {
        success: true,
        organizationId,
        userId,
        role,
      };
    } catch (error) {
      this.logAccess({
        timestamp: new Date().toISOString(),
        route: pathname,
        action: "security_check",
        ip,
        userAgent,
        result: "error",
        details: error instanceof Error ? error.message : "Unknown error",
      });

      return {
        success: false,
        error: "Security validation failed",
        statusCode: 500,
      };
    }
  }

  /**
   * Get user's organization with fallback strategies
   */
  private static async getUserOrganization(
    supabase: any,
    userId: string,
  ): Promise<{
    success: boolean;
    organizationId?: string;
    role?: string;
    error?: string;
  }> {
    try {
      // Try organization_staff table first (preferred)
      const { data: staffData } = await supabase
        .from("organization_staff")
        .select("organization_id, role")
        .eq("user_id", userId)
        .eq("is_active", true)
        .single();

      if (staffData?.organization_id) {
        return {
          success: true,
          organizationId: staffData.organization_id,
          role: staffData.role,
        };
      }

      // Fallback to user_organizations table
      const { data: userOrgData } = await supabase
        .from("user_organizations")
        .select("organization_id, role")
        .eq("user_id", userId)
        .single();

      if (userOrgData?.organization_id) {
        return {
          success: true,
          organizationId: userOrgData.organization_id,
          role: userOrgData.role,
        };
      }

      // Fallback to organization_members table
      const { data: memberData } = await supabase
        .from("organization_members")
        .select("organization_id, role")
        .eq("user_id", userId)
        .eq("is_active", true)
        .single();

      if (memberData?.organization_id) {
        return {
          success: true,
          organizationId: memberData.organization_id,
          role: memberData.role,
        };
      }

      return {
        success: false,
        error: "No organization association found",
      };
    } catch (error) {
      return {
        success: false,
        error: `Organization lookup failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  /**
   * Validate specific route access permissions
   */
  private static async validateRouteAccess(
    pathname: string,
    organizationId: string,
    role: string,
    supabase: any,
  ): Promise<{ success: boolean; error?: string; statusCode?: number }> {
    // Admin-only routes
    if (this.isAdminRoute(pathname) && !["owner", "admin"].includes(role)) {
      return {
        success: false,
        error: "Admin access required",
        statusCode: 403,
      };
    }

    // Owner-only routes
    if (this.isOwnerRoute(pathname) && role !== "owner") {
      return {
        success: false,
        error: "Owner access required",
        statusCode: 403,
      };
    }

    // Validate organization exists and is active
    const { data: org } = await supabase
      .from("organizations")
      .select("id, status")
      .eq("id", organizationId)
      .single();

    if (!org) {
      return {
        success: false,
        error: "Organization not found",
        statusCode: 404,
      };
    }

    if (org.status !== "active") {
      return {
        success: false,
        error: "Organization account suspended",
        statusCode: 403,
      };
    }

    return { success: true };
  }

  /**
   * Check if route is public and doesn't require organization validation
   */
  private static isPublicRoute(pathname: string): boolean {
    const publicPaths = [
      "/api/auth",
      "/api/webhooks",
      "/api/public-api",
      "/api/booking-by-slug",
      "/api/ping",
      "/api/health",
      "/api/client-portal",
      "/api/client-access",
      "/api/login-otp",
      "/api/test/login", // E2E test endpoint
    ];

    return publicPaths.some((path) => pathname.startsWith(path));
  }

  /**
   * Check if route is a webhook and has its own security
   */
  private static isWebhookRoute(pathname: string): boolean {
    return (
      pathname.startsWith("/api/webhooks/") ||
      pathname.includes("/webhook") ||
      pathname.includes("/callback")
    );
  }

  /**
   * Check if route requires admin access
   */
  private static isAdminRoute(pathname: string): boolean {
    const adminPaths = [
      "/api/admin",
      "/api/organization/settings",
      "/api/staff",
      "/api/billing",
      "/api/integrations/manage",
    ];

    return adminPaths.some((path) => pathname.startsWith(path));
  }

  /**
   * Check if route requires owner access
   */
  private static isOwnerRoute(pathname: string): boolean {
    const ownerPaths = [
      "/api/organization/delete",
      "/api/billing/cancel",
      "/api/staff/remove-admin",
    ];

    return ownerPaths.some((path) => pathname.startsWith(path));
  }

  /**
   * Log security events for audit trail
   */
  private static logAccess(logEntry: any): void {
    // Add to in-memory log (in production, this should go to a persistent store)
    this.auditLog.push(logEntry);

    // Keep only last 1000 entries in memory
    if (this.auditLog.length > 1000) {
      this.auditLog = this.auditLog.slice(-1000);
    }

    // Log suspicious activity
    if (logEntry.result === "forbidden" || logEntry.result === "unauthorized") {
      console.warn("SECURITY: Unauthorized access attempt", {
        userId: logEntry.userId,
        organizationId: logEntry.organizationId,
        route: logEntry.route,
        ip: logEntry.ip,
        details: logEntry.details,
      });
    }

    // In production, also send to external security monitoring service
    if (
      process.env.NODE_ENV === "production" &&
      process.env.SECURITY_WEBHOOK_URL
    ) {
      // Send to security monitoring service (async, don't wait)
      fetch(process.env.SECURITY_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(logEntry),
      }).catch((err) => console.error("Failed to send security log:", err));
    }
  }

  /**
   * Get audit logs for security review
   */
  static getAuditLogs(organizationId?: string, limit: number = 100) {
    let logs = this.auditLog;

    if (organizationId) {
      logs = logs.filter((log) => log.organizationId === organizationId);
    }

    return logs
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      )
      .slice(0, limit);
  }

  /**
   * Clear audit logs (for testing purposes)
   */
  static clearAuditLogs(): void {
    this.auditLog = [];
  }
}
