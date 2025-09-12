/**
 * Client-Side Error Reporting API Endpoint
 *
 * POST /api/errors/report - Report client-side errors for monitoring
 */

import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/app/lib/errors/error-handler";
import { ValidationError, AppError } from "@/app/lib/errors/error-classes";
import { errorLogger } from "@/app/lib/errors/error-logger";
import { getUser } from "@/app/lib/api/auth-check";
import { createAdminClient } from "@/app/lib/supabase/admin";

// Rate limiting for error reporting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_MAX_REQUESTS = 50; // Max 50 error reports per hour per IP
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

interface ClientErrorReport {
  message: string;
  stack?: string;
  url: string;
  lineNumber?: number;
  columnNumber?: number;
  userAgent: string;
  timestamp: string;
  severity: "low" | "medium" | "high" | "critical";
  category: "javascript" | "network" | "ui" | "performance" | "security";
  component?: string;
  props?: Record<string, any>;
  userId?: string;
  organizationId?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
}

export async function POST(request: NextRequest) {
  try {
    // Get IP address for rate limiting
    const ipAddress =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";

    // Check rate limit
    checkRateLimit(ipAddress);

    // Parse request body
    const body: ClientErrorReport = await request.json();

    // Validate required fields
    validateErrorReport(body);

    // Get user context if available (optional for client errors)
    const user = await getUser();

    // Clean and sanitize the error report
    const sanitizedReport = sanitizeErrorReport(body);

    // Create error object
    const clientError = new AppError(
      sanitizedReport.message,
      500,
      "CLIENT_ERROR",
      true,
      {
        category: sanitizedReport.category,
        component: sanitizedReport.component,
        url: sanitizedReport.url,
        lineNumber: sanitizedReport.lineNumber,
        columnNumber: sanitizedReport.columnNumber,
        userAgent: sanitizedReport.userAgent,
        severity: sanitizedReport.severity,
        props: sanitizedReport.props,
        sessionId: sanitizedReport.sessionId,
        clientTimestamp: sanitizedReport.timestamp,
        metadata: sanitizedReport.metadata,
      },
    );

    // Add user context if available
    if (user) {
      clientError.withUser(user.id).withOrganization(user.organizationId);
    }

    // Add stack trace if provided
    if (sanitizedReport.stack) {
      (clientError as any).stack = sanitizedReport.stack;
    }

    // Log the error
    await errorLogger.logError(clientError, {
      userId: user?.id,
      organizationId: user?.organizationId,
      userAgent: sanitizedReport.userAgent,
      ipAddress,
      endpoint: sanitizedReport.url,
      method: "CLIENT",
      requestId: generateRequestId(),
    });

    // Store in database for analysis
    await storeClientError(clientError, sanitizedReport, user, ipAddress);

    // Check if this is a critical error that needs immediate attention
    if (
      sanitizedReport.severity === "critical" ||
      shouldAlertOnError(sanitizedReport)
    ) {
      await sendCriticalErrorAlert(clientError, sanitizedReport, user);
    }

    return NextResponse.json({
      success: true,
      message: "Error report received and logged",
      reportId: generateReportId(clientError),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return handleApiError(error, request, {
      endpoint: "/api/errors/report",
    });
  }
}

/**
 * Check rate limiting for error reporting
 */
function checkRateLimit(ipAddress: string): void {
  const now = Date.now();
  const rateLimitData = rateLimitMap.get(ipAddress);

  if (!rateLimitData || now > rateLimitData.resetTime) {
    // Reset or initialize rate limit
    rateLimitMap.set(ipAddress, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW_MS,
    });
    return;
  }

  if (rateLimitData.count >= RATE_LIMIT_MAX_REQUESTS) {
    throw new ValidationError(
      "Too many error reports from this IP address. Please try again later.",
      "rate_limit",
      rateLimitData.count,
      ["rate_limit"],
      {
        ipAddress,
        resetTime: new Date(rateLimitData.resetTime),
        maxRequests: RATE_LIMIT_MAX_REQUESTS,
      },
    );
  }

  // Increment count
  rateLimitData.count++;
  rateLimitMap.set(ipAddress, rateLimitData);
}

/**
 * Validate error report structure
 */
function validateErrorReport(report: any): void {
  if (!report.message || typeof report.message !== "string") {
    throw ValidationError.required("message");
  }

  if (!report.url || typeof report.url !== "string") {
    throw ValidationError.required("url");
  }

  if (!report.userAgent || typeof report.userAgent !== "string") {
    throw ValidationError.required("userAgent");
  }

  if (!report.timestamp || typeof report.timestamp !== "string") {
    throw ValidationError.required("timestamp");
  }

  if (
    report.severity &&
    !["low", "medium", "high", "critical"].includes(report.severity)
  ) {
    throw ValidationError.invalid(
      "severity",
      report.severity,
      "one of: low, medium, high, critical",
    );
  }

  // Category validation removed - we now map invalid categories to valid ones

  // Check message length
  if (report.message.length > 1000) {
    throw ValidationError.tooLong("message", report.message, 1000);
  }

  // Check URL format
  try {
    new URL(report.url);
  } catch {
    throw ValidationError.invalid("url", report.url, "valid URL");
  }

  // Validate timestamp
  const timestamp = new Date(report.timestamp);
  if (isNaN(timestamp.getTime())) {
    throw ValidationError.invalid(
      "timestamp",
      report.timestamp,
      "valid ISO date string",
    );
  }

  // Check if timestamp is not too old (more than 24 hours)
  const now = new Date();
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours
  if (now.getTime() - timestamp.getTime() > maxAge) {
    throw ValidationError.invalid(
      "timestamp",
      report.timestamp,
      "timestamp within last 24 hours",
    );
  }
}

/**
 * Map invalid categories to valid ones
 */
function mapErrorCategory(
  category: string | undefined,
): "javascript" | "network" | "ui" | "performance" | "security" {
  if (!category || typeof category !== "string") {
    return "javascript";
  }

  const lowerCategory = category.toLowerCase().trim();

  // Direct matches
  if (
    ["javascript", "network", "ui", "performance", "security"].includes(
      lowerCategory,
    )
  ) {
    return lowerCategory as
      | "javascript"
      | "network"
      | "ui"
      | "performance"
      | "security";
  }

  // Map common variations
  const categoryMappings: Record<
    string,
    "javascript" | "network" | "ui" | "performance" | "security"
  > = {
    // JavaScript variations
    react_component: "javascript",
    react: "javascript",
    component: "javascript",
    js: "javascript",
    typescript: "javascript",
    ts: "javascript",
    runtime: "javascript",
    script: "javascript",
    global_javascript: "javascript",
    unhandled_promise: "javascript",
    promise: "javascript",

    // Network variations
    api: "network",
    http: "network",
    fetch: "network",
    request: "network",
    response: "network",
    connection: "network",
    timeout: "network",
    cors: "network",

    // UI variations
    user_interface: "ui",
    layout: "ui",
    rendering: "ui",
    display: "ui",
    visual: "ui",
    css: "ui",
    style: "ui",
    resource_loading: "ui",

    // Performance variations
    perf: "performance",
    slow: "performance",
    memory: "performance",
    cpu: "performance",
    optimization: "performance",

    // Security variations
    auth: "security",
    authentication: "security",
    authorization: "security",
    permission: "security",
    xss: "security",
    csrf: "security",
    injection: "security",
  };

  return categoryMappings[lowerCategory] || "javascript";
}

/**
 * Sanitize error report to prevent XSS and other attacks
 */
function sanitizeErrorReport(report: ClientErrorReport): ClientErrorReport {
  const sanitized: ClientErrorReport = {
    message: sanitizeString(report.message, 1000),
    url: sanitizeUrl(report.url),
    userAgent: sanitizeString(report.userAgent, 500),
    timestamp: report.timestamp,
    severity: report.severity || "medium",
    category: mapErrorCategory(report.category),
  };

  // Sanitize optional fields
  if (report.stack) {
    sanitized.stack = sanitizeString(report.stack, 10000);
  }

  if (report.lineNumber && typeof report.lineNumber === "number") {
    sanitized.lineNumber = Math.max(0, Math.min(report.lineNumber, 1000000));
  }

  if (report.columnNumber && typeof report.columnNumber === "number") {
    sanitized.columnNumber = Math.max(0, Math.min(report.columnNumber, 10000));
  }

  if (report.component && typeof report.component === "string") {
    sanitized.component = sanitizeString(report.component, 100);
  }

  if (report.sessionId && typeof report.sessionId === "string") {
    sanitized.sessionId = sanitizeString(report.sessionId, 100);
  }

  // Sanitize nested objects
  if (report.props && typeof report.props === "object") {
    sanitized.props = sanitizeObject(report.props, 5); // Max 5 levels deep
  }

  if (report.metadata && typeof report.metadata === "object") {
    sanitized.metadata = sanitizeObject(report.metadata, 3); // Max 3 levels deep
  }

  return sanitized;
}

/**
 * Sanitize string input
 */
function sanitizeString(str: string, maxLength: number): string {
  if (typeof str !== "string") return "";

  // Remove potential XSS patterns
  const cleaned = str
    .replace(
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      "[script removed]",
    )
    .replace(/javascript:/gi, "javascript-removed:")
    .replace(/on\w+\s*=/gi, "on-event-removed=");

  return cleaned.length > maxLength
    ? cleaned.substring(0, maxLength) + "..."
    : cleaned;
}

/**
 * Sanitize URL
 */
function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Only allow http/https protocols
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return "invalid-protocol";
    }
    return parsed.href;
  } catch {
    return "invalid-url";
  }
}

/**
 * Sanitize object recursively
 */
function sanitizeObject(obj: any, maxDepth: number): any {
  if (maxDepth <= 0 || obj === null || typeof obj !== "object") {
    return typeof obj === "string" ? sanitizeString(obj, 500) : obj;
  }

  if (Array.isArray(obj)) {
    return obj.slice(0, 10).map((item) => sanitizeObject(item, maxDepth - 1)); // Max 10 array items
  }

  const sanitized: any = {};
  let keyCount = 0;

  for (const [key, value] of Object.entries(obj)) {
    if (keyCount >= 20) break; // Max 20 keys per object

    const sanitizedKey = sanitizeString(key, 50);
    sanitized[sanitizedKey] = sanitizeObject(value, maxDepth - 1);
    keyCount++;
  }

  return sanitized;
}

/**
 * Store client error in database
 */
async function storeClientError(
  error: AppError,
  report: ClientErrorReport,
  user: any,
  ipAddress: string,
): Promise<void> {
  try {
    const supabase = createAdminClient();

    await supabase.from("client_error_reports").insert({
      message: error.message,
      error_code: error.errorCode,
      stack_trace: report.stack,
      url: report.url,
      line_number: report.lineNumber,
      column_number: report.columnNumber,
      user_agent: report.userAgent,
      severity: report.severity,
      category: report.category,
      component: report.component,
      props: report.props,
      session_id: report.sessionId,
      client_timestamp: report.timestamp,
      server_timestamp: new Date().toISOString(),
      user_id: user?.id,
      organization_id: user?.organizationId,
      ip_address: ipAddress,
      context: error.context,
      metadata: report.metadata,
    });
  } catch (dbError) {
    // Don't fail the API call if database storage fails
    console.error("Failed to store client error in database:", dbError);
  }
}

/**
 * Check if error should trigger an alert
 */
function shouldAlertOnError(report: ClientErrorReport): boolean {
  // Alert on security-related errors
  if (report.category === "security") return true;

  // Alert on critical JavaScript errors
  if (report.category === "javascript" && report.severity === "critical")
    return true;

  // Alert on network errors that might indicate service issues
  if (report.category === "network" && report.message.includes("500"))
    return true;

  return false;
}

/**
 * Send critical error alert
 */
async function sendCriticalErrorAlert(
  error: AppError,
  report: ClientErrorReport,
  user: any,
): Promise<void> {
  try {
    // This would integrate with your alerting system
    console.log("Critical client error alert:", {
      message: error.message,
      category: report.category,
      severity: report.severity,
      url: report.url,
      user: user?.id,
      organization: user?.organizationId,
    });

    // Here you could send to Slack, email, or other alerting systems
  } catch (alertError) {
    console.error("Failed to send critical error alert:", alertError);
  }
}

/**
 * Generate unique report ID
 */
function generateReportId(error: AppError): string {
  const timestamp = Date.now().toString(36);
  const randomSuffix = Math.random().toString(36).substr(2, 8);
  return `client_${timestamp}_${randomSuffix}`;
}

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  return `req_client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
