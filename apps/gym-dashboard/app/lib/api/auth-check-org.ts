import { createClient } from '@/app/lib/supabase/server'
import { NextResponse } from 'next/server'

export class AuthError extends Error {
  constructor(message: string, public statusCode: number = 401) {
    super(message)
    this.name = 'AuthError'
  }
}

export interface AuthenticatedUser {
  id: string
  email?: string
  organizationId: string
}

/**
 * Check if the current request has a valid Supabase session and get organization info
 * @returns The authenticated user with organization info
 * @throws {AuthError} If no valid session exists or no organization found
 */
export async function requireAuthWithOrg(): Promise<AuthenticatedUser> {
  const supabase = await createClient()
  
  // Get the current user session
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    throw new AuthError('You must be logged in to access this resource', 401)
  }
  
  // Get the user's organization
  // First, check if there's a direct user-organization relationship
  const { data: userOrg, error: orgError } = await supabase
    .from('user_organizations')
    .select('organization_id')
    .eq('user_id', user.id)
    .single()
  
  if (orgError || !userOrg) {
    // Fallback: Check if user has an organization in their metadata
    const organizationId = user.user_metadata?.organization_id
    
    if (!organizationId) {
      throw new AuthError('No organization found for this user', 403)
    }
    
    return {
      id: user.id,
      email: user.email,
      organizationId: organizationId
    }
  }
  
  return {
    id: user.id,
    email: user.email,
    organizationId: userOrg.organization_id
  }
}

/**
 * Get the current user session with organization without throwing an error
 * @returns The user object with organization or null if not authenticated
 */
export async function getUserWithOrg(): Promise<AuthenticatedUser | null> {
  try {
    return await requireAuthWithOrg()
  } catch (error) {
    return null
  }
}

/**
 * Check if the user has a specific role or permission in their organization
 * @param permission The permission to check for
 * @returns True if the user has the permission, false otherwise
 */
export async function hasOrgPermission(permission: string): Promise<boolean> {
  const user = await getUserWithOrg()
  
  if (!user) {
    return false
  }
  
  const supabase = await createClient()
  
  // Check user's role in the organization
  const { data: userRole } = await supabase
    .from('organization_members')
    .select('role')
    .eq('user_id', user.id)
    .eq('organization_id', user.organizationId)
    .single()
  
  if (!userRole) {
    return false
  }
  
  // Define role permissions (customize based on your needs)
  const rolePermissions: Record<string, string[]> = {
    'owner': ['*'], // All permissions
    'admin': ['manage_users', 'manage_leads', 'manage_clients', 'view_reports', 'manage_settings'],
    'staff': ['manage_leads', 'manage_clients', 'view_reports'],
    'viewer': ['view_reports']
  }
  
  const permissions = rolePermissions[userRole.role] || []
  
  return permissions.includes('*') || permissions.includes(permission)
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
  
  // Log the error for debugging (but don't expose internal details)
  console.error('API Error:', error)
  
  return NextResponse.json(
    { 
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'development' ? message : 'An error occurred'
    },
    { status: statusCode }
  )
}