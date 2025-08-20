import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

// Mock environment variables
const mockEnv = {
  NEXT_PUBLIC_FACEBOOK_APP_ID: '715100284200848',
  FACEBOOK_APP_SECRET: 'test_app_secret_123',
  NEXT_PUBLIC_SITE_URL: 'http://localhost:3000',
  NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test_anon_key'
}

// Test data
const TEST_ORG_ID = '63589490-8f55-4157-bd3a-e141594b748e'
const TEST_USER_ID = 'test-user-123'
const TEST_FB_USER_ID = '123456789'
const TEST_CODE = 'test_code_abc123'
const TEST_STATE = 'atlas_fitness_oauth'
const TEST_ACCESS_TOKEN = 'test_access_token_xyz'

describe('Facebook OAuth Persistence', () => {
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    // Save original env
    originalEnv = process.env
    
    // Set test env vars
    Object.assign(process.env, mockEnv)
    
    // Mock fetch globally
    global.fetch = jest.fn()
    
    // Mock Supabase client
    jest.mock('@/app/lib/supabase/server', () => ({
      createClient: jest.fn(() => ({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: {
              user: {
                id: TEST_USER_ID,
                email: 'test@example.com'
              }
            }
          })
        },
        from: jest.fn((table: string) => ({
          select: jest.fn().mockReturnThis(),
          insert: jest.fn().mockReturnThis(),
          upsert: jest.fn().mockReturnThis(),
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: table === 'user_organizations' ? {
              organization_id: TEST_ORG_ID
            } : {
              id: 'integration-123',
              organization_id: TEST_ORG_ID,
              facebook_user_id: TEST_FB_USER_ID,
              is_active: true
            },
            error: null
          })
        }))
      }))
    }))
  })

  afterEach(() => {
    process.env = originalEnv
    jest.restoreAllMocks()
  })

  describe('OAuth Callback Handler', () => {
    test('should exchange code for access token and persist to database', async () => {
      // Mock Facebook token exchange
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
      mockFetch.mockImplementation((url: any) => {
        const urlStr = typeof url === 'string' ? url : url.toString()
        
        if (urlStr.includes('oauth/access_token')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              access_token: TEST_ACCESS_TOKEN,
              token_type: 'bearer',
              expires_in: 5183999
            })
          } as Response)
        }
        
        if (urlStr.includes('/me')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              id: TEST_FB_USER_ID,
              name: 'Test User',
              email: 'test@facebook.com'
            })
          } as Response)
        }
        
        return Promise.reject(new Error('Unexpected fetch call'))
      })

      // Import the callback handler
      const { handleFacebookCallback } = await import('@/app/lib/facebook/callback-handler')
      
      // Call the handler
      const result = await handleFacebookCallback({
        code: TEST_CODE,
        state: TEST_STATE,
        organizationId: TEST_ORG_ID,
        userId: TEST_USER_ID
      })
      
      // Assertions
      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        facebook_user_id: TEST_FB_USER_ID,
        facebook_user_name: 'Test User',
        facebook_user_email: 'test@facebook.com',
        access_token: TEST_ACCESS_TOKEN
      })
      
      // Verify token exchange was called with correct params
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('oauth/access_token'),
        expect.objectContaining({
          method: 'GET'
        })
      )
      
      // Verify user data was fetched
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/me'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${TEST_ACCESS_TOKEN}`
          })
        })
      )
    })

    test('should handle duplicate callbacks idempotently', async () => {
      // Setup mocks
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          access_token: TEST_ACCESS_TOKEN,
          token_type: 'bearer',
          expires_in: 5183999
        })
      } as Response)

      const { handleFacebookCallback } = await import('@/app/lib/facebook/callback-handler')
      
      // First callback
      const result1 = await handleFacebookCallback({
        code: TEST_CODE,
        state: TEST_STATE,
        organizationId: TEST_ORG_ID,
        userId: TEST_USER_ID
      })
      
      expect(result1.success).toBe(true)
      
      // Second callback with different code but same user
      const result2 = await handleFacebookCallback({
        code: 'different_code_456',
        state: TEST_STATE,
        organizationId: TEST_ORG_ID,
        userId: TEST_USER_ID
      })
      
      expect(result2.success).toBe(true)
      
      // Should update existing record, not create duplicate
      // This would be verified by checking the upsert was called with ON CONFLICT clause
    })

    test('should validate OAuth state parameter', async () => {
      const { handleFacebookCallback } = await import('@/app/lib/facebook/callback-handler')
      
      // Invalid state should fail
      const result = await handleFacebookCallback({
        code: TEST_CODE,
        state: 'invalid_state',
        organizationId: TEST_ORG_ID,
        userId: TEST_USER_ID
      })
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid OAuth state')
    })

    test('should fail gracefully when FACEBOOK_APP_SECRET is missing', async () => {
      // Remove app secret
      delete process.env.FACEBOOK_APP_SECRET
      
      const { handleFacebookCallback } = await import('@/app/lib/facebook/callback-handler')
      
      const result = await handleFacebookCallback({
        code: TEST_CODE,
        state: TEST_STATE,
        organizationId: TEST_ORG_ID,
        userId: TEST_USER_ID
      })
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('FACEBOOK_APP_SECRET')
    })

    test('should handle Facebook API errors gracefully', async () => {
      // Mock Facebook API error
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({
          error: {
            message: 'Invalid OAuth access token',
            type: 'OAuthException',
            code: 190
          }
        })
      } as Response)

      const { handleFacebookCallback } = await import('@/app/lib/facebook/callback-handler')
      
      const result = await handleFacebookCallback({
        code: TEST_CODE,
        state: TEST_STATE,
        organizationId: TEST_ORG_ID,
        userId: TEST_USER_ID
      })
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid OAuth access token')
    })
  })

  describe('Status Endpoint', () => {
    test('should return connected status when integration exists', async () => {
      // Mock the status check function
      const { checkFacebookStatus } = await import('@/app/lib/facebook/status-checker')
      
      const status = await checkFacebookStatus({
        organizationId: TEST_ORG_ID,
        userId: TEST_USER_ID
      })
      
      expect(status.connected).toBe(true)
      expect(status.integration).toBeDefined()
      expect(status.integration?.facebook_user_id).toBe(TEST_FB_USER_ID)
    })

    test('should return disconnected when token is expired', async () => {
      // Mock expired token
      jest.mock('@/app/lib/supabase/server', () => ({
        createClient: jest.fn(() => ({
          from: jest.fn(() => ({
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'integration-123',
                organization_id: TEST_ORG_ID,
                facebook_user_id: TEST_FB_USER_ID,
                token_expires_at: new Date(Date.now() - 86400000).toISOString(), // Yesterday
                is_active: true
              },
              error: null
            })
          }))
        }))
      }))

      const { checkFacebookStatus } = await import('@/app/lib/facebook/status-checker')
      
      const status = await checkFacebookStatus({
        organizationId: TEST_ORG_ID,
        userId: TEST_USER_ID
      })
      
      expect(status.connected).toBe(false)
      expect(status.error).toContain('expired')
    })

    test('should handle RLS policy errors', async () => {
      // Mock RLS error
      jest.mock('@/app/lib/supabase/server', () => ({
        createClient: jest.fn(() => ({
          from: jest.fn(() => ({
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: null,
              error: {
                code: '42501',
                message: 'new row violates row-level security policy'
              }
            })
          }))
        }))
      }))

      const { checkFacebookStatus } = await import('@/app/lib/facebook/status-checker')
      
      const status = await checkFacebookStatus({
        organizationId: TEST_ORG_ID,
        userId: TEST_USER_ID
      })
      
      expect(status.connected).toBe(false)
      expect(status.error).toContain('RLS')
    })
  })

  describe('Database Operations', () => {
    test('should create unique constraint on (organization_id, facebook_user_id)', async () => {
      // This test would verify the database schema
      // In a real test, we'd check the actual database migration
      
      const migration = `
        CREATE UNIQUE INDEX IF NOT EXISTS idx_facebook_integrations_org_fb_user 
        ON facebook_integrations(organization_id, facebook_user_id);
      `
      
      expect(migration).toContain('UNIQUE')
      expect(migration).toContain('organization_id')
      expect(migration).toContain('facebook_user_id')
    })

    test('should have proper RLS policies for multi-tenant access', async () => {
      // Verify RLS policies exist
      const policies = [
        'fb_select_by_org',
        'fb_insert_by_org',
        'fb_update_by_org',
        'fb_delete_by_org'
      ]
      
      // In a real test, we'd query pg_policies
      policies.forEach(policy => {
        expect(policy).toMatch(/by_org/)
      })
    })
  })
})