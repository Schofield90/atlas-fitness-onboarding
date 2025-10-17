import { LRUCache } from "lru-cache";
import { NextRequest, NextResponse } from "next/server";

type Options = {
  uniqueTokenPerInterval?: number;
  interval?: number;
};

export function rateLimit(options?: Options) {
  const tokenCache = new LRUCache({
    max: options?.uniqueTokenPerInterval || 500,
    ttl: options?.interval || 60000,
  });

  return {
    check: async (req: NextRequest, limit: number, token: string) => {
      const tokenCount = (tokenCache.get(token) as number[]) || [0];

      if (tokenCount[0] === 0) {
        tokenCache.set(token, [1]);
        return true;
      }

      if (tokenCount[0] < limit) {
        tokenCount[0] += 1;
        tokenCache.set(token, tokenCount);
        return true;
      }

      return false;
    },
  };
}

// Authentication-specific rate limiters
const authLimiters = {
  otpSend: new LRUCache<string, number>({
    max: 1000,
    ttl: 15 * 60 * 1000, // 15 minutes
  }),
  otpVerify: new LRUCache<string, number>({
    max: 1000,
    ttl: 15 * 60 * 1000, // 15 minutes
  }),
  passwordLogin: new LRUCache<string, number>({
    max: 1000,
    ttl: 15 * 60 * 1000, // 15 minutes
  }),
};

export function getClientIdentifier(req: NextRequest): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  const cfConnectingIp = req.headers.get("cf-connecting-ip");

  return (
    forwardedFor?.split(",")[0]?.trim() || realIp || cfConnectingIp || "unknown"
  );
}

export type AuthRateLimitType = "otpSend" | "otpVerify" | "passwordLogin";

export function checkAuthRateLimit(
  req: NextRequest,
  type: AuthRateLimitType,
  identifier?: string,
): { allowed: boolean; remaining: number; resetIn: number } {
  const limits = {
    otpSend: 3, // 3 OTP sends per 15 minutes
    otpVerify: 5, // 5 verification attempts per 15 minutes
    passwordLogin: 5, // 5 password attempts per 15 minutes
  };

  const key = identifier || getClientIdentifier(req);
  const cache = authLimiters[type];
  const current = cache.get(key) || 0;
  const limit = limits[type];

  if (current >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetIn: 15 * 60, // seconds until reset
    };
  }

  cache.set(key, current + 1);

  return {
    allowed: true,
    remaining: limit - current - 1,
    resetIn: 15 * 60,
  };
}

export function createRateLimitResponse(resetIn: number): NextResponse {
  const minutes = Math.ceil(resetIn / 60);
  return NextResponse.json(
    {
      success: false,
      error: `Too many attempts. Please try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
      rateLimited: true,
    },
    { status: 429 },
  );
}
