import { createMocks } from 'node-mocks-http'
import { NextRequest } from 'next/server'
import { POST, GET, DELETE } from '@/app/api/automations/webhooks/[workflowId]/[nodeId]/rotate-secret/route'

// Mock Supabase
const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn()
        }))
      }))
    })),
    update: jest.fn(() => ({
      eq: jest.fn(() => ({
        eq: jest.fn()
      }))
    })),
    insert: jest.fn(),
    delete: jest.fn(() => ({
      eq: jest.fn()
    })),
    gte: jest.fn(() => ({
      single: jest.fn()
    }))
  }))
}

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => mockSupabase)
}))

// Mock cookies
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    get: jest.fn(() => ({ value: 'test-cookie' }))
  }))
}))

// Mock crypto functions
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: jest.fn(() => 'mock-uuid-1234'),
  },
})

describe('/api/automations/webhooks/[workflowId]/[nodeId]/rotate-secret', () => {
  const mockParams = {
    workflowId: 'test-workflow-id',
    nodeId: 'test-node-id'
  }

  const mockWebhookConfig = {
    id: 'webhook-id',
    workflow_id: 'test-workflow-id',
    node_id: 'test-node-id',
    secret_hash: 'old-secret-hash',
    secret_last4: 'old4',
    workflow: {
      id: 'test-workflow-id',
      organization_id: 'test-org-id',
      created_by: 'user-123'
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Default webhook config
    mockSupabase.from().select().eq().eq().single.mockResolvedValue({
      data: mockWebhookConfig,
      error: null
    })
    
    // Default successful operations
    mockSupabase.from().update().eq().eq.mockResolvedValue({
      data: null,
      error: null
    })
    mockSupabase.from().insert.mockResolvedValue({
      data: null,
      error: null
    })
  })

  describe('POST - Rotate Secret', () => {
    it('successfully rotates webhook secret', async () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST'
      })
      
      const response = await POST(request, { params: mockParams })
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.secretId).toBe('mock-uuid-1234')
      expect(responseData.last4).toMatch(/[a-zA-Z0-9]{4}/)
      expect(responseData.revealToken).toBe('mock-uuid-1234')
      expect(responseData.expiresAt).toBeDefined()
      expect(responseData.message).toBe('Webhook secret rotated successfully')
    })

    it('updates webhook with new secret in database', async () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST'
      })
      
      await POST(request, { params: mockParams })

      // Verify webhook was updated with new secret
      expect(mockSupabase.from).toHaveBeenCalledWith('automation_webhooks')
      expect(mockSupabase.from().update).toHaveBeenCalledWith(
        expect.objectContaining({
          secret_hash: expect.any(String),
          secret_last4: expect.any(String),
          secret_rotated_at: expect.any(String),
          reveal_token: expect.any(String),
          reveal_token_expires_at: expect.any(String)
        })
      )
    })

    it('stores reveal token for one-time secret access', async () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST'
      })
      
      await POST(request, { params: mockParams })

      // Verify reveal token was stored
      expect(mockSupabase.from).toHaveBeenCalledWith('webhook_secret_reveals')
      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          reveal_token: expect.any(String),
          secret: expect.stringMatching(/^wh_/),
          workflow_id: mockParams.workflowId,
          node_id: mockParams.nodeId,
          expires_at: expect.any(String)
        })
      )
    })

    it('logs secret rotation in audit log', async () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST'
      })
      
      await POST(request, { params: mockParams })

      // Verify audit log entry
      expect(mockSupabase.from).toHaveBeenCalledWith('webhook_audit_log')
      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          webhook_id: mockWebhookConfig.id,
          workflow_id: mockParams.workflowId,
          node_id: mockParams.nodeId,
          action: 'secret_rotated',
          organization_id: mockWebhookConfig.workflow.organization_id,
          user_id: mockWebhookConfig.workflow.created_by,
          metadata: expect.objectContaining({
            old_secret_last4: mockWebhookConfig.secret_last4,
            new_secret_last4: expect.any(String),
            rotated_at: expect.any(String)
          })
        })
      )
    })

    it('returns 404 when webhook not found', async () => {
      mockSupabase.from().select().eq().eq().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }
      })

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST'
      })
      
      const response = await POST(request, { params: mockParams })
      const responseData = await response.json()

      expect(response.status).toBe(404)
      expect(responseData.error).toBe('Webhook not found')
    })

    it('handles database update errors', async () => {
      mockSupabase.from().update().eq().eq.mockResolvedValue({
        data: null,
        error: { message: 'Update failed' }
      })

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST'
      })
      
      const response = await POST(request, { params: mockParams })
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.error).toBe('Failed to update webhook secret')
    })

    it('handles unexpected errors gracefully', async () => {
      mockSupabase.from().select().eq().eq().single.mockRejectedValue(
        new Error('Database connection failed')
      )

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST'
      })
      
      const response = await POST(request, { params: mockParams })
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.error).toBe('Internal server error')
    })

    it('generates cryptographically secure secrets', async () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST'
      })
      
      const response = await POST(request, { params: mockParams })

      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          secret: expect.stringMatching(/^wh_[A-Za-z0-9_-]{43}$/) // Base64url encoded 32 bytes
        })
      )
    })

    it('sets appropriate expiration time for reveal token', async () => {
      const beforeTime = new Date(Date.now() + 4 * 60 * 1000) // 4 minutes from now
      const afterTime = new Date(Date.now() + 6 * 60 * 1000)  // 6 minutes from now

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST'
      })
      
      const response = await POST(request, { params: mockParams })
      const responseData = await response.json()

      const expiresAt = new Date(responseData.expiresAt)
      expect(expiresAt.getTime()).toBeGreaterThan(beforeTime.getTime())
      expect(expiresAt.getTime()).toBeLessThan(afterTime.getTime())
    })
  })

  describe('GET - Reveal Secret', () => {
    const mockSecretReveal = {
      reveal_token: 'reveal-token-123',
      secret: 'wh_abc123def456ghi789jkl012mno345pqr678stu901vwx',
      workflow_id: 'test-workflow-id',
      node_id: 'test-node-id',
      expires_at: new Date(Date.now() + 60000).toISOString()
    }

    beforeEach(() => {
      mockSupabase.from().select().eq().eq().eq().gte().single.mockResolvedValue({
        data: mockSecretReveal,
        error: null
      })
      mockSupabase.from().delete().eq.mockResolvedValue({
        data: null,
        error: null
      })
    })

    it('reveals secret with valid token', async () => {
      const url = `http://localhost:3000/api/test?reveal_token=${mockSecretReveal.reveal_token}`
      const request = new NextRequest(url, { method: 'GET' })
      
      const response = await GET(request, { params: mockParams })
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.secret).toBe(mockSecretReveal.secret)
      expect(responseData.last4).toBe('vwx')
      expect(responseData.message).toBe('Secret revealed (one-time only)')
    })

    it('deletes reveal token after use (one-time use)', async () => {
      const url = `http://localhost:3000/api/test?reveal_token=${mockSecretReveal.reveal_token}`
      const request = new NextRequest(url, { method: 'GET' })
      
      await GET(request, { params: mockParams })

      expect(mockSupabase.from).toHaveBeenCalledWith('webhook_secret_reveals')
      expect(mockSupabase.from().delete().eq).toHaveBeenCalledWith(
        'reveal_token',
        mockSecretReveal.reveal_token
      )
    })

    it('logs secret access in audit log', async () => {
      const url = `http://localhost:3000/api/test?reveal_token=${mockSecretReveal.reveal_token}`
      const request = new NextRequest(url, { method: 'GET' })
      
      await GET(request, { params: mockParams })

      expect(mockSupabase.from).toHaveBeenCalledWith('webhook_audit_log')
      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          workflow_id: mockParams.workflowId,
          node_id: mockParams.nodeId,
          action: 'secret_revealed',
          metadata: expect.objectContaining({
            reveal_token: mockSecretReveal.reveal_token,
            revealed_at: expect.any(String)
          })
        })
      )
    })

    it('returns 400 when reveal token is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/test', { method: 'GET' })
      
      const response = await GET(request, { params: mockParams })
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error).toBe('Reveal token required')
    })

    it('returns 404 for invalid or expired reveal token', async () => {
      mockSupabase.from().select().eq().eq().eq().gte().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }
      })

      const url = 'http://localhost:3000/api/test?reveal_token=invalid-token'
      const request = new NextRequest(url, { method: 'GET' })
      
      const response = await GET(request, { params: mockParams })
      const responseData = await response.json()

      expect(response.status).toBe(404)
      expect(responseData.error).toBe('Invalid or expired reveal token')
    })

    it('handles database errors during secret retrieval', async () => {
      mockSupabase.from().select().eq().eq().eq().gte().single.mockRejectedValue(
        new Error('Database error')
      )

      const url = `http://localhost:3000/api/test?reveal_token=${mockSecretReveal.reveal_token}`
      const request = new NextRequest(url, { method: 'GET' })
      
      const response = await GET(request, { params: mockParams })
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.error).toBe('Internal server error')
    })

    it('verifies token matches workflow and node ID', async () => {
      const url = `http://localhost:3000/api/test?reveal_token=${mockSecretReveal.reveal_token}`
      const request = new NextRequest(url, { method: 'GET' })
      
      await GET(request, { params: mockParams })

      expect(mockSupabase.from().select().eq().eq().eq).toHaveBeenCalledWith(
        'workflow_id', mockParams.workflowId
      )
      expect(mockSupabase.from().select().eq().eq().eq).toHaveBeenCalledWith(
        'node_id', mockParams.nodeId
      )
    })

    it('only returns non-expired tokens', async () => {
      const url = `http://localhost:3000/api/test?reveal_token=${mockSecretReveal.reveal_token}`
      const request = new NextRequest(url, { method: 'GET' })
      
      await GET(request, { params: mockParams })

      expect(mockSupabase.from().select().eq().eq().eq().gte).toHaveBeenCalledWith(
        'expires_at', expect.any(String)
      )
    })
  })

  describe('DELETE - Invalidate Secret', () => {
    it('successfully invalidates webhook secret', async () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'DELETE'
      })
      
      const response = await DELETE(request, { params: mockParams })
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.message).toBe('Webhook secret invalidated and webhook disabled')
    })

    it('sets secret to null and marks webhook as inactive', async () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'DELETE'
      })
      
      await DELETE(request, { params: mockParams })

      expect(mockSupabase.from().update).toHaveBeenCalledWith(
        expect.objectContaining({
          secret_hash: null,
          secret_last4: null,
          active: false,
          secret_invalidated_at: expect.any(String)
        })
      )
      expect(mockSupabase.from().update().eq().eq).toHaveBeenCalledWith(
        'workflow_id', mockParams.workflowId
      )
      expect(mockSupabase.from().update().eq().eq).toHaveBeenCalledWith(
        'node_id', mockParams.nodeId
      )
    })

    it('logs secret invalidation in audit log', async () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'DELETE'
      })
      
      await DELETE(request, { params: mockParams })

      expect(mockSupabase.from).toHaveBeenCalledWith('webhook_audit_log')
      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          webhook_id: mockWebhookConfig.id,
          workflow_id: mockParams.workflowId,
          node_id: mockParams.nodeId,
          action: 'secret_invalidated',
          metadata: expect.objectContaining({
            invalidated_at: expect.any(String)
          })
        })
      )
    })

    it('returns 404 when webhook not found', async () => {
      mockSupabase.from().select().eq().eq().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }
      })

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'DELETE'
      })
      
      const response = await DELETE(request, { params: mockParams })
      const responseData = await response.json()

      expect(response.status).toBe(404)
      expect(responseData.error).toBe('Webhook not found')
    })

    it('handles database update errors during invalidation', async () => {
      mockSupabase.from().update().eq().eq.mockResolvedValue({
        data: null,
        error: { message: 'Update failed' }
      })

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'DELETE'
      })
      
      const response = await DELETE(request, { params: mockParams })
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.error).toBe('Failed to invalidate webhook secret')
    })

    it('handles unexpected errors gracefully', async () => {
      mockSupabase.from().select().eq().eq().single.mockRejectedValue(
        new Error('Database connection failed')
      )

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'DELETE'
      })
      
      const response = await DELETE(request, { params: mockParams })
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.error).toBe('Internal server error')
    })
  })

  describe('Security Considerations', () => {
    it('generates unique secrets for each rotation', async () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST'
      })

      // Mock multiple UUID calls
      ;(global.crypto.randomUUID as jest.Mock)
        .mockReturnValueOnce('first-uuid')
        .mockReturnValueOnce('second-uuid')
      
      const response1 = await POST(request, { params: mockParams })
      const response2 = await POST(request, { params: mockParams })

      const data1 = await response1.json()
      const data2 = await response2.json()

      expect(data1.secretId).not.toBe(data2.secretId)
      expect(data1.revealToken).not.toBe(data2.revealToken)
    })

    it('includes proper entropy in generated secrets', async () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST'
      })
      
      await POST(request, { params: mockParams })

      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          secret: expect.stringMatching(/^wh_[A-Za-z0-9_-]{43}$/)
        })
      )
    })

    it('sets appropriate expiration for reveal tokens', async () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST'
      })
      
      const response = await POST(request, { params: mockParams })
      const responseData = await response.json()

      const expirationTime = new Date(responseData.expiresAt)
      const now = new Date()
      const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000)

      expect(expirationTime.getTime()).toBeCloseTo(fiveMinutesFromNow.getTime(), -2) // Within 100ms
    })
  })
})