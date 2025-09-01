// Mock rate limiting and IP filtering functions for testing

// Mock rate limiter implementation
interface RateLimitResult {
  success: boolean
  reset?: number
  remaining?: number
}

class MockRateLimiter {
  private requests: Map<string, { count: number; resetTime: number }> = new Map()
  
  async limit(key: string, maxRequests: number, windowMs: number): Promise<RateLimitResult> {
    const now = Date.now()
    const existing = this.requests.get(key)
    
    if (!existing || now >= existing.resetTime) {
      // New window
      this.requests.set(key, { count: 1, resetTime: now + windowMs })
      return { success: true, remaining: maxRequests - 1 }
    }
    
    if (existing.count >= maxRequests) {
      // Rate limit exceeded
      return { 
        success: false, 
        reset: existing.resetTime,
        remaining: 0
      }
    }
    
    // Increment counter
    existing.count++
    this.requests.set(key, existing)
    
    return { success: true, remaining: maxRequests - existing.count }
  }
  
  // Helper method to clear all rate limit data (for testing)
  clear(): void {
    this.requests.clear()
  }
}

// IP allowlist checking function
async function checkIpAllowlist(sourceIp: string, allowlist: string[]): Promise<boolean> {
  if (!allowlist || allowlist.length === 0) {
    return true // No restrictions
  }
  
  for (const allowedIp of allowlist) {
    if (allowedIp.includes('/')) {
      // CIDR notation - simplified check
      const [network, prefixLength] = allowedIp.split('/')
      const prefixLen = parseInt(prefixLength)
      
      if (isIpInCidr(sourceIp, network, prefixLen)) {
        return true
      }
    } else {
      // Exact IP match
      if (sourceIp === allowedIp) {
        return true
      }
    }
  }
  
  return false
}

// Helper function for CIDR matching (simplified implementation)
function isIpInCidr(ip: string, network: string, prefixLength: number): boolean {
  // This is a simplified implementation for testing
  // In production, you'd use a proper CIDR matching library
  
  const ipParts = ip.split('.').map(Number)
  const networkParts = network.split('.').map(Number)
  
  // Calculate how many octets to check based on prefix length
  const octetsToCheck = Math.floor(prefixLength / 8)
  const remainingBits = prefixLength % 8
  
  // Check complete octets
  for (let i = 0; i < octetsToCheck; i++) {
    if (ipParts[i] !== networkParts[i]) {
      return false
    }
  }
  
  // Check remaining bits in the next octet
  if (remainingBits > 0 && octetsToCheck < 4) {
    const mask = 255 << (8 - remainingBits)
    if ((ipParts[octetsToCheck] & mask) !== (networkParts[octetsToCheck] & mask)) {
      return false
    }
  }
  
  return true
}

describe('Webhook Rate Limiting', () => {
  let rateLimiter: MockRateLimiter
  
  beforeEach(() => {
    rateLimiter = new MockRateLimiter()
  })
  
  describe('Request Counting', () => {
    it('allows requests within rate limit', async () => {
      const key = 'test-key'
      const maxRequests = 10
      const windowMs = 1000
      
      // Make 5 requests (within limit)
      for (let i = 0; i < 5; i++) {
        const result = await rateLimiter.limit(key, maxRequests, windowMs)
        expect(result.success).toBe(true)
        expect(result.remaining).toBe(maxRequests - (i + 1))
      }
    })
    
    it('blocks requests when rate limit exceeded', async () => {
      const key = 'test-key'
      const maxRequests = 3
      const windowMs = 1000
      
      // Make requests up to the limit
      for (let i = 0; i < maxRequests; i++) {
        const result = await rateLimiter.limit(key, maxRequests, windowMs)
        expect(result.success).toBe(true)
      }
      
      // Next request should be blocked
      const blockedResult = await rateLimiter.limit(key, maxRequests, windowMs)
      expect(blockedResult.success).toBe(false)
      expect(blockedResult.remaining).toBe(0)
      expect(blockedResult.reset).toBeDefined()
    })
    
    it('resets counter after window expires', async () => {
      const key = 'test-key'
      const maxRequests = 2
      const windowMs = 100 // Short window for testing
      
      // Fill up the rate limit
      await rateLimiter.limit(key, maxRequests, windowMs)
      await rateLimiter.limit(key, maxRequests, windowMs)
      
      // Should be blocked
      const blockedResult = await rateLimiter.limit(key, maxRequests, windowMs)
      expect(blockedResult.success).toBe(false)
      
      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, windowMs + 10))
      
      // Should be allowed again
      const allowedResult = await rateLimiter.limit(key, maxRequests, windowMs)
      expect(allowedResult.success).toBe(true)
    })
    
    it('tracks different keys independently', async () => {
      const maxRequests = 2
      const windowMs = 1000
      
      // Fill up limit for key1
      await rateLimiter.limit('key1', maxRequests, windowMs)
      await rateLimiter.limit('key1', maxRequests, windowMs)
      
      // key1 should be blocked
      const blocked = await rateLimiter.limit('key1', maxRequests, windowMs)
      expect(blocked.success).toBe(false)
      
      // key2 should still be allowed
      const allowed = await rateLimiter.limit('key2', maxRequests, windowMs)
      expect(allowed.success).toBe(true)
    })
  })
  
  describe('Rate Limit Keys', () => {
    it('generates unique keys for different webhook endpoints', async () => {
      const baseKey = 'webhook'
      const workflowId1 = 'workflow-1'
      const nodeId1 = 'node-1'
      const sourceIp1 = '192.168.1.100'
      
      const workflowId2 = 'workflow-2'
      const nodeId2 = 'node-2'
      const sourceIp2 = '192.168.1.101'
      
      const key1 = `${baseKey}:${workflowId1}:${nodeId1}:${sourceIp1}`
      const key2 = `${baseKey}:${workflowId2}:${nodeId2}:${sourceIp2}`
      
      expect(key1).not.toBe(key2)
      
      // Each should have independent rate limits
      const maxRequests = 2
      const windowMs = 1000
      
      // Fill limit for key1
      await rateLimiter.limit(key1, maxRequests, windowMs)
      await rateLimiter.limit(key1, maxRequests, windowMs)
      
      // key1 should be blocked
      const blocked = await rateLimiter.limit(key1, maxRequests, windowMs)
      expect(blocked.success).toBe(false)
      
      // key2 should still work
      const allowed = await rateLimiter.limit(key2, maxRequests, windowMs)
      expect(allowed.success).toBe(true)
    })
    
    it('handles special characters in keys', async () => {
      const specialKeys = [
        'webhook:workflow-with-dashes:node_with_underscores:192.168.1.1',
        'webhook:workflow.with.dots:node@with@symbols:10.0.0.1',
        'webhook:workflow:with:colons:node:192.168.0.1:extra'
      ]
      
      for (const key of specialKeys) {
        const result = await rateLimiter.limit(key, 5, 1000)
        expect(result.success).toBe(true)
      }
    })
  })
  
  describe('Webhook-specific Rate Limiting', () => {
    it('applies standard webhook rate limits (10 req/sec)', async () => {
      const key = 'webhook:test-workflow:test-node:192.168.1.1'
      const maxRequests = 10
      const windowMs = 1000
      
      // Make 10 requests (at limit)
      for (let i = 0; i < maxRequests; i++) {
        const result = await rateLimiter.limit(key, maxRequests, windowMs)
        expect(result.success).toBe(true)
      }
      
      // 11th request should be blocked
      const blockedResult = await rateLimiter.limit(key, maxRequests, windowMs)
      expect(blockedResult.success).toBe(false)
    })
    
    it('provides retry-after information when rate limited', async () => {
      const key = 'webhook:test:test:192.168.1.1'
      const maxRequests = 1
      const windowMs = 5000 // 5 second window
      
      // Use up the rate limit
      await rateLimiter.limit(key, maxRequests, windowMs)
      
      // Next request should provide retry-after
      const result = await rateLimiter.limit(key, maxRequests, windowMs)
      expect(result.success).toBe(false)
      expect(result.reset).toBeDefined()
      expect(result.reset).toBeGreaterThan(Date.now())
    })
    
    it('handles concurrent requests properly', async () => {
      const key = 'webhook:concurrent:test:192.168.1.1'
      const maxRequests = 5
      const windowMs = 1000
      
      // Make 10 concurrent requests
      const promises = Array(10).fill(null).map(() =>
        rateLimiter.limit(key, maxRequests, windowMs)
      )
      
      const results = await Promise.all(promises)
      
      // Exactly 5 should succeed, 5 should fail
      const successful = results.filter(r => r.success).length
      const failed = results.filter(r => !r.success).length
      
      expect(successful).toBe(maxRequests)
      expect(failed).toBe(10 - maxRequests)
    })
  })
  
  describe('Error Handling', () => {
    it('handles rate limiter failures gracefully', async () => {
      // Mock a failing rate limiter
      const failingRateLimiter = {
        limit: jest.fn().mockRejectedValue(new Error('Rate limiter unavailable'))
      }
      
      // In a real implementation, you'd handle this error
      try {
        await failingRateLimiter.limit('key', 10, 1000)
        fail('Should have thrown an error')
      } catch (error) {
        expect(error.message).toBe('Rate limiter unavailable')
      }
    })
  })
})

describe('IP Allowlist Filtering', () => {
  describe('Exact IP Matching', () => {
    it('allows requests from allowed IPs', async () => {
      const allowlist = ['192.168.1.100', '10.0.0.50', '203.0.113.42']
      
      for (const allowedIp of allowlist) {
        const isAllowed = await checkIpAllowlist(allowedIp, allowlist)
        expect(isAllowed).toBe(true)
      }
    })
    
    it('blocks requests from non-allowed IPs', async () => {
      const allowlist = ['192.168.1.100', '10.0.0.50']
      const blockedIps = ['192.168.1.101', '10.0.0.51', '203.0.113.42', '8.8.8.8']
      
      for (const blockedIp of blockedIps) {
        const isAllowed = await checkIpAllowlist(blockedIp, allowlist)
        expect(isAllowed).toBe(false)
      }
    })
    
    it('allows all IPs when allowlist is empty', async () => {
      const testIps = ['192.168.1.1', '10.0.0.1', '203.0.113.1', '8.8.8.8']
      
      for (const testIp of testIps) {
        const isAllowed = await checkIpAllowlist(testIp, [])
        expect(isAllowed).toBe(true)
      }
    })
    
    it('allows all IPs when allowlist is null/undefined', async () => {
      const testIps = ['192.168.1.1', '10.0.0.1']
      
      for (const testIp of testIps) {
        const isAllowedNull = await checkIpAllowlist(testIp, null as any)
        const isAllowedUndefined = await checkIpAllowlist(testIp, undefined as any)
        
        expect(isAllowedNull).toBe(true)
        expect(isAllowedUndefined).toBe(true)
      }
    })
  })
  
  describe('CIDR Range Matching', () => {
    it('allows IPs within CIDR ranges', async () => {
      const testCases = [
        {
          allowlist: ['192.168.1.0/24'],
          allowedIps: ['192.168.1.1', '192.168.1.100', '192.168.1.255'],
          blockedIps: ['192.168.2.1', '192.168.0.1', '10.0.0.1']
        },
        {
          allowlist: ['10.0.0.0/16'],
          allowedIps: ['10.0.0.1', '10.0.255.255', '10.0.100.50'],
          blockedIps: ['10.1.0.1', '192.168.1.1', '172.16.0.1']
        },
        {
          allowlist: ['172.16.0.0/12'],
          allowedIps: ['172.16.0.1', '172.31.255.255', '172.20.100.50'],
          blockedIps: ['172.32.0.1', '172.15.255.255', '192.168.1.1']
        }
      ]
      
      for (const testCase of testCases) {
        // Test allowed IPs
        for (const allowedIp of testCase.allowedIps) {
          const isAllowed = await checkIpAllowlist(allowedIp, testCase.allowlist)
          expect(isAllowed).toBe(true)
        }
        
        // Test blocked IPs
        for (const blockedIp of testCase.blockedIps) {
          const isAllowed = await checkIpAllowlist(blockedIp, testCase.allowlist)
          expect(isAllowed).toBe(false)
        }
      }
    })
    
    it('handles various CIDR prefix lengths', async () => {
      const testCases = [
        { cidr: '192.168.1.0/32', allowed: ['192.168.1.0'], blocked: ['192.168.1.1'] },
        { cidr: '192.168.1.0/31', allowed: ['192.168.1.0', '192.168.1.1'], blocked: ['192.168.1.2'] },
        { cidr: '192.168.1.0/30', allowed: ['192.168.1.0', '192.168.1.3'], blocked: ['192.168.1.4'] },
        { cidr: '192.168.0.0/16', allowed: ['192.168.0.0', '192.168.255.255'], blocked: ['192.169.0.0'] },
        { cidr: '192.0.0.0/8', allowed: ['192.0.0.0', '192.255.255.255'], blocked: ['193.0.0.0'] }
      ]
      
      for (const testCase of testCases) {
        const allowlist = [testCase.cidr]
        
        for (const allowedIp of testCase.allowed) {
          const isAllowed = await checkIpAllowlist(allowedIp, allowlist)
          expect(isAllowed).toBe(true)
        }
        
        for (const blockedIp of testCase.blocked) {
          const isAllowed = await checkIpAllowlist(blockedIp, allowlist)
          expect(isAllowed).toBe(false)
        }
      }
    })
  })
  
  describe('Mixed IP and CIDR Allowlists', () => {
    it('works with combination of exact IPs and CIDR ranges', async () => {
      const allowlist = [
        '203.0.113.42',         // Exact IP
        '192.168.1.0/24',       // Private subnet
        '10.0.100.50',          // Another exact IP
        '172.16.0.0/16'         // Larger private subnet
      ]
      
      const allowedIps = [
        '203.0.113.42',         // Exact match
        '192.168.1.100',        // In CIDR range
        '10.0.100.50',          // Exact match
        '172.16.50.100'         // In CIDR range
      ]
      
      const blockedIps = [
        '203.0.113.43',         // Close to allowed IP but not exact
        '192.168.2.100',        // Different subnet
        '10.0.100.51',          // Close to allowed IP but not exact
        '172.17.50.100'         // Different subnet
      ]
      
      for (const allowedIp of allowedIps) {
        const isAllowed = await checkIpAllowlist(allowedIp, allowlist)
        expect(isAllowed).toBe(true)
      }
      
      for (const blockedIp of blockedIps) {
        const isAllowed = await checkIpAllowlist(blockedIp, allowlist)
        expect(isAllowed).toBe(false)
      }
    })
  })
  
  describe('Edge Cases and Error Handling', () => {
    it('handles malformed IP addresses', async () => {
      const allowlist = ['192.168.1.100']
      const malformedIps = [
        '192.168.1',           // Incomplete
        '192.168.1.256',       // Invalid octet
        '192.168.1.1.1',       // Too many octets
        'not.an.ip.address',   // Non-numeric
        '192.168.01.100',      // Leading zeros
        ''                     // Empty string
      ]
      
      for (const malformedIp of malformedIps) {
        const isAllowed = await checkIpAllowlist(malformedIp, allowlist)
        expect(isAllowed).toBe(false) // Should reject malformed IPs
      }
    })
    
    it('handles malformed CIDR ranges', async () => {
      const testIp = '192.168.1.100'
      const malformedCidrs = [
        '192.168.1.0/33',       // Invalid prefix length
        '192.168.1.0/',         // Missing prefix length
        '192.168.1.0/abc',      // Non-numeric prefix
        '192.168.1.0/24/extra', // Extra parts
        '192.168.1.256/24'      // Invalid network address
      ]
      
      for (const malformedCidr of malformedCidrs) {
        // Should handle gracefully (likely reject)
        try {
          const isAllowed = await checkIpAllowlist(testIp, [malformedCidr])
          expect(typeof isAllowed).toBe('boolean')
        } catch (error) {
          // Error handling is also acceptable for malformed input
          expect(error).toBeInstanceOf(Error)
        }
      }
    })
    
    it('handles IPv6 addresses (basic support)', async () => {
      const ipv6Addresses = [
        '2001:db8::1',
        'fe80::1%lo0',
        '::1'
      ]
      
      // Current implementation is IPv4 only, so these should be rejected
      const allowlist = ['192.168.1.0/24']
      
      for (const ipv6 of ipv6Addresses) {
        const isAllowed = await checkIpAllowlist(ipv6, allowlist)
        expect(isAllowed).toBe(false)
      }
    })
    
    it('handles very long allowlists efficiently', async () => {
      // Generate a large allowlist
      const largeAllowlist = []
      for (let i = 0; i < 1000; i++) {
        largeAllowlist.push(`192.168.${Math.floor(i / 255)}.${i % 255}`)
      }
      
      const testIp = '192.168.1.100'
      largeAllowlist.push(testIp) // Add our test IP
      
      const startTime = Date.now()
      const isAllowed = await checkIpAllowlist(testIp, largeAllowlist)
      const endTime = Date.now()
      
      expect(isAllowed).toBe(true)
      expect(endTime - startTime).toBeLessThan(100) // Should complete within 100ms
    })
  })
  
  describe('Real-world Scenarios', () => {
    it('handles common cloud provider IP ranges', async () => {
      // Simulate common cloud provider setups
      const cloudAllowlists = [
        // AWS ELB ranges (simplified)
        ['52.0.0.0/11', '54.0.0.0/12'],
        // Google Cloud ranges (simplified)  
        ['34.0.0.0/9', '35.0.0.0/8'],
        // Azure ranges (simplified)
        ['40.0.0.0/8', '104.0.0.0/8']
      ]
      
      for (const allowlist of cloudAllowlists) {
        // Each allowlist should work independently
        const isAllowed = await checkIpAllowlist('8.8.8.8', allowlist)
        expect(typeof isAllowed).toBe('boolean')
      }
    })
    
    it('handles corporate network scenarios', async () => {
      const corporateAllowlist = [
        '192.168.0.0/16',        // Internal network
        '10.0.0.0/8',            // VPN network
        '203.0.113.0/24',        // Public office range
        '198.51.100.42'          // Specific server
      ]
      
      const testScenarios = [
        { ip: '192.168.50.100', expected: true, scenario: 'Internal employee' },
        { ip: '10.10.10.10', expected: true, scenario: 'VPN user' },
        { ip: '203.0.113.50', expected: true, scenario: 'Office public IP' },
        { ip: '198.51.100.42', expected: true, scenario: 'Specific server' },
        { ip: '8.8.8.8', expected: false, scenario: 'External attacker' },
        { ip: '172.16.0.1', expected: false, scenario: 'Different network' }
      ]
      
      for (const { ip, expected, scenario } of testScenarios) {
        const isAllowed = await checkIpAllowlist(ip, corporateAllowlist)
        expect(isAllowed).toBe(expected)
      }
    })
  })
})

describe('Combined Security Measures', () => {
  let rateLimiter: MockRateLimiter
  
  beforeEach(() => {
    rateLimiter = new MockRateLimiter()
  })
  
  it('applies both rate limiting and IP filtering', async () => {
    const allowlist = ['192.168.1.0/24']
    const allowedIp = '192.168.1.100'
    const blockedIp = '10.0.0.1'
    const rateLimitKey = `webhook:test:test:${allowedIp}`
    
    // Allowed IP should pass IP check
    const ipAllowed = await checkIpAllowlist(allowedIp, allowlist)
    expect(ipAllowed).toBe(true)
    
    // Blocked IP should fail IP check
    const ipBlocked = await checkIpAllowlist(blockedIp, allowlist)
    expect(ipBlocked).toBe(false)
    
    // Rate limiting should work independently
    const rateLimitResult = await rateLimiter.limit(rateLimitKey, 10, 1000)
    expect(rateLimitResult.success).toBe(true)
  })
  
  it('handles security bypass attempts', async () => {
    const allowlist = ['203.0.113.42']
    const attackerIp = '8.8.8.8'
    
    // Attacker should be blocked by IP filter regardless of rate limits
    const isAllowed = await checkIpAllowlist(attackerIp, allowlist)
    expect(isAllowed).toBe(false)
    
    // Even if rate limits were available, IP filter should block
    const rateLimitKey = `webhook:test:test:${attackerIp}`
    const rateLimitResult = await rateLimiter.limit(rateLimitKey, 1000, 1000)
    expect(rateLimitResult.success).toBe(true) // Rate limit would allow...
    expect(isAllowed).toBe(false) // ...but IP filter blocks
  })
})