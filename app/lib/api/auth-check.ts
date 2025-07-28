import { createClient } from '@/app/lib/supabase/server'
import { NextResponse } from 'next/server'

export class AuthError extends Error {
  constructor(message: string, public statusCode: number = 401) {
    super(message)
    this.name = 'AuthError'
  }
}

/**
 * Check if the current request has a valid Supabase session
 * @returns The authenticated user object
 * @throws {AuthError} If no valid session exists
 */
export async function requireAuth() {
  const supabase = await createClient()
  
  // Get the current user session
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    throw new AuthError('You must be logged in to access this resource', 401)
  }
  
  return user
}

/**
 * Get the current user session without throwing an error
 * @returns The user object or null if not authenticated
 */
export async function getUser() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  return user
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