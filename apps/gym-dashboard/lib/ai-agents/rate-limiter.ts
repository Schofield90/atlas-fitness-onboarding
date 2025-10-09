/**
 * AI Agent Rate Limiter
 *
 * Prevents excessive API calls to AI providers (OpenAI, Anthropic).
 * Uses in-memory storage for simplicity (migrate to Redis for production multi-instance deployments).
 *
 * Limits:
 * - Global: 400 calls/minute (buffer under OpenAI Tier 1: 500 RPM)
 * - Per-Organization: 100 calls/minute
 * - Per-Agent: 50 calls/minute
 *
 * Note: This is a simple token bucket implementation.
 * For production scale (>100 tenants), migrate to Redis with sliding window.
 */

interface RateLimitCall {
  timestamp: number;
}

class RateLimiter {
  private calls: Map<string, number[]> = new Map();
  private lastCleanup: number = Date.now();
  private cleanupIntervalMs: number = 60000; // Cleanup every minute

  /**
   * Check if request is within rate limit
   * @param key - Unique identifier (e.g., "global", "org:uuid", "agent:uuid")
   * @param maxCalls - Maximum calls allowed in window
   * @param windowMs - Time window in milliseconds
   * @returns true if within limit, false if exceeded
   */
  async checkLimit(
    key: string,
    maxCalls: number,
    windowMs: number
  ): Promise<boolean> {
    const now = Date.now();
    const windowStart = now - windowMs;

    // Get existing calls for this key
    const existingCalls = this.calls.get(key) || [];

    // Filter out calls outside the window
    const recentCalls = existingCalls.filter(timestamp => timestamp > windowStart);

    // Check if limit exceeded
    if (recentCalls.length >= maxCalls) {
      console.warn(`[Rate Limiter] Limit exceeded for key: ${key} (${recentCalls.length}/${maxCalls} in ${windowMs}ms)`);
      return false;
    }

    // Add current call
    recentCalls.push(now);
    this.calls.set(key, recentCalls);

    // Periodic cleanup
    if (now - this.lastCleanup > this.cleanupIntervalMs) {
      this.cleanup(windowStart);
      this.lastCleanup = now;
    }

    return true;
  }

  /**
   * Get current call count for a key
   */
  async getCallCount(key: string, windowMs: number): Promise<number> {
    const now = Date.now();
    const windowStart = now - windowMs;
    const existingCalls = this.calls.get(key) || [];
    return existingCalls.filter(timestamp => timestamp > windowStart).length;
  }

  /**
   * Reset all rate limits (useful for testing)
   */
  reset(): void {
    this.calls.clear();
  }

  /**
   * Remove old entries to prevent memory leak
   */
  private cleanup(cutoff: number): void {
    let removed = 0;
    for (const [key, timestamps] of this.calls.entries()) {
      const recent = timestamps.filter(t => t > cutoff);
      if (recent.length === 0) {
        this.calls.delete(key);
        removed++;
      } else if (recent.length < timestamps.length) {
        this.calls.set(key, recent);
      }
    }
    if (removed > 0) {
      console.log(`[Rate Limiter] Cleaned up ${removed} expired keys`);
    }
  }
}

// Singleton instance
const rateLimiterInstance = new RateLimiter();

/**
 * Check global rate limit
 * Limit: 400 calls per minute (buffer under OpenAI Tier 1: 500 RPM)
 */
export async function checkGlobalRateLimit(): Promise<boolean> {
  return rateLimiterInstance.checkLimit(
    'global',
    400,
    60 * 1000 // 1 minute
  );
}

/**
 * Check per-organization rate limit
 * Limit: 100 calls per minute per org
 */
export async function checkOrgRateLimit(organizationId: string): Promise<boolean> {
  return rateLimiterInstance.checkLimit(
    `org:${organizationId}`,
    100,
    60 * 1000 // 1 minute
  );
}

/**
 * Check per-agent rate limit
 * Limit: 50 calls per minute per agent
 */
export async function checkAgentRateLimit(agentId: string): Promise<boolean> {
  return rateLimiterInstance.checkLimit(
    `agent:${agentId}`,
    50,
    60 * 1000 // 1 minute
  );
}

/**
 * Get current rate limit status for monitoring
 */
export async function getRateLimitStatus(key: string): Promise<{
  current: number;
  limit: number;
  window: string;
}> {
  const windowMs = 60 * 1000;
  const current = await rateLimiterInstance.getCallCount(key, windowMs);

  let limit = 400; // default global
  if (key.startsWith('org:')) limit = 100;
  if (key.startsWith('agent:')) limit = 50;

  return {
    current,
    limit,
    window: '1m'
  };
}

/**
 * Reset all rate limits (for testing only)
 */
export function resetRateLimits(): void {
  rateLimiterInstance.reset();
}

// Export instance for advanced use cases
export { rateLimiterInstance as rateLimiter };
