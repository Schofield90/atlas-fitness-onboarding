/**
 * API Middleware for Authentication and Authorization
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { cookies } from "next/headers";

export type UserRole =
  | "super_admin"
  | "owner"
  | "admin"
  | "coach"
  | "client"
  | "lead";

export interface AuthContext {
  user: {
    id: string;
    email: string;
    role: UserRole;
  };
  organizationId?: string;
  organizationRole?: string;
}

export interface ApiOptions {
  requireAuth?: boolean;
  requireOrganization?: boolean;
  requiredRole?: UserRole | UserRole[];
  allowedRoles?: UserRole[];
}

const roleHierarchy: Record<UserRole, number> = {
  super_admin: 100,
  owner: 50,
  admin: 40,
  coach: 30,
  client: 20,
  lead: 10,
};

export function hasRequiredRole(
  userRole: UserRole,
  requiredRole: UserRole | UserRole[],
): boolean {
  if (Array.isArray(requiredRole)) {
    return requiredRole.some(
      (role) => roleHierarchy[userRole] >= roleHierarchy[role],
    );
  }
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

export function withAuth(
  handler: (req: NextRequest, context: AuthContext) => Promise<NextResponse>,
  options: ApiOptions = { requireAuth: true },
) {
  return async (req: NextRequest) => {
    try {
      const supabase = await createClient();

      // Check authentication if required
      if (options.requireAuth !== false) {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          return apiError("Unauthorized", 401);
        }

        // Get user profile with role
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role, organization_id")
          .eq("id", user.id)
          .single();

        if (profileError || !profile) {
          return apiError("User profile not found", 403);
        }

        const userRole = profile.role as UserRole;

        // Check role requirements
        if (options.requiredRole) {
          if (!hasRequiredRole(userRole, options.requiredRole)) {
            return apiError("Insufficient permissions", 403);
          }
        }

        if (options.allowedRoles && !options.allowedRoles.includes(userRole)) {
          return apiError("Role not allowed", 403);
        }

        // Check organization requirements
        if (options.requireOrganization && !profile.organization_id) {
          return apiError("Organization membership required", 403);
        }

        // Build context
        const context: AuthContext = {
          user: {
            id: user.id,
            email: user.email!,
            role: userRole,
          },
          organizationId: profile.organization_id,
          organizationRole: userRole,
        };

        // Log security-sensitive operations
        if (
          userRole === "super_admin" ||
          options.requiredRole === "super_admin"
        ) {
          await logSecurityAudit({
            user_id: user.id,
            action: `API_ACCESS:${req.method}:${req.url}`,
            organization_id: profile.organization_id,
            ip_address:
              req.headers.get("x-forwarded-for") ||
              req.headers.get("x-real-ip") ||
              "unknown",
          });
        }

        // Call the handler with context
        return await handler(req, context);
      }

      // No auth required - call handler with empty context
      return await handler(req, {} as AuthContext);
    } catch (error) {
      console.error("API middleware error:", error);
      return apiError("Internal server error", 500);
    }
  };
}

export function apiResponse<T>(
  data: T,
  status: number = 200,
  headers?: HeadersInit,
): NextResponse {
  return NextResponse.json({ success: true, data }, { status, headers });
}

export function apiError(
  error: string,
  status: number = 400,
  details?: any,
): NextResponse {
  return NextResponse.json({ success: false, error, details }, { status });
}

async function logSecurityAudit(data: {
  user_id: string;
  action: string;
  organization_id?: string;
  ip_address?: string;
}) {
  try {
    const supabase = await createClient();
    await supabase.from("security_audit_logs").insert({
      ...data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to log security audit:", error);
  }
}

// Rate limiting configuration
export interface RateLimitConfig {
  windowMs: number;
  max: number;
}

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Endpoint-specific rate limits
export const rateLimits: Record<string, RateLimitConfig> = {
  "/api/auth/login": { windowMs: 60000, max: 5 },
  "/api/auth/signup": { windowMs: 60000, max: 3 },
  "/api/auth/password": { windowMs: 60000, max: 3 },
  "/api/payments": { windowMs: 60000, max: 10 },
  "/api/stripe": { windowMs: 60000, max: 10 },
  default: { windowMs: 60000, max: 30 },
};

export function withRateLimit(
  handler: (req: NextRequest, context: AuthContext) => Promise<NextResponse>,
  config?: RateLimitConfig,
) {
  return withAuth(async (req: NextRequest, context: AuthContext) => {
    // Get endpoint-specific limit or use provided config
    const endpoint = req.nextUrl.pathname;
    const effectiveConfig =
      config ||
      Object.entries(rateLimits).find(([key]) =>
        endpoint.startsWith(key),
      )?.[1] ||
      rateLimits.default;

    const identifier =
      context.user?.id || req.headers.get("x-forwarded-for") || "anonymous";
    const key = `${identifier}:${req.url}`;
    const now = Date.now();

    let record = rateLimitStore.get(key);

    if (!record || now > record.resetTime) {
      record = { count: 1, resetTime: now + effectiveConfig.windowMs };
      rateLimitStore.set(key, record);
    } else {
      record.count++;

      if (record.count > effectiveConfig.max) {
        // Log potential abuse
        if (record.count === effectiveConfig.max + 1) {
          await logSecurityAudit({
            user_id: context.user?.id || "anonymous",
            action: `RATE_LIMIT_EXCEEDED:${endpoint}`,
            organization_id: context.organizationId,
            ip_address:
              req.headers.get("x-forwarded-for") ||
              req.headers.get("x-real-ip") ||
              "unknown",
          });
        }

        return apiError("Too many requests", 429, {
          retryAfter: Math.ceil((record.resetTime - now) / 1000),
        });
      }
    }

    return handler(req, context);
  });
}
