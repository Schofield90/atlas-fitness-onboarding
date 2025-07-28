import { createClient } from '@/app/lib/supabase/server'
import { createAdminClient } from '@/app/lib/supabase/admin'
import { NextResponse } from 'next/server'

export class AuthError extends Error {
  constructor(message: string, public statusCode: number = 401) {
    super(message)
    this.name = 'AuthError'
  }
}

export interface AuthenticatedUser {
  id: string
  email: string
  organizationId: string
  role?: string
}

// Cache for organization lookups to reduce database queries
const orgCache = new Map<string, { organizationId: string; role?: string; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

// Function to clear cache for a specific user
export function clearUserCache(userId: string) {
  orgCache.delete(userId)
}

/**
 * Check if the current request has a valid Supabase session and return user with organization
 * @returns The authenticated user object with organization info
 * @throws {AuthError} If no valid session exists or no organization found
 */
export async function requireAuth(): Promise<AuthenticatedUser> {
  const supabase = await createClient()
  
  // Get the current user session
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    throw new AuthError('You must be logged in to access this resource', 401)
  }
  
  // Check cache first
  const cached = orgCache.get(user.id)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return {
      id: user.id,
      email: user.email!,
      organizationId: cached.organizationId,
      role: cached.role
    }
  }
  
  // Get user's organization from the users table using admin client to bypass RLS
  const adminClient = createAdminClient()
  const { data: userData, error: userError } = await adminClient
    .from('users')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()
  
  if (userError || !userData || !userData.organization_id) {
    // Log the error for debugging
    console.error('Failed to get user organization:', {
      userId: user.id,
      error: userError,
      userData
    })
    throw new AuthError('No organization found for this user', 403)
  }
  
  // Cache the result
  orgCache.set(user.id, {
    organizationId: userData.organization_id,
    role: userData.role,
    timestamp: Date.now()
  })
  
  return {
    id: user.id,
    email: user.email!,
    organizationId: userData.organization_id,
    role: userData.role
  }
}

/**
 * Get the current user session without throwing an error
 * @returns The user object with organization or null if not authenticated
 */
export async function getUser(): Promise<AuthenticatedUser | null> {
  try {
    return await requireAuth()
  } catch (error) {
    return null
  }
}

/**
 * Check if the user has a specific role or permission
 * @param permission The permission to check for
 * @returns True if the user has the permission, false otherwise
 */
export async function hasPermission(permission: string): Promise<boolean> {
  const user = await getUser()
  
  if (!user) {
    return false
  }
  
  // TODO: Implement role-based access control
  // For now, all authenticated users have all permissions
  return true
}

/**
 * Helper function to create a standardized error response
 * @param error The error object or message
 * @param statusCode The HTTP status code
 * @returns NextResponse with error details
 */
export function createErrorResponse(error: unknown, statusCode: number = 500) {
  if (error instanceof AuthError) {
    return NextResponse.json(
      { 
        error: 'Unauthorized',
        message: error.message 
      },
      { status: error.statusCode }
    )
  }
  
  const message = error instanceof Error ? error.message : 'An unexpected error occurred'
  
  return NextResponse.json(
    { 
      error: 'Internal Server Error',
      message 
    },
    { status: statusCode }
  )
}