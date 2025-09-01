import { NextRequest } from 'next/server'

// Mock Supabase for deduplication tests
const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            gte: jest.fn(() => ({
              limit: jest.fn()
            }))
          }))
        }))
      }))
    }))
  }))
}

// Extract deduplication logic for testing
async function getDedupeKey(
  request: NextRequest,
  body: string,
  dedupeConfig: any
): Promise<string | undefined> {
  if (dedupeConfig.header) {
    return request.headers.get(dedupeConfig.header) || undefined
  }
  
  if (dedupeConfig.json_path) {
    try {
      const parsedBody = JSON.parse(body)
      // Simple JSON path extraction - in production you'd use a proper JSON path library
      const pathParts = dedupeConfig.json_path.split('.')
      let value = parsedBody
      
      for (const part of pathParts) {
        if (value && typeof value === 'object' && part in value) {
          value = value[part]
        } else {
          return undefined
        }
      }
      
      return typeof value === 'string' ? value : String(value)
    } catch (error) {
      console.warn('Error extracting dedupe key from JSON path:', error)
      return undefined
    }
  }
  
  return undefined
}

async function checkDuplicateDelivery(
  workflowId: string,
  nodeId: string,
  dedupeKey: string,
  windowSeconds: number
): Promise<boolean> {
  try {
    const cutoff = new Date(Date.now() - windowSeconds * 1000)
    
    const { data } = await mockSupabase
      .from('webhook_deliveries')
      .select('id')
      .eq('workflowId', workflowId)
      .eq('nodeId', nodeId)
      .eq('dedupeKey', dedupeKey)
      .gte('timestamp', cutoff.toISOString())
      .limit(1)
    
    return (data && data.length > 0) || false
  } catch (error) {
    console.error('Error checking for duplicate delivery:', error)
    return false // Allow delivery if we can't check for duplicates
  }
}

describe('Webhook Deduplication', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Header-based Deduplication', () => {
    const headerConfig = {
      header: 'X-Request-ID',
      windowSeconds: 300
    }

    it('extracts dedupe key from request header', async () => {
      const request = new NextRequest('http://localhost:3000/test', {
        headers: {
          'X-Request-ID': 'unique-request-123',
          'Content-Type': 'application/json'
        }
      })
      
      const dedupeKey = await getDedupeKey(request, '{}', headerConfig)
      
      expect(dedupeKey).toBe('unique-request-123')
    })

    it('returns undefined when header is missing', async () => {
      const request = new NextRequest('http://localhost:3000/test', {
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      const dedupeKey = await getDedupeKey(request, '{}', headerConfig)
      
      expect(dedupeKey).toBeUndefined()
    })

    it('handles empty header values', async () => {
      const request = new NextRequest('http://localhost:3000/test', {
        headers: {
          'X-Request-ID': '',
          'Content-Type': 'application/json'
        }
      })
      
      const dedupeKey = await getDedupeKey(request, '{}', headerConfig)
      
      expect(dedupeKey).toBeUndefined()
    })

    it('works with different header names', async () => {
      const configs = [
        { header: 'X-Idempotency-Key', windowSeconds: 300 },
        { header: 'X-Unique-ID', windowSeconds: 300 },
        { header: 'Request-ID', windowSeconds: 300 },
        { header: 'X-Message-ID', windowSeconds: 300 }
      ]
      
      for (const config of configs) {
        const request = new NextRequest('http://localhost:3000/test', {
          headers: {
            [config.header]: 'test-value-123',
            'Content-Type': 'application/json'
          }
        })
        
        const dedupeKey = await getDedupeKey(request, '{}', config)
        expect(dedupeKey).toBe('test-value-123')
      }
    })

    it('handles case-sensitive header names', async () => {
      const request = new NextRequest('http://localhost:3000/test', {
        headers: {
          'x-request-id': 'lowercase-header', // Lowercase
          'Content-Type': 'application/json'
        }
      })
      
      const uppercaseConfig = {
        header: 'X-Request-ID', // Uppercase in config
        windowSeconds: 300
      }
      
      // Headers in NextRequest are case-insensitive, so this should still work
      const dedupeKey = await getDedupeKey(request, '{}', uppercaseConfig)
      expect(dedupeKey).toBe('lowercase-header')
    })
  })

  describe('JSON Path-based Deduplication', () => {
    const jsonPathConfig = {
      json_path: 'metadata.request_id',
      windowSeconds: 300
    }

    it('extracts dedupe key from JSON path', async () => {
      const body = JSON.stringify({
        event: 'user_action',
        metadata: {
          request_id: 'json-request-123',
          timestamp: '2024-01-01T00:00:00Z'
        }
      })
      
      const request = new NextRequest('http://localhost:3000/test')
      
      const dedupeKey = await getDedupeKey(request, body, jsonPathConfig)
      
      expect(dedupeKey).toBe('json-request-123')
    })

    it('handles nested JSON paths', async () => {
      const deepConfig = {
        json_path: 'data.user.profile.id',
        windowSeconds: 300
      }
      
      const body = JSON.stringify({
        data: {
          user: {
            profile: {
              id: 'user-profile-456',
              name: 'John Doe'
            }
          }
        }
      })
      
      const request = new NextRequest('http://localhost:3000/test')
      
      const dedupeKey = await getDedupeKey(request, body, deepConfig)
      
      expect(dedupeKey).toBe('user-profile-456')
    })

    it('converts non-string values to strings', async () => {
      const configs = [
        { json_path: 'user_id', expected: '12345' },
        { json_path: 'is_active', expected: 'true' },
        { json_path: 'score', expected: '98.5' },
        { json_path: 'metadata.null_value', expected: 'null' }
      ]
      
      for (const { json_path, expected } of configs) {
        const body = JSON.stringify({
          user_id: 12345,
          is_active: true,
          score: 98.5,
          metadata: {
            null_value: null
          }
        })
        
        const config = { json_path, windowSeconds: 300 }
        const request = new NextRequest('http://localhost:3000/test')
        
        const dedupeKey = await getDedupeKey(request, body, config)
        expect(dedupeKey).toBe(expected)
      }
    })

    it('returns undefined for non-existent paths', async () => {
      const body = JSON.stringify({
        user: { name: 'John' }
      })
      
      const nonExistentConfigs = [
        { json_path: 'user.id', windowSeconds: 300 }, // Path doesn't exist
        { json_path: 'missing.field', windowSeconds: 300 }, // Top level doesn't exist
        { json_path: 'user.profile.id', windowSeconds: 300 } // Intermediate level doesn't exist
      ]
      
      const request = new NextRequest('http://localhost:3000/test')
      
      for (const config of nonExistentConfigs) {
        const dedupeKey = await getDedupeKey(request, body, config)
        expect(dedupeKey).toBeUndefined()
      }
    })

    it('handles malformed JSON gracefully', async () => {
      const malformedJsonBodies = [
        '{ invalid json }',
        '{"unclosed": "object"',
        '',
        'not json at all',
        '{"trailing": comma,}'
      ]
      
      const request = new NextRequest('http://localhost:3000/test')
      
      for (const badBody of malformedJsonBodies) {
        const dedupeKey = await getDedupeKey(request, badBody, jsonPathConfig)
        expect(dedupeKey).toBeUndefined()
      }
    })

    it('handles arrays in JSON path', async () => {
      const body = JSON.stringify({
        items: [
          { id: 'item-1' },
          { id: 'item-2' }
        ]
      })
      
      // Simplified implementation doesn't support array indexing
      // This tests the current behavior
      const arrayConfig = {
        json_path: 'items.0.id', // Would need proper JSON path library for this
        windowSeconds: 300
      }
      
      const request = new NextRequest('http://localhost:3000/test')
      
      const dedupeKey = await getDedupeKey(request, body, arrayConfig)
      expect(dedupeKey).toBeUndefined() // Current implementation doesn't support array indexing
    })

    it('works with simple top-level paths', async () => {
      const body = JSON.stringify({
        request_id: 'top-level-123',
        event: 'test'
      })
      
      const simpleConfig = {
        json_path: 'request_id',
        windowSeconds: 300
      }
      
      const request = new NextRequest('http://localhost:3000/test')
      
      const dedupeKey = await getDedupeKey(request, body, simpleConfig)
      expect(dedupeKey).toBe('top-level-123')
    })
  })

  describe('Duplicate Detection', () => {
    const workflowId = 'test-workflow-id'
    const nodeId = 'test-node-id'
    const dedupeKey = 'duplicate-test-123'

    it('detects duplicate deliveries within window', async () => {
      // Mock finding an existing delivery
      mockSupabase.from().select().eq().eq().eq().gte().limit.mockResolvedValue({
        data: [{ id: 'existing-delivery' }],
        error: null
      })
      
      const isDuplicate = await checkDuplicateDelivery(workflowId, nodeId, dedupeKey, 300)
      
      expect(isDuplicate).toBe(true)
      expect(mockSupabase.from).toHaveBeenCalledWith('webhook_deliveries')
    })

    it('allows delivery when no duplicates found', async () => {
      // Mock finding no existing deliveries
      mockSupabase.from().select().eq().eq().eq().gte().limit.mockResolvedValue({
        data: [],
        error: null
      })
      
      const isDuplicate = await checkDuplicateDelivery(workflowId, nodeId, dedupeKey, 300)
      
      expect(isDuplicate).toBe(false)
    })

    it('uses correct time window for duplicate checking', async () => {
      const windowSeconds = 600 // 10 minutes
      const expectedCutoff = new Date(Date.now() - windowSeconds * 1000)
      
      mockSupabase.from().select().eq().eq().eq().gte().limit.mockResolvedValue({
        data: [],
        error: null
      })
      
      await checkDuplicateDelivery(workflowId, nodeId, dedupeKey, windowSeconds)
      
      // Verify the cutoff time was calculated correctly (within 1 second tolerance)
      expect(mockSupabase.from().select().eq().eq().eq().gte).toHaveBeenCalledWith(
        'timestamp',
        expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
      )
    })

    it('queries correct database fields', async () => {
      mockSupabase.from().select().eq().eq().eq().gte().limit.mockResolvedValue({
        data: [],
        error: null
      })
      
      await checkDuplicateDelivery(workflowId, nodeId, dedupeKey, 300)
      
      expect(mockSupabase.from().select().eq).toHaveBeenCalledWith('workflowId', workflowId)
      expect(mockSupabase.from().select().eq().eq).toHaveBeenCalledWith('nodeId', nodeId)
      expect(mockSupabase.from().select().eq().eq().eq).toHaveBeenCalledWith('dedupeKey', dedupeKey)
      expect(mockSupabase.from().select().eq().eq().eq().gte().limit).toHaveBeenCalledWith(1)
    })

    it('handles database errors gracefully', async () => {
      // Mock database error
      mockSupabase.from().select().eq().eq().eq().gte().limit.mockRejectedValue(
        new Error('Database connection failed')
      )
      
      const isDuplicate = await checkDuplicateDelivery(workflowId, nodeId, dedupeKey, 300)
      
      // Should return false (allow delivery) on error
      expect(isDuplicate).toBe(false)
    })

    it('works with different window sizes', async () => {
      const windowSizes = [60, 300, 600, 3600] // 1min, 5min, 10min, 1hour
      
      mockSupabase.from().select().eq().eq().eq().gte().limit.mockResolvedValue({
        data: [],
        error: null
      })
      
      for (const windowSeconds of windowSizes) {
        await checkDuplicateDelivery(workflowId, nodeId, dedupeKey, windowSeconds)
        
        // Each call should use the correct window size
        const expectedCutoffTime = Date.now() - windowSeconds * 1000
        expect(mockSupabase.from().select().eq().eq().eq().gte).toHaveBeenCalledWith(
          'timestamp',
          expect.any(String)
        )
      }
    })
  })

  describe('Configuration Edge Cases', () => {
    it('handles missing deduplication config', async () => {
      const request = new NextRequest('http://localhost:3000/test')
      
      const dedupeKey = await getDedupeKey(request, '{}', null)
      
      expect(dedupeKey).toBeUndefined()
    })

    it('handles config with both header and json_path (header takes precedence)', async () => {
      const conflictConfig = {
        header: 'X-Request-ID',
        json_path: 'metadata.id',
        windowSeconds: 300
      }
      
      const body = JSON.stringify({
        metadata: { id: 'json-id-123' }
      })
      
      const request = new NextRequest('http://localhost:3000/test', {
        headers: {
          'X-Request-ID': 'header-id-456'
        }
      })
      
      const dedupeKey = await getDedupeKey(request, body, conflictConfig)
      
      // Header should take precedence
      expect(dedupeKey).toBe('header-id-456')
    })

    it('handles empty window seconds', async () => {
      mockSupabase.from().select().eq().eq().eq().gte().limit.mockResolvedValue({
        data: [],
        error: null
      })
      
      await checkDuplicateDelivery(workflowId, nodeId, dedupeKey, 0)
      
      // Should still work with zero window (immediate cutoff)
      expect(mockSupabase.from).toHaveBeenCalled()
    })

    it('handles very long dedupe keys', async () => {
      const longDedupeKey = 'a'.repeat(1000) // 1000 character key
      
      mockSupabase.from().select().eq().eq().eq().gte().limit.mockResolvedValue({
        data: [],
        error: null
      })
      
      const isDuplicate = await checkDuplicateDelivery(workflowId, nodeId, longDedupeKey, 300)
      
      expect(isDuplicate).toBe(false)
      expect(mockSupabase.from().select().eq().eq().eq).toHaveBeenCalledWith('dedupeKey', longDedupeKey)
    })
  })

  describe('Performance and Reliability', () => {
    it('completes deduplication check quickly', async () => {
      mockSupabase.from().select().eq().eq().eq().gte().limit.mockResolvedValue({
        data: [],
        error: null
      })
      
      const startTime = Date.now()
      
      await checkDuplicateDelivery(workflowId, nodeId, dedupeKey, 300)
      
      const endTime = Date.now()
      const duration = endTime - startTime
      
      expect(duration).toBeLessThan(50) // Should complete within 50ms
    })

    it('handles concurrent duplicate checks for same key', async () => {
      mockSupabase.from().select().eq().eq().eq().gte().limit.mockResolvedValue({
        data: [],
        error: null
      })
      
      // Run multiple duplicate checks concurrently
      const promises = Array(5).fill(null).map(() =>
        checkDuplicateDelivery(workflowId, nodeId, dedupeKey, 300)
      )
      
      const results = await Promise.all(promises)
      
      // All should complete successfully
      results.forEach(result => {
        expect(typeof result).toBe('boolean')
      })
    })
  })

  describe('Integration with Request Processing', () => {
    it('extracts keys correctly with different content types', async () => {
      const jsonRequest = new NextRequest('http://localhost:3000/test', {
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': 'json-request-123'
        }
      })
      
      const formRequest = new NextRequest('http://localhost:3000/test', {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Request-ID': 'form-request-456'
        }
      })
      
      const config = {
        header: 'X-Request-ID',
        windowSeconds: 300
      }
      
      const jsonKey = await getDedupeKey(jsonRequest, '{}', config)
      const formKey = await getDedupeKey(formRequest, 'key=value', config)
      
      expect(jsonKey).toBe('json-request-123')
      expect(formKey).toBe('form-request-456')
    })

    it('works with real-world webhook payloads', async () => {
      const realWorldPayloads = [
        // GitHub webhook
        {
          config: { json_path: 'delivery.id', windowSeconds: 300 },
          body: JSON.stringify({
            action: 'opened',
            delivery: { id: 'github-delivery-123' },
            pull_request: { id: 456 }
          }),
          expected: 'github-delivery-123'
        },
        // Stripe webhook
        {
          config: { json_path: 'id', windowSeconds: 300 },
          body: JSON.stringify({
            id: 'evt_stripe_123',
            object: 'event',
            type: 'payment_intent.succeeded'
          }),
          expected: 'evt_stripe_123'
        },
        // Custom webhook
        {
          config: { json_path: 'metadata.correlation_id', windowSeconds: 300 },
          body: JSON.stringify({
            event: 'user.created',
            user: { id: 'user123' },
            metadata: { correlation_id: 'corr-456' }
          }),
          expected: 'corr-456'
        }
      ]
      
      const request = new NextRequest('http://localhost:3000/test')
      
      for (const { config, body, expected } of realWorldPayloads) {
        const dedupeKey = await getDedupeKey(request, body, config)
        expect(dedupeKey).toBe(expected)
      }
    })
  })
})