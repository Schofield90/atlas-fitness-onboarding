import { createClient } from '@/app/lib/supabase/server'
import { createAdminClient } from '@/app/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { 
  AuthenticationError, 
  AuthorizationError, 
  MultiTenantError,
  DatabaseError,
  handleApiError 
} from '@/app/lib/errors'

// Keep old AuthError for backward compatibility
export class AuthError extends AuthenticationError {
  constructor(message: string, public statusCode: number = 401) {
    super(message, 'legacy', undefined, { legacyError: true })
    this.name = 'AuthError'
    this.statusCode = statusCode
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
    throw AuthenticationError.invalidCredentials('session', {
      supabaseError: error?.message,
      hasUser: !!user
    })
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
    
    if (userError) {
      throw DatabaseError.queryError('users', 'select', {
        userId: user.id,
        originalError: userError.message,
        code: userError.code
      })
    }
    
    throw MultiTenantError.missingOrganization({
      userId: user.id,
      email: user.email,
      userData
    })
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
  
  // Define role permissions (customize based on your needs)
  const rolePermissions: Record<string, string[]> = {
    'owner': ['*'], // All permissions
    'admin': ['manage_users', 'manage_leads', 'manage_clients', 'view_reports', 'manage_settings', 'manage_bookings'],
    'staff': ['manage_leads', 'manage_clients', 'view_reports', 'manage_bookings'],
    'viewer': ['view_reports']
  }
  
  const permissions = rolePermissions[user.role || 'viewer'] || []
  
  return permissions.includes('*') || permissions.includes(permission)
}

/**
 * SECURE: Build Supabase query with organization_id filter
 * This ensures all database queries are automatically filtered by organization
 * @param tableName The table to query
 * @param supabase The Supabase client
 * @param select Optional select clause
 * @returns Query builder with organization_id filter applied
 */
export async function buildSecureQuery<T>(
  tableName: string, 
  supabase: any, 
  select?: string
): Promise<any> {
  const user = await requireAuth()
  
  return supabase
    .from(tableName)
    .select(select || '*')
    .eq('organization_id', user.organizationId)
}

/**
 * SECURE: Execute query with automatic organization filtering
 * @param tableName The table to query
 * @param supabase The Supabase client  
 * @param select Optional select clause
 * @returns Query result with organization filtering
 */
export async function executeSecureQuery<T>(
  tableName: string,
  supabase: any,
  select?: string
): Promise<{ data: T[] | null; error: any; user: AuthenticatedUser }> {
  const user = await requireAuth()
  
  const { data, error } = await supabase
    .from(tableName)
    .select(select || '*')
    .eq('organization_id', user.organizationId)
  
  return { data, error, user }
}

/**
 * SECURE: Insert data with automatic organization_id
 * @param tableName The table to insert into
 * @param supabase The Supabase client
 * @param data The data to insert (organization_id will be automatically added)
 * @returns Insert result
 */
export async function executeSecureInsert<T>(
  tableName: string,
  supabase: any,
  data: any
): Promise<{ data: T | null; error: any; user: AuthenticatedUser }> {
  const user = await requireAuth()
  
  const insertData = {
    ...data,
    organization_id: user.organizationId
  }
  
  const { data: result, error } = await supabase
    .from(tableName)
    .insert(insertData)
    .select()
    .single()
  
  return { data: result, error, user }
}

/**
 * SECURE: Update data with organization verification
 * @param tableName The table to update
 * @param supabase The Supabase client
 * @param id The record ID to update
 * @param data The data to update
 * @returns Update result
 */
export async function executeSecureUpdate<T>(
  tableName: string,
  supabase: any,
  id: string,
  data: any
): Promise<{ data: T | null; error: any; user: AuthenticatedUser }> {
  const user = await requireAuth()
  
  // Remove organization_id from update data to prevent tampering
  const { organization_id, ...updateData } = data
  
  const { data: result, error } = await supabase
    .from(tableName)
    .update(updateData)
    .eq('id', id)
    .eq('organization_id', user.organizationId) // Ensure organization ownership
    .select()
    .single()
  
  return { data: result, error, user }
}

/**
 * SECURE: Delete data with organization verification
 * @param tableName The table to delete from
 * @param supabase The Supabase client
 * @param id The record ID to delete
 * @returns Delete result
 */
export async function executeSecureDelete(
  tableName: string,
  supabase: any,
  id: string
): Promise<{ error: any; user: AuthenticatedUser }> {
  const user = await requireAuth()
  
  const { error } = await supabase
    .from(tableName)
    .delete()
    .eq('id', id)
    .eq('organization_id', user.organizationId) // Ensure organization ownership
  
  return { error, user }
}

/**
 * Helper function to create a standardized error response
 * @param error The error object or message
 * @param statusCode The HTTP status code
 * @returns NextResponse with error details
 * @deprecated Use handleApiError from @/app/lib/errors instead
 */
export function createErrorResponse(error: unknown, statusCode: number = 500) {
  // For backward compatibility, convert to new error handling
  return handleApiError(error, undefined, { endpoint: 'legacy_auth_check' })
}