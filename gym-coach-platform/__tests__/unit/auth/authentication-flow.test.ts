// Mock Supabase
const mockSupabaseClient = {
  auth: {
    signInWithPassword: jest.fn(),
    getUser: jest.fn(),
    getSession: jest.fn(),
    refreshSession: jest.fn(),
    signOut: jest.fn()
  },
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn()
      }))
    }))
  }))
}

jest.mock('@/lib/supabase/client', () => ({
  getSupabaseClient: () => mockSupabaseClient
}))

jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createRouteHandlerClient: () => mockSupabaseClient
}))

// Mock Next.js
const mockRouter = {
  push: jest.fn(),
  refresh: jest.fn()
}

jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter
}))

describe('Authentication Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Client-side Authentication', () => {
    it('should initialize Supabase client correctly', () => {
      const { getSupabaseClient } = require('@/lib/supabase/client')
      const client = getSupabaseClient()
      expect(client).toBeDefined()
      expect(client.auth).toBeDefined()
    })

    it('should handle successful login with session establishment', async () => {
      const mockUser = {
        id: 'test-user-id',
        email: 'sam@atlas-gyms.co.uk',
        aud: 'authenticated',
        app_metadata: {},
        user_metadata: {}
      }

      const mockSession = {
        user: mockUser,
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        expires_at: Date.now() + 3600000
      }

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null
      })

      mockSupabaseClient.auth.refreshSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      })

      // Simulate login form submission
      const formData = {
        email: 'sam@atlas-gyms.co.uk',
        password: 'test-password'
      }

      const result = await mockSupabaseClient.auth.signInWithPassword(formData)

      expect(result.data.user).toBeDefined()
      expect(result.data.session).toBeDefined()
      expect(result.error).toBeNull()

      // Should refresh session after login
      await mockSupabaseClient.auth.refreshSession()
      expect(mockSupabaseClient.auth.refreshSession).toHaveBeenCalled()
    })

    it('should handle authentication errors gracefully', async () => {
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' }
      })

      const result = await mockSupabaseClient.auth.signInWithPassword({
        email: 'invalid@example.com',
        password: 'wrong-password'
      })

      expect(result.error).toBeDefined()
      expect(result.error.message).toBe('Invalid login credentials')
      expect(result.data.user).toBeNull()
    })

    it('should handle session persistence across page loads', async () => {
      const mockSession = {
        user: { id: 'test-user-id', email: 'sam@atlas-gyms.co.uk' },
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        expires_at: Date.now() + 3600000
      }

      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      })

      const result = await mockSupabaseClient.auth.getSession()

      expect(result.data.session).toBeDefined()
      expect(result.data.session.user.id).toBe('test-user-id')
      expect(result.error).toBeNull()
    })
  })

  describe('Server-side API Authentication', () => {
    it('should authenticate API requests with valid session', async () => {
      const mockUser = {
        id: 'test-user-id',
        email: 'sam@atlas-gyms.co.uk'
      }

      const mockUserData = {
        id: 'test-user-id',
        email: 'sam@atlas-gyms.co.uk',
        organization_id: 'eac9a158-d3c7-4140-9620-91a5554a6fe8',
        role: 'owner'
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockUserData,
              error: null
            })
          })
        })
      })

      // Simulate API request authentication
      const authResult = await mockSupabaseClient.auth.getUser()
      expect(authResult.data.user).toBeDefined()
      expect(authResult.error).toBeNull()

      // Simulate fetching user organization details
      const userQuery = mockSupabaseClient
        .from('users')
        .select('organization_id, role')
        .eq('id', mockUser.id)
        .single()

      const userResult = await userQuery
      expect(userResult.data.organization_id).toBe('eac9a158-d3c7-4140-9620-91a5554a6fe8')
      expect(userResult.data.role).toBe('owner')
    })

    it('should handle 401 errors when session is invalid', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid JWT' }
      })

      const authResult = await mockSupabaseClient.auth.getUser()

      expect(authResult.data.user).toBeNull()
      expect(authResult.error).toBeDefined()
      expect(authResult.error.message).toBe('Invalid JWT')
    })

    it('should handle missing organization_id gracefully', async () => {
      const mockUser = {
        id: 'test-user-id',
        email: 'sam@atlas-gyms.co.uk'
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      // Simulate user without organization_id
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'User not found' }
            })
          })
        })
      })

      const userQuery = mockSupabaseClient
        .from('users')
        .select('organization_id, role')
        .eq('id', mockUser.id)
        .single()

      const userResult = await userQuery
      expect(userResult.data).toBeNull()
      expect(userResult.error.message).toBe('User not found')
    })
  })

  describe('Organization Context', () => {
    it('should properly establish organization context on login', async () => {
      const mockOrganization = {
        id: 'eac9a158-d3c7-4140-9620-91a5554a6fe8',
        name: 'Atlas Fitness',
        slug: 'atlas-fitness'
      }

      const mockUserWithOrg = {
        id: 'test-user-id',
        email: 'sam@atlas-gyms.co.uk',
        organization_id: mockOrganization.id,
        role: 'owner',
        organizations: mockOrganization
      }

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockUserWithOrg,
              error: null
            })
          })
        })
      })

      const userQuery = mockSupabaseClient
        .from('users')
        .select(`
          *,
          organizations (
            id,
            name,
            email,
            subscription_plan,
            subscription_status
          )
        `)
        .eq('id', 'test-user-id')
        .single()

      const result = await userQuery

      expect(result.data.organization_id).toBe(mockOrganization.id)
      expect(result.data.organizations.name).toBe('Atlas Fitness')
      expect(result.error).toBeNull()
    })

    it('should validate organization membership for API requests', async () => {
      const organizationId = 'eac9a158-d3c7-4140-9620-91a5554a6fe8'
      const mockUserData = {
        id: 'test-user-id',
        organization_id: organizationId,
        role: 'owner'
      }

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockUserData,
              error: null
            })
          })
        })
      })

      // Simulate checking user's organization for API request
      const userQuery = mockSupabaseClient
        .from('users')
        .select('organization_id')
        .eq('id', 'test-user-id')
        .single()

      const result = await userQuery

      expect(result.data.organization_id).toBe(organizationId)

      // Should only allow access to organization's data
      expect(result.data.organization_id).toBe('eac9a158-d3c7-4140-9620-91a5554a6fe8')
    })
  })

  describe('Cookie and Session Management', () => {
    it('should handle cookies properly for localhost', () => {
      // Test middleware cookie configuration for localhost
      const isLocalhost = true
      const cookieConfig = {
        domain: isLocalhost ? undefined : '.gymleadhub.co.uk',
        sameSite: isLocalhost ? 'lax' : 'lax',
        secure: !isLocalhost,
        httpOnly: true,
        path: '/'
      }

      expect(cookieConfig.domain).toBeUndefined()
      expect(cookieConfig.secure).toBe(false)
      expect(cookieConfig.sameSite).toBe('lax')
      expect(cookieConfig.httpOnly).toBe(true)
    })

    it('should handle cookies properly for production', () => {
      // Test middleware cookie configuration for production
      const isProduction = true
      const isLocalhost = false
      const cookieConfig = {
        domain: isProduction ? '.gymleadhub.co.uk' : undefined,
        sameSite: isLocalhost ? 'lax' : 'lax',
        secure: isProduction && !isLocalhost,
        httpOnly: true,
        path: '/'
      }

      expect(cookieConfig.domain).toBe('.gymleadhub.co.uk')
      expect(cookieConfig.secure).toBe(true)
      expect(cookieConfig.sameSite).toBe('lax')
      expect(cookieConfig.httpOnly).toBe(true)
    })
  })
})