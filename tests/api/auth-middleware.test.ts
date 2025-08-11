import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, createOrgScopedClient } from '@/lib/auth-middleware'

// Mock Supabase
jest.mock('@/app/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn()
    },
    from: jest.fn()
  }))
}))

describe('Auth Middleware Tests', () => {
  let mockRequest: NextRequest
  
  beforeEach(() => {
    mockRequest = new NextRequest('http://localhost:3000/api/test')
    jest.clearAllMocks()
  })
  
  describe('requireAuth', () => {
    it('should return 401 when no user is authenticated', async () => {
      const { createClient } = require('@/app/lib/supabase/server')
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({ 
            data: { user: null }, 
            error: null 
          })
        }
      }
      ;(createClient as jest.MockedFunction<typeof createClient>).mockReturnValue(mockSupabase as any)
      
      const result = await requireAuth(mockRequest)
      
      expect(result).toBeInstanceOf(NextResponse)
      expect((result as NextResponse).status).toBe(401)
    })
    
    it('should return auth context when user is authenticated', async () => {
      const { createClient } = require('@/app/lib/supabase/server')
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({ 
            data: { user: mockUser }, 
            error: null 
          })
        },
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { organization_id: 'org-123' },
                error: null
              })
            })
          })
        })
      }
      ;(createClient as jest.MockedFunction<typeof createClient>).mockReturnValue(mockSupabase as any)
      
      const result = await requireAuth(mockRequest)
      
      expect(result).not.toBeInstanceOf(NextResponse)
      expect(result).toEqual({
        user: mockUser,
        organizationId: 'org-123'
      })
    })
    
    it('should return 401 when user has no organization', async () => {
      const { createClient } = require('@/app/lib/supabase/server')
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({ 
            data: { user: mockUser }, 
            error: null 
          })
        },
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'No organization found' }
              })
            })
          })
        })
      }
      ;(createClient as jest.MockedFunction<typeof createClient>).mockReturnValue(mockSupabase as any)
      
      const result = await requireAuth(mockRequest)
      
      expect(result).toBeInstanceOf(NextResponse)
      expect((result as NextResponse).status).toBe(401)
    })
  })
  
  describe('createOrgScopedClient', () => {
    it('should create client with organization filtering', () => {
      const organizationId = 'org-123'
      const mockFrom = jest.fn()
      const mockSelect = jest.fn().mockReturnThis()
      const mockInsert = jest.fn().mockReturnThis()
      const mockUpdate = jest.fn().mockReturnThis()
      const mockDelete = jest.fn().mockReturnThis()
      const mockEq = jest.fn().mockReturnThis()
      
      const { createClient } = require('@/app/lib/supabase/server')
      const baseMockSupabase = {
        from: mockFrom.mockReturnValue({
          select: mockSelect,
          insert: mockInsert,
          update: mockUpdate,
          delete: mockDelete,
          eq: mockEq
        })
      }
      ;(createClient as jest.MockedFunction<typeof createClient>).mockReturnValue(baseMockSupabase as any)
      
      const scopedClient = createOrgScopedClient(organizationId)
      
      // Test select with organization filter
      scopedClient.from('leads').select('*')
      expect(mockEq).toHaveBeenCalledWith('organization_id', organizationId)
      
      // Test insert with organization_id added
      scopedClient.from('leads').insert({ name: 'Test' })
      expect(mockInsert).toHaveBeenCalledWith({ 
        name: 'Test', 
        organization_id: organizationId 
      })
      
      // Test update with organization filter
      scopedClient.from('leads').update({ name: 'Updated' })
      expect(mockEq).toHaveBeenCalledWith('organization_id', organizationId)
      
      // Test delete with organization filter
      scopedClient.from('leads').delete()
      expect(mockEq).toHaveBeenCalledWith('organization_id', organizationId)
    })
    
    it('should handle array inserts with organization_id', () => {
      const organizationId = 'org-123'
      const mockInsert = jest.fn().mockReturnThis()
      
      const { createClient } = require('@/app/lib/supabase/server')
      ;(createClient as jest.MockedFunction<typeof createClient>).mockReturnValue({
        from: jest.fn().mockReturnValue({
          insert: mockInsert
        })
      } as any)
      
      const scopedClient = createOrgScopedClient(organizationId)
      
      const items = [
        { name: 'Test 1' },
        { name: 'Test 2' }
      ]
      
      scopedClient.from('leads').insert(items)
      
      expect(mockInsert).toHaveBeenCalledWith([
        { name: 'Test 1', organization_id: organizationId },
        { name: 'Test 2', organization_id: organizationId }
      ])
    })
  })
})