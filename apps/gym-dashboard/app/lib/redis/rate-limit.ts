import { NextRequest, NextResponse } from "next/server";
import { createRateLimiter, RATE_LIMIT_TIERS } from "./config";
import { headers } from "next/headers";

export interface RateLimitOptions {
  identifier?: string;
  organizationId?: string;
  tier?: keyof typeof RATE_LIMIT_TIERS;
}

/**
 * Rate limiting middleware for API routes
 * Automatically detects organization and applies appropriate limits
 */
export async function rateLimit(
  request: NextRequest,
  options: RateLimitOptions = {},
) {
  // Determine the identifier (org ID, user ID, or IP)
  const identifier =
    options.identifier ||
    options.organizationId ||
    request.headers.get("x-organization-id") ||
    request.headers.get("x-forwarded-for") ||
    request.ip ||
    "anonymous";

  // Determine the tier based on organization subscription
  // TODO: Fetch this from database based on organization
  const tier = options.tier || "basic";

  const rateLimiter = createRateLimiter(tier);

  const { success, limit, reset, remaining } =
    await rateLimiter.limit(identifier);

  // Add rate limit headers to response
  const response = !success
    ? NextResponse.json(
        {
          error: "Too many requests",
          retryAfter: Math.floor((reset - Date.now()) / 1000),
        },
        { status: 429 },
      )
    : null;

  // Set rate limit headers
  const headersToSet = {
    "X-RateLimit-Limit": limit.toString(),
    "X-RateLimit-Remaining": remaining.toString(),
    "X-RateLimit-Reset": reset.toString(),
  };

  if (response) {
    Object.entries(headersToSet).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  }

  return { success, headers: headersToSet };
}

/**
 * HOC for API route handlers with rate limiting
 */
export function withRateLimit(
  handler: (req: NextRequest) => Promise<NextResponse>,
  options: RateLimitOptions = {},
) {
  return async (req: NextRequest) => {
    const rateLimitResult = await rateLimit(req, options);

    if (rateLimitResult && "status" in rateLimitResult) {
      return rateLimitResult;
    }

    const response = await handler(req);

    // Add rate limit headers to successful response
    if (rateLimitResult && "headers" in rateLimitResult) {
      Object.entries(rateLimitResult.headers).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
    }

    return response;
  };
}

/**
 * Get organization tier from database
 * This should be cached for performance
 */
export async function getOrganizationTier(
  organizationId: string,
): Promise<keyof typeof RATE_LIMIT_TIERS> {
  // TODO: Implement actual database lookup
  // For now, return default tier
  return "basic";
}

/**
 * Check if an identifier is currently rate limited
 */
export async function isRateLimited(
  identifier: string,
  tier: keyof typeof RATE_LIMIT_TIERS = "basic",
): Promise<boolean> {
  const rateLimiter = createRateLimiter(tier);
  const { success } = await rateLimiter.limit(identifier);
  return !success;
}

/**
 * Reset rate limit for a specific identifier
 * Use with caution - typically for admin operations
 */
export async function resetRateLimit(identifier: string): Promise<void> {
  // This would require access to the underlying Redis client
  // Implementation depends on your specific needs
  console.log(`Rate limit reset requested for: ${identifier}`);
}
