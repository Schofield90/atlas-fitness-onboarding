// Simple in-memory rate limiter for webhook endpoints
// In production, you would use Redis or a distributed rate limiting solution

interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number
}

class InMemoryRateLimit {
  private requests: Map<string, { count: number; resetTime: number }> = new Map()

  async limit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
    const now = Date.now()
    const existing = this.requests.get(key)
    
    if (!existing || now > existing.resetTime) {
      // New window or expired
      this.requests.set(key, {
        count: 1,
        resetTime: now + windowMs
      })
      
      return {
        success: true,
        limit,
        remaining: limit - 1,
        reset: now + windowMs
      }
    }
    
    if (existing.count >= limit) {
      // Rate limit exceeded
      return {
        success: false,
        limit,
        remaining: 0,
        reset: existing.resetTime
      }
    }
    
    // Increment counter
    existing.count++
    this.requests.set(key, existing)
    
    return {
      success: true,
      limit,
      remaining: limit - existing.count,
      reset: existing.resetTime
    }
  }

  // Cleanup expired entries periodically
  cleanup() {
    const now = Date.now()
    for (const [key, value] of this.requests.entries()) {
      if (now > value.resetTime) {
        this.requests.delete(key)
      }
    }
  }
}

export const ratelimit = new InMemoryRateLimit()

// Run cleanup every minute
setInterval(() => ratelimit.cleanup(), 60 * 1000)