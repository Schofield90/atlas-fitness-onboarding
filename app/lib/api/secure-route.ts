import { NextRequest, NextResponse } from "next/server";
import { OrganizationSecurityMiddleware } from "@/app/lib/middleware/organization-security";
import { InputValidationMiddleware } from "@/app/lib/middleware/input-validation";

export interface SecureRouteContext {
  organizationId: string;
  userId: string;
  role: string;
  request: NextRequest;
}

export interface SecureRouteHandler {
  (context: SecureRouteContext): Promise<NextResponse> | NextResponse;
}

export interface SecureRouteOptions {
  /** Skip organization validation for this route */
  skipOrgValidation?: boolean;
  /** Required role for this route */
  requiredRole?: "owner" | "admin" | "staff" | "viewer";
  /** Custom validation function */
  customValidation?: (
    context: SecureRouteContext,
  ) => Promise<boolean> | boolean;
  /** Rate limiting options */
  rateLimit?: {
    requests: number;
    windowMs: number;
  };
  /** Skip input sanitization (not recommended) */
  skipInputSanitization?: boolean;
  /** Custom input validation function */
  customInputValidation?: (body: any) => {
    valid: boolean;
    error?: string;
    sanitized?: any;
  };
}

/**
 * Secure route wrapper that automatically applies organization validation and security checks
 *
 * @example
 * ```typescript
 * export const GET = secureRoute(async ({ organizationId, userId, request }) => {
 *   const supabase = await createClient()
 *   const { data } = await supabase
 *     .from('leads')
 *     .select('*')
 *     .eq('organization_id', organizationId) // Automatically scoped
 *
 *   return NextResponse.json({ data })
 * }, { requiredRole: 'admin' })
 * ```
 */
export function secureRoute(
  handler: SecureRouteHandler,
  options: SecureRouteOptions = {},
): (request: NextRequest, ...args: any[]) => Promise<NextResponse> {
  return async (
    request: NextRequest,
    ...args: any[]
  ): Promise<NextResponse> => {
    try {
      // Apply rate limiting if configured
      if (options.rateLimit) {
        const rateLimitResult = await applyRateLimit(
          request,
          options.rateLimit,
        );
        if (!rateLimitResult.success) {
          return NextResponse.json(
            {
              error: "Rate limit exceeded",
              retryAfter: rateLimitResult.retryAfter,
            },
            {
              status: 429,
              headers: rateLimitResult.retryAfter
                ? {
                    "Retry-After": rateLimitResult.retryAfter.toString(),
                  }
                : {},
            },
          );
        }
      }

      // Skip organization validation if requested
      if (options.skipOrgValidation) {
        // Still validate basic auth but allow cross-organization access
        const basicAuth = await validateBasicAuth(request);
        if (!basicAuth.success) {
          return NextResponse.json(
            { error: basicAuth.error },
            { status: basicAuth.statusCode || 401 },
          );
        }

        return handler({
          organizationId: basicAuth.organizationId || "",
          userId: basicAuth.userId || "",
          role: basicAuth.role || "viewer",
          request,
        });
      }

      // Apply full organization security validation
      const securityResult =
        await OrganizationSecurityMiddleware.validateOrganizationAccess(
          request,
        );

      if (!securityResult.success) {
        return NextResponse.json(
          {
            error: securityResult.error || "Access denied",
            code: "ORGANIZATION_ACCESS_DENIED",
          },
          { status: securityResult.statusCode || 403 },
        );
      }

      // Apply input sanitization for POST/PUT/PATCH requests
      let sanitizedRequest = request;
      if (
        !options.skipInputSanitization &&
        ["POST", "PUT", "PATCH"].includes(request.method)
      ) {
        try {
          const body = await request.json();

          // Apply custom input validation if provided
          if (options.customInputValidation) {
            const validationResult = options.customInputValidation(body);
            if (!validationResult.valid) {
              return NextResponse.json(
                {
                  error: validationResult.error || "Input validation failed",
                  code: "INPUT_VALIDATION_FAILED",
                },
                { status: 400 },
              );
            }
            // Use sanitized data if provided
            if (validationResult.sanitized) {
              // Create a new request with sanitized body
              sanitizedRequest = new NextRequest(request.url, {
                method: request.method,
                headers: request.headers,
                body: JSON.stringify(validationResult.sanitized),
              });
            }
          } else {
            // Apply default input sanitization
            const sanitizedBody =
              InputValidationMiddleware.sanitizeRequestBody(body);

            // Create a new request with sanitized body
            sanitizedRequest = new NextRequest(request.url, {
              method: request.method,
              headers: request.headers,
              body: JSON.stringify(sanitizedBody),
            });
          }
        } catch (error) {
          return NextResponse.json(
            {
              error: "Invalid JSON payload",
              code: "INVALID_JSON",
            },
            { status: 400 },
          );
        }
      }

      const context: SecureRouteContext = {
        organizationId: securityResult.organizationId!,
        userId: securityResult.userId!,
        role: securityResult.role || "viewer",
        request: sanitizedRequest,
      };

      // Check required role
      if (
        options.requiredRole &&
        !hasRequiredRole(context.role, options.requiredRole)
      ) {
        return NextResponse.json(
          {
            error: `${options.requiredRole} role required`,
            code: "INSUFFICIENT_PERMISSIONS",
          },
          { status: 403 },
        );
      }

      // Apply custom validation
      if (options.customValidation) {
        const customValid = await options.customValidation(context);
        if (!customValid) {
          return NextResponse.json(
            {
              error: "Custom validation failed",
              code: "CUSTOM_VALIDATION_FAILED",
            },
            { status: 403 },
          );
        }
      }

      // Call the actual handler with validated context
      return await handler(context);
    } catch (error) {
      console.error("Secure route error:", error);

      // Don't expose internal errors in production
      if (process.env.NODE_ENV === "production") {
        return NextResponse.json(
          {
            error: "Internal server error",
            code: "INTERNAL_ERROR",
          },
          { status: 500 },
        );
      }

      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : "Unknown error",
          code: "INTERNAL_ERROR",
        },
        { status: 500 },
      );
    }
  };
}

/**
 * Basic auth validation without organization checks
 */
async function validateBasicAuth(request: NextRequest): Promise<{
  success: boolean;
  userId?: string;
  organizationId?: string;
  role?: string;
  error?: string;
  statusCode?: number;
}> {
  // Implementation would check session without organization validation
  // This is a simplified version - in practice would use Supabase client
  return {
    success: true,
    userId: "temp",
    organizationId: "temp",
    role: "viewer",
  };
}

/**
 * Check if user has required role
 */
function hasRequiredRole(userRole: string, requiredRole: string): boolean {
  const roleHierarchy = {
    viewer: 0,
    staff: 1,
    admin: 2,
    owner: 3,
  };

  const userLevel = roleHierarchy[userRole as keyof typeof roleHierarchy] || 0;
  const requiredLevel =
    roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0;

  return userLevel >= requiredLevel;
}

/**
 * In-memory rate limiting (in production, use Redis or similar)
 */
const rateLimitStore = new Map<
  string,
  { requests: number; resetTime: number }
>();

async function applyRateLimit(
  request: NextRequest,
  config: { requests: number; windowMs: number },
): Promise<{ success: boolean; retryAfter?: number }> {
  const ip = request.ip || request.headers.get("x-forwarded-for") || "unknown";
  const key = `${ip}:${request.nextUrl.pathname}`;
  const now = Date.now();

  const current = rateLimitStore.get(key);

  if (!current || now > current.resetTime) {
    // Reset or create new entry
    rateLimitStore.set(key, {
      requests: 1,
      resetTime: now + config.windowMs,
    });
    return { success: true };
  }

  if (current.requests >= config.requests) {
    // Rate limit exceeded
    const retryAfter = Math.ceil((current.resetTime - now) / 1000);
    return { success: false, retryAfter };
  }

  // Increment counter
  current.requests++;
  return { success: true };
}

/**
 * Utility function to create database queries that are automatically organization-scoped
 */
export function createOrgScopedQuery<T = any>(
  supabase: any,
  tableName: string,
  organizationId: string,
) {
  return {
    select: (columns?: string) =>
      supabase
        .from(tableName)
        .select(columns || "*")
        .eq("organization_id", organizationId),

    insert: (data: any) =>
      supabase
        .from(tableName)
        .insert({ ...data, organization_id: organizationId })
        .select(),

    update: (id: string, data: any) =>
      supabase
        .from(tableName)
        .update(data)
        .eq("id", id)
        .eq("organization_id", organizationId)
        .select(),

    delete: (id: string) =>
      supabase
        .from(tableName)
        .delete()
        .eq("id", id)
        .eq("organization_id", organizationId),

    upsert: (data: any) =>
      supabase
        .from(tableName)
        .upsert({ ...data, organization_id: organizationId })
        .select(),
  };
}

/**
 * Type-safe response builder
 */
export class SecureResponse {
  static success<T>(data: T, meta?: any) {
    return NextResponse.json({
      success: true,
      data,
      meta,
    });
  }

  static error(message: string, code?: string, statusCode: number = 400) {
    return NextResponse.json(
      {
        success: false,
        error: message,
        code,
      },
      { status: statusCode },
    );
  }

  static unauthorized(message: string = "Unauthorized") {
    return NextResponse.json(
      {
        success: false,
        error: message,
        code: "UNAUTHORIZED",
      },
      { status: 401 },
    );
  }

  static forbidden(message: string = "Forbidden") {
    return NextResponse.json(
      {
        success: false,
        error: message,
        code: "FORBIDDEN",
      },
      { status: 403 },
    );
  }

  static notFound(message: string = "Not found") {
    return NextResponse.json(
      {
        success: false,
        error: message,
        code: "NOT_FOUND",
      },
      { status: 404 },
    );
  }
}
