import { createMocks } from 'node-mocks-http'
import { NextRequest } from 'next/server'
import { POST, GET } from '@/app/api/automations/webhooks/[workflowId]/[nodeId]/route'
import { createHmac } from 'crypto'

// Mock Supabase
const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn()
          }))
        }))
      }))
    })),
    insert: jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn()
      }))
    })),
    upsert: jest.fn()
  }))
}

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => mockSupabase)
}))

// Mock rate limiting (define before jest.mock to avoid TDZ issues)
const mockRateLimit = { limit: jest.fn() }
jest.mock('@/lib/rate-limit', () => ({ ratelimit: mockRateLimit }))

// Mock cookies
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    get: jest.fn(() => ({ value: 'test-cookie' }))
  }))
}))

describe('/api/automations/webhooks/[workflowId]/[nodeId]', () => {
  const mockParams = {
    workflowId: 'test-workflow-id',
    nodeId: 'test-node-id'
  }

  const mockWebhookConfig = {
    id: 'webhook-id',
    workflow_id: 'test-workflow-id',
    node_id: 'test-node-id',
    active: true,
    paused: false,
    secret_hash: 'test-secret-hash',
    content_types: ['application/json'],
    ip_allowlist: [],
    verify: {
      signature_header: 'X-Atlas-Signature',
      timestamp_header: 'X-Atlas-Timestamp',
      tolerance_seconds: 300
    },
    dedupe_config: null,
    workflow: {
      id: 'test-workflow-id',
      organization_id: 'test-org-id',
      status: 'active'
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()
    // Default rate limit success
    mockRateLimit.limit.mockResolvedValue({ success: true })
    // Default webhook config
    mockSupabase.from().select().eq().eq().eq().single.mockResolvedValue({
      data: mockWebhookConfig,
      error: null
    })
  })

  describe('POST endpoint', () => {
    const createValidSignedRequest = (body: string, timestamp?: number) => {
      const ts = timestamp || Math.floor(Date.now() / 1000)
      const payload = `${ts}.${body}`
      const signature = createHmac('sha256', 'test-secret-hash')
        .update(payload)
        .digest('hex')

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Atlas-Signature': `sha256=${signature}`,
          'X-Atlas-Timestamp': ts.toString(),
          'x-forwarded-for': '192.168.1.100'
        },
        body
      })

      return request
    }

    it('accepts valid signed webhook request', async () => {
      const testBody = JSON.stringify({
        event: 'test',
        data: { message: 'Hello World' }
      })

      const request = createValidSignedRequest(testBody)
      
      // Mock successful database operations
      mockSupabase.from().insert.mockResolvedValue({ data: null, error: null })
      
      const response = await POST(request, { params: mockParams })
      const responseData = await response.json()

      expect(response.status).toBe(202)
      expect(responseData.status).toBe('success')
      expect(responseData.message).toBe('Webhook accepted')
      expect(responseData.deliveryId).toBeDefined()
      expect(responseData.processingTimeMs).toBeDefined()
    })

    it('rejects request when webhook not found', async () => {
      mockSupabase.from().select().eq().eq().eq().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }
      })

      const testBody = JSON.stringify({ event: 'test' })
      const request = createValidSignedRequest(testBody)
      
      const response = await POST(request, { params: mockParams })
      const responseData = await response.json()

      expect(response.status).toBe(404)
      expect(responseData.status).toBe('error')
      expect(responseData.message).toBe('Webhook not found')
    })

    it('rejects request when webhook is paused', async () => {
      const pausedWebhook = { ...mockWebhookConfig, paused: true }
      mockSupabase.from().select().eq().eq().eq().single.mockResolvedValue({
        data: pausedWebhook,
        error: null
      })

      const testBody = JSON.stringify({ event: 'test' })
      const request = createValidSignedRequest(testBody)
      
      const response = await POST(request, { params: mockParams })
      const responseData = await response.json()

      expect(response.status).toBe(503)
      expect(responseData.message).toBe('Webhook temporarily unavailable')
    })

    it('rejects request when workflow is not active', async () => {
      const inactiveWorkflow = {
        ...mockWebhookConfig,
        workflow: { ...mockWebhookConfig.workflow, status: 'inactive' }
      }
      mockSupabase.from().select().eq().eq().eq().single.mockResolvedValue({
        data: inactiveWorkflow,
        error: null
      })

      const testBody = JSON.stringify({ event: 'test' })
      const request = createValidSignedRequest(testBody)
      
      const response = await POST(request, { params: mockParams })
      const responseData = await response.json()

      expect(response.status).toBe(503)
      expect(responseData.message).toBe('Workflow not active')
    })

    it('enforces rate limiting', async () => {
      mockRateLimit.limit.mockResolvedValue({
        success: false,
        reset: Date.now() + 60000
      })

      const testBody = JSON.stringify({ event: 'test' })
      const request = createValidSignedRequest(testBody)
      
      const response = await POST(request, { params: mockParams })
      const responseData = await response.json()

      expect(response.status).toBe(429)
      expect(responseData.message).toBe('Rate limit exceeded')
      expect(responseData.retryAfter).toBeDefined()
    })

    it('checks IP allowlist when configured', async () => {
      const ipRestrictedWebhook = {
        ...mockWebhookConfig,
        ip_allowlist: ['10.0.0.0/24', '203.0.113.42']
      }
      mockSupabase.from().select().eq().eq().eq().single.mockResolvedValue({
        data: ipRestrictedWebhook,
        error: null
      })

      const testBody = JSON.stringify({ event: 'test' })
      const request = createValidSignedRequest(testBody)
      
      const response = await POST(request, { params: mockParams })
      const responseData = await response.json()

      expect(response.status).toBe(403)
      expect(responseData.message).toBe('IP address not allowed')
    })

    it('allows requests from IP allowlist', async () => {
      const ipRestrictedWebhook = {
        ...mockWebhookConfig,
        ip_allowlist: ['192.168.1.100'] // Matches the x-forwarded-for header
      }
      mockSupabase.from().select().eq().eq().eq().single.mockResolvedValue({
        data: ipRestrictedWebhook,
        error: null
      })

      mockSupabase.from().insert.mockResolvedValue({ data: null, error: null })

      const testBody = JSON.stringify({ event: 'test' })
      const request = createValidSignedRequest(testBody)
      
      const response = await POST(request, { params: mockParams })

      expect(response.status).toBe(202)
    })

    it('validates content type', async () => {
      const xmlOnlyWebhook = {
        ...mockWebhookConfig,
        content_types: ['application/xml']
      }
      mockSupabase.from().select().eq().eq().eq().single.mockResolvedValue({
        data: xmlOnlyWebhook,
        error: null
      })

      const testBody = JSON.stringify({ event: 'test' })
      const request = createValidSignedRequest(testBody)
      
      const response = await POST(request, { params: mockParams })
      const responseData = await response.json()

      expect(response.status).toBe(415)
      expect(responseData.message).toBe('Content type not supported')
    })

    it('rejects requests without signature header', async () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Atlas-Timestamp': Math.floor(Date.now() / 1000).toString()
        },
        body: JSON.stringify({ event: 'test' })
      })
      
      const response = await POST(request, { params: mockParams })
      const responseData = await response.json()

      expect(response.status).toBe(401)
      expect(responseData.message).toBe('Missing signature or timestamp')
    })

    it('rejects requests without timestamp header', async () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Atlas-Signature': 'sha256=abc123'
        },
        body: JSON.stringify({ event: 'test' })
      })
      
      const response = await POST(request, { params: mockParams })
      const responseData = await response.json()

      expect(response.status).toBe(401)
      expect(responseData.message).toBe('Missing signature or timestamp')
    })

    it('rejects requests with invalid signature format', async () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Atlas-Signature': 'invalid-format',
          'X-Atlas-Timestamp': Math.floor(Date.now() / 1000).toString()
        },
        body: JSON.stringify({ event: 'test' })
      })
      
      const response = await POST(request, { params: mockParams })
      const responseData = await response.json()

      expect(response.status).toBe(401)
      expect(responseData.message).toContain('Invalid signature')
    })

    it('rejects requests with expired timestamp', async () => {
      const expiredTimestamp = Math.floor(Date.now() / 1000) - 400 // 400 seconds ago
      const testBody = JSON.stringify({ event: 'test' })
      const request = createValidSignedRequest(testBody, expiredTimestamp)
      
      const response = await POST(request, { params: mockParams })
      const responseData = await response.json()

      expect(response.status).toBe(401)
      expect(responseData.message).toContain('Timestamp outside tolerance window')
    })

    it('rejects requests with incorrect signature', async () => {
      const testBody = JSON.stringify({ event: 'test' })
      const timestamp = Math.floor(Date.now() / 1000)
      
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Atlas-Signature': 'sha256=incorrectsignature123456789',
          'X-Atlas-Timestamp': timestamp.toString()
        },
        body: testBody
      })
      
      const response = await POST(request, { params: mockParams })
      const responseData = await response.json()

      expect(response.status).toBe(401)
      expect(responseData.message).toContain('Invalid signature')
    })

    it('handles deduplication when enabled', async () => {
      const dedupeWebhook = {
        ...mockWebhookConfig,
        dedupe_config: {
          header: 'X-Request-ID',
          window_seconds: 300
        }
      }
      mockSupabase.from().select().eq().eq().eq().single.mockResolvedValue({
        data: dedupeWebhook,
        error: null
      })

      // Mock finding a duplicate
      mockSupabase.from().select().eq().eq().eq().gte().limit.mockResolvedValue({
        data: [{ id: 'existing-delivery' }],
        error: null
      })

      const testBody = JSON.stringify({ event: 'test' })
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Atlas-Signature': 'sha256=' + createHmac('sha256', 'test-secret-hash').update(`${Math.floor(Date.now() / 1000)}.${testBody}`).digest('hex'),
          'X-Atlas-Timestamp': Math.floor(Date.now() / 1000).toString(),
          'X-Request-ID': 'duplicate-request-123'
        },
        body: testBody
      })
      
      const response = await POST(request, { params: mockParams })
      const responseData = await response.json()

      expect(response.status).toBe(202)
      expect(responseData.message).toBe('Duplicate request ignored')
      expect(responseData.duplicate).toBe(true)
    })

    it('rejects requests that are too large', async () => {
      // Create a very large payload (over 1MB)
      const largePayload = 'x'.repeat(1024 * 1024 + 1)
      const request = createValidSignedRequest(largePayload)
      
      const response = await POST(request, { params: mockParams })
      const responseData = await response.json()

      expect(response.status).toBe(413)
      expect(responseData.message).toBe('Request body too large')
    })

    it('stores delivery record and triggers workflow', async () => {
      const testBody = JSON.stringify({
        event: 'user_action',
        user_id: '12345',
        data: { action: 'signup' }
      })

      const request = createValidSignedRequest(testBody)
      
      // Mock successful database operations
      mockSupabase.from().insert.mockResolvedValue({ data: null, error: null })
      
      const response = await POST(request, { params: mockParams })

      expect(response.status).toBe(202)
      
      // Verify delivery record was stored
      expect(mockSupabase.from).toHaveBeenCalledWith('webhook_deliveries')
      
      // Verify automation was triggered
      expect(mockSupabase.from).toHaveBeenCalledWith('automation_triggers')
    })
  })

  describe('GET endpoint', () => {
    it('returns webhook information for existing webhook', async () => {
      const response = await GET(new NextRequest('http://localhost:3000/api/test'), { params: mockParams })
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.status).toBe('ok')
      expect(responseData.webhook).toMatchObject({
        id: mockWebhookConfig.id,
        workflowId: mockParams.workflowId,
        nodeId: mockParams.nodeId,
        active: mockWebhookConfig.active,
        paused: mockWebhookConfig.paused
      })
    })

    it('returns 404 for non-existent webhook', async () => {
      mockSupabase.from().select().eq().eq().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }
      })

      const response = await GET(new NextRequest('http://localhost:3000/api/test'), { params: mockParams })
      const responseData = await response.json()

      expect(response.status).toBe(404)
      expect(responseData.error).toBe('Webhook not found')
    })

    it('handles database errors gracefully', async () => {
      mockSupabase.from().select().eq().eq().single.mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' }
      })

      const response = await GET(new NextRequest('http://localhost:3000/api/test'), { params: mockParams })
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.error).toBe('Internal server error')
    })
  })

  describe('Error Handling', () => {
    it('handles database errors during webhook lookup', async () => {
      mockSupabase.from().select().eq().eq().eq().single.mockRejectedValue(
        new Error('Database connection failed')
      )

      const testBody = JSON.stringify({ event: 'test' })
      const request = createValidSignedRequest(testBody)
      
      const response = await POST(request, { params: mockParams })
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.status).toBe('error')
      expect(responseData.message).toBe('Internal server error')
    })

    it('handles database errors during delivery storage', async () => {
      mockSupabase.from().insert.mockRejectedValue(
        new Error('Failed to insert delivery record')
      )

      const testBody = JSON.stringify({ event: 'test' })
      const request = createValidSignedRequest(testBody)
      
      const response = await POST(request, { params: mockParams })
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.message).toBe('Internal server error')
    })

    it('handles rate limit check failures gracefully', async () => {
      mockRateLimit.limit.mockRejectedValue(new Error('Rate limit service unavailable'))

      const testBody = JSON.stringify({ event: 'test' })
      const request = createValidSignedRequest(testBody)
      
      const response = await POST(request, { params: mockParams })
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.message).toBe('Internal server error')
    })
  })

  describe('Statistics Tracking', () => {
    it('updates webhook statistics on successful delivery', async () => {
      const testBody = JSON.stringify({ event: 'test' })
      const request = createValidSignedRequest(testBody)
      
      mockSupabase.from().insert.mockResolvedValue({ data: null, error: null })
      mockSupabase.from().upsert.mockResolvedValue({ data: null, error: null })
      
      const response = await POST(request, { params: mockParams })

      expect(response.status).toBe(202)
      expect(mockSupabase.from).toHaveBeenCalledWith('webhook_stats')
    })

    it('updates webhook statistics on rejected delivery', async () => {
      mockSupabase.from().select().eq().eq().eq().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }
      })

      const testBody = JSON.stringify({ event: 'test' })
      const request = createValidSignedRequest(testBody)
      
      const response = await POST(request, { params: mockParams })

      expect(response.status).toBe(404)
      expect(mockSupabase.from).toHaveBeenCalledWith('webhook_stats')
    })
  })
})