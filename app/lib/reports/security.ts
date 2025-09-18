import { NextRequest } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { requireOrgAccess } from "@/app/lib/auth/organization";
import type { ReportType } from "./types";

// ====================
// AUTHENTICATION & AUTHORIZATION
// ====================

/**
 * Verify user has access to organization and return org ID
 */
export async function verifyOrganizationAccess(): Promise<
  | {
      success: true;
      organizationId: string;
      userId: string;
    }
  | {
      success: false;
      error: string;
      statusCode: number;
    }
> {
  try {
    const { organizationId, userId } = await requireOrgAccess();

    if (!organizationId) {
      return {
        success: false,
        error: "No organization found. Please complete onboarding.",
        statusCode: 401,
      };
    }

    return {
      success: true,
      organizationId,
      userId,
    };
  } catch (error: any) {
    console.error("Organization access verification failed:", error);

    if (error.message?.includes("unauthorized")) {
      return {
        success: false,
        error: "Unauthorized access",
        statusCode: 401,
      };
    }

    return {
      success: false,
      error: "Authentication required",
      statusCode: 401,
    };
  }
}

/**
 * Check if user has permission for specific report type
 */
export async function verifyReportPermission(
  userId: string,
  organizationId: string,
  reportType: ReportType,
): Promise<boolean> {
  try {
    const supabase = await createAdminClient();

    // Get user's role in the organization
    const { data: userRole, error } = await supabase
      .from("organization_staff")
      .select("role, permissions")
      .eq("user_id", userId)
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .single();

    if (error || !userRole) {
      console.error("Failed to get user role:", error);
      return false;
    }

    // Define report permissions by role
    const permissions = getReportPermissions(
      userRole.role,
      userRole.permissions,
    );

    return (
      permissions.includes(reportType) || permissions.includes("all_reports")
    );
  } catch (error) {
    console.error("Permission check failed:", error);
    return false;
  }
}

/**
 * Get report permissions based on user role
 */
function getReportPermissions(
  role: string,
  customPermissions?: string[],
): string[] {
  // Default role-based permissions
  const rolePermissions: Record<string, string[]> = {
    owner: ["all_reports"],
    admin: ["all_reports"],
    manager: ["attendance", "invoice", "revenue", "discount_code"],
    instructor: ["attendance", "payout"],
    staff: ["attendance"],
    viewer: ["attendance"],
  };

  const basePermissions = rolePermissions[role] || ["attendance"];

  // Merge with custom permissions if provided
  if (customPermissions && Array.isArray(customPermissions)) {
    return [...new Set([...basePermissions, ...customPermissions])];
  }

  return basePermissions;
}

// ====================
// ROW LEVEL SECURITY (RLS)
// ====================

/**
 * Ensure RLS is enforced for organization isolation
 */
export async function enforceRLS(
  supabaseClient: any,
  organizationId: string,
): Promise<void> {
  // Set organization context for RLS
  await supabaseClient.rpc("set_organization_context", {
    org_id: organizationId,
  });
}

/**
 * Validate that query results are properly filtered by organization
 */
export function validateOrganizationIsolation<T extends Record<string, any>>(
  data: T[],
  expectedOrganizationId: string,
  organizationField: string = "organization_id",
): { valid: boolean; error?: string } {
  if (!Array.isArray(data)) {
    return { valid: true }; // Non-array data doesn't need validation
  }

  for (let i = 0; i < data.length; i++) {
    const record = data[i];
    if (record[organizationField] !== expectedOrganizationId) {
      return {
        valid: false,
        error: `Data leakage detected: record ${i} belongs to organization ${record[organizationField]} but query was for ${expectedOrganizationId}`,
      };
    }
  }

  return { valid: true };
}

/**
 * Sanitize query parameters to prevent injection
 */
export function sanitizeQueryParams(
  params: Record<string, any>,
): Record<string, any> {
  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(params)) {
    // Skip undefined/null values
    if (value === undefined || value === null) {
      continue;
    }

    // Validate UUIDs
    if (key.endsWith("_id") && typeof value === "string") {
      if (!isValidUUID(value)) {
        console.warn(`Invalid UUID in parameter ${key}: ${value}`);
        continue;
      }
    }

    // Validate dates
    if (
      (key.includes("date") || key.endsWith("_at")) &&
      typeof value === "string"
    ) {
      if (!isValidDate(value)) {
        console.warn(`Invalid date in parameter ${key}: ${value}`);
        continue;
      }
    }

    // Validate enums for known fields
    if (key === "group_by" && typeof value === "string") {
      const validGroupBy = [
        "each",
        "customer",
        "class_type",
        "venue",
        "instructor",
        "day_of_week",
        "start_time",
        "booking_method",
        "status",
        "booking_source",
        "month",
        "week",
        "year",
      ];
      if (!validGroupBy.includes(value)) {
        console.warn(`Invalid group_by value: ${value}`);
        continue;
      }
    }

    // Validate arrays
    if (Array.isArray(value)) {
      const sanitizedArray = value.filter(
        (item) =>
          typeof item === "string" &&
          item.length > 0 &&
          item.length < 100 && // Reasonable max length
          !containsSQLKeywords(item),
      );

      if (sanitizedArray.length > 0) {
        sanitized[key] = sanitizedArray;
      }
    } else if (typeof value === "string") {
      // Sanitize string values
      const sanitizedValue = sanitizeStringValue(value);
      if (sanitizedValue) {
        sanitized[key] = sanitizedValue;
      }
    } else if (typeof value === "number") {
      // Validate numeric values
      if (isFinite(value) && value >= 0 && value <= Number.MAX_SAFE_INTEGER) {
        sanitized[key] = value;
      }
    } else if (typeof value === "boolean") {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Validate UUID format
 */
function isValidUUID(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validate date format
 */
function isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return !isNaN(date.getTime()) && date instanceof Date;
}

/**
 * Check for SQL injection keywords
 */
function containsSQLKeywords(value: string): boolean {
  const sqlKeywords = [
    "select",
    "insert",
    "update",
    "delete",
    "drop",
    "create",
    "alter",
    "union",
    "exec",
    "execute",
    "declare",
    "script",
    "javascript",
    "--",
    "/*",
    "*/",
    ";",
    "xp_",
    "sp_",
  ];

  const lowerValue = value.toLowerCase();
  return sqlKeywords.some((keyword) => lowerValue.includes(keyword));
}

/**
 * Sanitize string values
 */
function sanitizeStringValue(value: string): string | null {
  if (typeof value !== "string") return null;

  // Remove control characters and limit length
  const cleaned = value
    .replace(/[\x00-\x1F\x7F]/g, "") // Remove control characters
    .trim()
    .slice(0, 500); // Max 500 characters

  if (cleaned.length === 0) return null;
  if (containsSQLKeywords(cleaned)) return null;

  return cleaned;
}

// ====================
// RATE LIMITING
// ====================

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  report_query: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30, // 30 requests per minute
    skipSuccessfulRequests: false,
  },
  report_export: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5, // 5 exports per minute
    skipSuccessfulRequests: false,
  },
  chart_data: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60, // 60 requests per minute (for dashboard updates)
    skipSuccessfulRequests: true,
  },
};

/**
 * Check rate limit for user/organization
 */
export async function checkRateLimit(
  identifier: string, // user_id or organization_id
  actionType: keyof typeof RATE_LIMITS,
  request?: NextRequest,
): Promise<{ allowed: boolean; remainingRequests?: number; resetTime?: Date }> {
  const config = RATE_LIMITS[actionType];
  if (!config) {
    return { allowed: true };
  }

  // TODO: Implement actual rate limiting with Redis or in-memory store
  // This is a placeholder implementation

  const rateLimitKey = `rate_limit:${actionType}:${identifier}`;
  const now = Date.now();
  const windowStart = now - config.windowMs;

  // For now, always allow (implement real rate limiting later)
  return {
    allowed: true,
    remainingRequests: config.maxRequests - 1,
    resetTime: new Date(now + config.windowMs),
  };
}

/**
 * Record rate limit attempt
 */
export async function recordRateLimitAttempt(
  identifier: string,
  actionType: string,
  success: boolean,
  request?: NextRequest,
): Promise<void> {
  // TODO: Implement rate limit recording
  console.log(
    `Rate limit attempt: ${actionType} for ${identifier}, success: ${success}`,
  );
}

// ====================
// INPUT VALIDATION
// ====================

/**
 * Validate report request parameters
 */
export function validateReportRequest(params: Record<string, any>): {
  valid: boolean;
  errors?: string[];
  sanitizedParams?: Record<string, any>;
} {
  const errors: string[] = [];
  const sanitizedParams = sanitizeQueryParams(params);

  // Check for required parameters
  if (params.organization_id && !isValidUUID(params.organization_id)) {
    errors.push("Invalid organization ID format");
  }

  // Validate date range
  if (params.date_from && params.date_to) {
    const fromDate = new Date(params.date_from);
    const toDate = new Date(params.date_to);

    if (fromDate >= toDate) {
      errors.push("Start date must be before end date");
    }

    // Check for reasonable date range (max 2 years)
    const maxRange = 2 * 365 * 24 * 60 * 60 * 1000; // 2 years in milliseconds
    if (toDate.getTime() - fromDate.getTime() > maxRange) {
      errors.push("Date range too large (maximum 2 years)");
    }
  }

  // Validate pagination
  if (params.page && (params.page < 1 || params.page > 10000)) {
    errors.push("Page number must be between 1 and 10000");
  }

  if (params.page_size && (params.page_size < 1 || params.page_size > 1000)) {
    errors.push("Page size must be between 1 and 1000");
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
    sanitizedParams,
  };
}

// ====================
// AUDIT LOGGING
// ====================

export interface AuditLogEntry {
  user_id: string;
  organization_id: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  ip_address?: string;
  user_agent?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

/**
 * Log report access for audit trail
 */
export async function logReportAccess(
  userId: string,
  organizationId: string,
  reportType: ReportType,
  action: "view" | "export" | "chart",
  filters: Record<string, any>,
  request?: NextRequest,
): Promise<void> {
  const auditEntry: AuditLogEntry = {
    user_id: userId,
    organization_id: organizationId,
    action: `report_${action}`,
    resource_type: `report_${reportType}`,
    ip_address: getClientIP(request),
    user_agent: request?.headers.get("user-agent") || undefined,
    timestamp: new Date().toISOString(),
    metadata: {
      filters,
      report_type: reportType,
    },
  };

  try {
    const supabase = await createAdminClient();
    await supabase.from("audit_logs").insert(auditEntry);
  } catch (error) {
    console.error("Failed to log audit entry:", error);
    // Don't fail the request if audit logging fails
  }
}

/**
 * Get client IP address from request
 */
function getClientIP(request?: NextRequest): string | undefined {
  if (!request) return undefined;

  return (
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    undefined
  );
}

// ====================
// DATA MASKING
// ====================

/**
 * Mask sensitive data in reports based on user permissions
 */
export function maskSensitiveData<T extends Record<string, any>>(
  data: T[],
  userId: string,
  userRole: string,
  reportType: ReportType,
): T[] {
  // Define sensitive fields by report type
  const sensitiveFields: Record<ReportType, string[]> = {
    attendance: ["email", "phone"],
    invoice: ["customer_email"],
    payout: ["instructor_email"],
    discount_code: ["customer_email"],
    revenue: [],
  };

  const fieldsToMask = sensitiveFields[reportType] || [];

  // Only mask for non-admin users
  if (["owner", "admin"].includes(userRole) || fieldsToMask.length === 0) {
    return data;
  }

  return data.map((record) => {
    const maskedRecord = { ...record };

    for (const field of fieldsToMask) {
      if (maskedRecord[field]) {
        maskedRecord[field] = maskField(maskedRecord[field], field);
      }
    }

    return maskedRecord;
  });
}

/**
 * Mask individual field value
 */
function maskField(value: string, fieldType: string): string {
  if (typeof value !== "string") return value;

  switch (fieldType) {
    case "email":
      const emailParts = value.split("@");
      if (emailParts.length === 2) {
        const username = emailParts[0];
        const domain = emailParts[1];
        const maskedUsername =
          username.length > 2
            ? username.substring(0, 2) + "*".repeat(username.length - 2)
            : "*".repeat(username.length);
        return `${maskedUsername}@${domain}`;
      }
      return value;

    case "phone":
      if (value.length > 4) {
        return "*".repeat(value.length - 4) + value.slice(-4);
      }
      return "*".repeat(value.length);

    default:
      return value;
  }
}

// ====================
// SECURITY HEADERS
// ====================

/**
 * Get security headers for report responses
 */
export function getSecurityHeaders(): Record<string, string> {
  return {
    "Cache-Control": "private, no-cache, no-store, must-revalidate",
    Pragma: "no-cache",
    Expires: "0",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
  };
}
