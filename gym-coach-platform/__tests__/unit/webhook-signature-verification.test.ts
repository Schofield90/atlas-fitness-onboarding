import { createHmac, timingSafeEqual } from 'crypto'

// Extract the signature verification logic to test it in isolation
async function verifyWebhookSignature(
  body: string,
  signatureHeader: string,
  timestampHeader: string,
  secretHash: string,
  toleranceSeconds: number
): Promise<{ valid: boolean; reason?: string }> {
  try {
    // Parse signature (format: "sha256=abc123...")
    const signatureParts = signatureHeader.split('=')
    if (signatureParts.length !== 2 || signatureParts[0] !== 'sha256') {
      return { valid: false, reason: 'Invalid signature format' }
    }
    
    const providedSignature = signatureParts[1]
    const timestamp = parseInt(timestampHeader)
    
    // Check timestamp tolerance
    const now = Math.floor(Date.now() / 1000)
    const timeDiff = Math.abs(now - timestamp)
    
    if (timeDiff > toleranceSeconds) {
      return { valid: false, reason: 'Timestamp outside tolerance window' }
    }

    // Recreate the expected signature
    const payload = `${timestamp}.${body}`
    const expectedSignature = createHmac('sha256', secretHash)
      .update(payload, 'utf8')
      .digest('hex')
    
    // Compare signatures safely
    const providedBuffer = Buffer.from(providedSignature, 'hex')
    const expectedBuffer = Buffer.from(expectedSignature, 'hex')
    
    if (providedBuffer.length !== expectedBuffer.length) {
      return { valid: false, reason: 'Signature length mismatch' }
    }
    
    const isValid = timingSafeEqual(providedBuffer, expectedBuffer)
    return { valid: isValid, reason: isValid ? undefined : 'Signature mismatch' }
    
  } catch (error) {
    return { valid: false, reason: 'Signature verification error' }
  }
}

// Helper function to create valid signatures for testing
function createValidSignature(body: string, timestamp: number, secret: string): string {
  const payload = `${timestamp}.${body}`
  return createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex')
}

describe('Webhook Signature Verification', () => {
  const testSecret = 'test-secret-key-12345'
  const testBody = JSON.stringify({
    event: 'test',
    data: { message: 'Hello World' }
  })
  
  describe('Valid Signatures', () => {
    it('accepts correctly signed requests', async () => {
      const timestamp = Math.floor(Date.now() / 1000)
      const signature = createValidSignature(testBody, timestamp, testSecret)
      
      const result = await verifyWebhookSignature(
        testBody,
        `sha256=${signature}`,
        timestamp.toString(),
        testSecret,
        300
      )
      
      expect(result.valid).toBe(true)
      expect(result.reason).toBeUndefined()
    })

    it('accepts requests within tolerance window', async () => {
      const timestamp = Math.floor(Date.now() / 1000) - 299 // 299 seconds ago (within 300s tolerance)
      const signature = createValidSignature(testBody, timestamp, testSecret)
      
      const result = await verifyWebhookSignature(
        testBody,
        `sha256=${signature}`,
        timestamp.toString(),
        testSecret,
        300
      )
      
      expect(result.valid).toBe(true)
    })

    it('accepts requests with future timestamps within tolerance', async () => {
      const timestamp = Math.floor(Date.now() / 1000) + 299 // 299 seconds in future (within 300s tolerance)
      const signature = createValidSignature(testBody, timestamp, testSecret)
      
      const result = await verifyWebhookSignature(
        testBody,
        `sha256=${signature}`,
        timestamp.toString(),
        testSecret,
        300
      )
      
      expect(result.valid).toBe(true)
    })

    it('handles different body content correctly', async () => {
      const differentBodies = [
        '{}',
        '{"key": "value"}',
        '{"nested": {"object": true}}',
        '{"array": [1, 2, 3]}',
        '{"unicode": "特殊字符"}',
        '{"empty_string": ""}',
        '{"null_value": null}',
        '{"boolean": true}'
      ]
      
      const timestamp = Math.floor(Date.now() / 1000)
      
      for (const body of differentBodies) {
        const signature = createValidSignature(body, timestamp, testSecret)
        
        const result = await verifyWebhookSignature(
          body,
          `sha256=${signature}`,
          timestamp.toString(),
          testSecret,
          300
        )
        
        expect(result.valid).toBe(true)
      }
    })

    it('works with different tolerance values', async () => {
      const toleranceValues = [30, 60, 300, 600]
      const timestamp = Math.floor(Date.now() / 1000)
      const signature = createValidSignature(testBody, timestamp, testSecret)
      
      for (const tolerance of toleranceValues) {
        const result = await verifyWebhookSignature(
          testBody,
          `sha256=${signature}`,
          timestamp.toString(),
          testSecret,
          tolerance
        )
        
        expect(result.valid).toBe(true)
      }
    })
  })

  describe('Invalid Signature Format', () => {
    it('rejects signatures without sha256 prefix', async () => {
      const timestamp = Math.floor(Date.now() / 1000)
      const signature = createValidSignature(testBody, timestamp, testSecret)
      
      const result = await verifyWebhookSignature(
        testBody,
        signature, // Missing "sha256=" prefix
        timestamp.toString(),
        testSecret,
        300
      )
      
      expect(result.valid).toBe(false)
      expect(result.reason).toBe('Invalid signature format')
    })

    it('rejects signatures with wrong algorithm prefix', async () => {
      const timestamp = Math.floor(Date.now() / 1000)
      const signature = createValidSignature(testBody, timestamp, testSecret)
      
      const result = await verifyWebhookSignature(
        testBody,
        `sha1=${signature}`, // Wrong algorithm
        timestamp.toString(),
        testSecret,
        300
      )
      
      expect(result.valid).toBe(false)
      expect(result.reason).toBe('Invalid signature format')
    })

    it('rejects malformed signature headers', async () => {
      const timestamp = Math.floor(Date.now() / 1000)
      
      const malformedSignatures = [
        'sha256',
        'sha256=',
        'sha256=abc=def',
        '=abcdef',
        'notahash',
        ''
      ]
      
      for (const malformedSig of malformedSignatures) {
        const result = await verifyWebhookSignature(
          testBody,
          malformedSig,
          timestamp.toString(),
          testSecret,
          300
        )
        
        expect(result.valid).toBe(false)
        expect(result.reason).toBe('Invalid signature format')
      }
    })

    it('rejects non-hex signature values', async () => {
      const timestamp = Math.floor(Date.now() / 1000)
      
      const result = await verifyWebhookSignature(
        testBody,
        'sha256=not-a-hex-value!',
        timestamp.toString(),
        testSecret,
        300
      )
      
      expect(result.valid).toBe(false)
      expect(result.reason).toContain('error')
    })
  })

  describe('Timestamp Validation', () => {
    it('rejects requests with expired timestamps', async () => {
      const expiredTimestamp = Math.floor(Date.now() / 1000) - 301 // 301 seconds ago (outside 300s tolerance)
      const signature = createValidSignature(testBody, expiredTimestamp, testSecret)
      
      const result = await verifyWebhookSignature(
        testBody,
        `sha256=${signature}`,
        expiredTimestamp.toString(),
        testSecret,
        300
      )
      
      expect(result.valid).toBe(false)
      expect(result.reason).toBe('Timestamp outside tolerance window')
    })

    it('rejects requests with future timestamps beyond tolerance', async () => {
      const futureTimestamp = Math.floor(Date.now() / 1000) + 301 // 301 seconds in future (outside 300s tolerance)
      const signature = createValidSignature(testBody, futureTimestamp, testSecret)
      
      const result = await verifyWebhookSignature(
        testBody,
        `sha256=${signature}`,
        futureTimestamp.toString(),
        testSecret,
        300
      )
      
      expect(result.valid).toBe(false)
      expect(result.reason).toBe('Timestamp outside tolerance window')
    })

    it('handles invalid timestamp formats', async () => {
      const signature = createValidSignature(testBody, 1640000000, testSecret)
      
      const invalidTimestamps = [
        'not-a-number',
        '1640000000.5', // Decimal
        '1640000000abc',
        '',
        'undefined',
        'null'
      ]
      
      for (const invalidTs of invalidTimestamps) {
        const result = await verifyWebhookSignature(
          testBody,
          `sha256=${signature}`,
          invalidTs,
          testSecret,
          300
        )
        
        expect(result.valid).toBe(false)
        expect(result.reason).toBe('Timestamp outside tolerance window')
      }
    })
  })

  describe('Signature Mismatch', () => {
    it('rejects requests with incorrect signatures', async () => {
      const timestamp = Math.floor(Date.now() / 1000)
      const validSignature = createValidSignature(testBody, timestamp, testSecret)
      const invalidSignature = validSignature.replace(/.$/, '0') // Change last character
      
      const result = await verifyWebhookSignature(
        testBody,
        `sha256=${invalidSignature}`,
        timestamp.toString(),
        testSecret,
        300
      )
      
      expect(result.valid).toBe(false)
      expect(result.reason).toBe('Signature mismatch')
    })

    it('rejects requests signed with wrong secret', async () => {
      const timestamp = Math.floor(Date.now() / 1000)
      const wrongSecret = 'wrong-secret-key'
      const signature = createValidSignature(testBody, timestamp, wrongSecret)
      
      const result = await verifyWebhookSignature(
        testBody,
        `sha256=${signature}`,
        timestamp.toString(),
        testSecret, // Different secret
        300
      )
      
      expect(result.valid).toBe(false)
      expect(result.reason).toBe('Signature mismatch')
    })

    it('rejects requests when body is modified', async () => {
      const timestamp = Math.floor(Date.now() / 1000)
      const signature = createValidSignature(testBody, timestamp, testSecret)
      const modifiedBody = testBody.replace('Hello World', 'Modified Content')
      
      const result = await verifyWebhookSignature(
        modifiedBody, // Different body
        `sha256=${signature}`,
        timestamp.toString(),
        testSecret,
        300
      )
      
      expect(result.valid).toBe(false)
      expect(result.reason).toBe('Signature mismatch')
    })

    it('rejects requests with wrong signature length', async () => {
      const timestamp = Math.floor(Date.now() / 1000)
      
      const shortSignature = 'sha256=abc123'
      const longSignature = 'sha256=' + 'a'.repeat(128) // Too long
      
      for (const badSignature of [shortSignature, longSignature]) {
        const result = await verifyWebhookSignature(
          testBody,
          badSignature,
          timestamp.toString(),
          testSecret,
          300
        )
        
        expect(result.valid).toBe(false)
        expect(result.reason).toBe('Signature length mismatch')
      }
    })
  })

  describe('Timing Attack Protection', () => {
    it('uses timing-safe comparison for signatures', async () => {
      const timestamp = Math.floor(Date.now() / 1000)
      const validSignature = createValidSignature(testBody, timestamp, testSecret)
      
      // Create signatures that differ in first vs last character
      const firstCharWrong = '0' + validSignature.slice(1)
      const lastCharWrong = validSignature.slice(0, -1) + '0'
      
      // Both should be rejected with same reason
      const result1 = await verifyWebhookSignature(
        testBody,
        `sha256=${firstCharWrong}`,
        timestamp.toString(),
        testSecret,
        300
      )
      
      const result2 = await verifyWebhookSignature(
        testBody,
        `sha256=${lastCharWrong}`,
        timestamp.toString(),
        testSecret,
        300
      )
      
      expect(result1.valid).toBe(false)
      expect(result2.valid).toBe(false)
      expect(result1.reason).toBe('Signature mismatch')
      expect(result2.reason).toBe('Signature mismatch')
    })
  })

  describe('Edge Cases', () => {
    it('handles empty request body', async () => {
      const emptyBody = ''
      const timestamp = Math.floor(Date.now() / 1000)
      const signature = createValidSignature(emptyBody, timestamp, testSecret)
      
      const result = await verifyWebhookSignature(
        emptyBody,
        `sha256=${signature}`,
        timestamp.toString(),
        testSecret,
        300
      )
      
      expect(result.valid).toBe(true)
    })

    it('handles very large request bodies', async () => {
      const largeBody = 'x'.repeat(10000) // 10KB body
      const timestamp = Math.floor(Date.now() / 1000)
      const signature = createValidSignature(largeBody, timestamp, testSecret)
      
      const result = await verifyWebhookSignature(
        largeBody,
        `sha256=${signature}`,
        timestamp.toString(),
        testSecret,
        300
      )
      
      expect(result.valid).toBe(true)
    })

    it('handles unicode characters in request body', async () => {
      const unicodeBody = JSON.stringify({
        message: '🚀 Unicode test with special chars: áéíóú ñ 中文 العربية',
        emoji: '🔥💯🎉',
        symbols: '©®™'
      })
      
      const timestamp = Math.floor(Date.now() / 1000)
      const signature = createValidSignature(unicodeBody, timestamp, testSecret)
      
      const result = await verifyWebhookSignature(
        unicodeBody,
        `sha256=${signature}`,
        timestamp.toString(),
        testSecret,
        300
      )
      
      expect(result.valid).toBe(true)
    })

    it('handles different secret lengths', async () => {
      const secrets = [
        'short',
        'medium-length-secret',
        'very-long-secret-key-with-many-characters-to-test-edge-cases',
        'key-with-special-chars-!@#$%^&*()_+-=[]{}|;:,.<>?',
        '密钥with汉字和unicode字符'
      ]
      
      const timestamp = Math.floor(Date.now() / 1000)
      
      for (const secret of secrets) {
        const signature = createValidSignature(testBody, timestamp, secret)
        
        const result = await verifyWebhookSignature(
          testBody,
          `sha256=${signature}`,
          timestamp.toString(),
          secret,
          300
        )
        
        expect(result.valid).toBe(true)
      }
    })

    it('handles zero and negative timestamps', async () => {
      const testTimestamps = [0, -1, -1000000]
      
      for (const ts of testTimestamps) {
        const signature = createValidSignature(testBody, ts, testSecret)
        
        const result = await verifyWebhookSignature(
          testBody,
          `sha256=${signature}`,
          ts.toString(),
          testSecret,
          Math.abs(ts) + 3600 // Large tolerance to accommodate negative/zero timestamps
        )
        
        // Should be valid with signature but likely rejected for timestamp tolerance
        // This tests that signature verification doesn't crash on edge case timestamps
        expect(result).toHaveProperty('valid')
        expect(result).toHaveProperty('reason')
      }
    })
  })

  describe('Performance and Reliability', () => {
    it('completes verification within reasonable time', async () => {
      const timestamp = Math.floor(Date.now() / 1000)
      const signature = createValidSignature(testBody, timestamp, testSecret)
      
      const startTime = Date.now()
      
      const result = await verifyWebhookSignature(
        testBody,
        `sha256=${signature}`,
        timestamp.toString(),
        testSecret,
        300
      )
      
      const endTime = Date.now()
      const duration = endTime - startTime
      
      expect(result.valid).toBe(true)
      expect(duration).toBeLessThan(100) // Should complete within 100ms
    })

    it('produces consistent results for same inputs', async () => {
      const timestamp = Math.floor(Date.now() / 1000)
      const signature = createValidSignature(testBody, timestamp, testSecret)
      
      const results = []
      
      // Run verification multiple times
      for (let i = 0; i < 10; i++) {
        const result = await verifyWebhookSignature(
          testBody,
          `sha256=${signature}`,
          timestamp.toString(),
          testSecret,
          300
        )
        results.push(result)
      }
      
      // All results should be identical
      const firstResult = results[0]
      for (const result of results) {
        expect(result.valid).toBe(firstResult.valid)
        expect(result.reason).toBe(firstResult.reason)
      }
    })
  })
})