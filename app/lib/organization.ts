import { createClient } from '@/app/lib/supabase/server'
import { createAdminClient } from '@/app/lib/supabase/admin'
import { NextRequest } from 'next/server'

export interface Organization {
  id: string
  name: string
  subdomain?: string
  plan: string
  status: string
}

export interface UserOrganization {
  organization_id: string
  organization: Organization
  role: string
  is_active: boolean
}

/**
 * Get the current organization context for a user
 * Tries multiple methods to determine which organization the user is working with
 */
export async function getCurrentOrganization(
  request: NextRequest,
  userId: string
): Promise<string | null> {
  const supabase = await createClient()
  
  // Method 1: From X-Organization-ID header
  const orgHeader = request.headers.get('x-organization-id')
  if (orgHeader) {
    // Verify user has access to this organization
    const { data: membership } = await supabase
      .from('user_organizations')
      .select('organization_id')
      .eq('user_id', userId)
      .eq('organization_id', orgHeader)
      .eq('is_active', true)
      .single()
    
    if (membership) return orgHeader
  }
  
  // Method 2: From subdomain
  const host = request.headers.get('host')
  if (host) {
    const subdomain = host.split('.')[0]
    if (subdomain !== 'www' && subdomain !== 'app' && subdomain !== 'atlas-fitness-onboarding') {
      const { data: org } = await supabase
        .from('organizations')
        .select('id')
        .eq('subdomain', subdomain)
        .single()
      
      if (org) {
        // Verify user has access
        const { data: membership } = await supabase
          .from('user_organizations')
          .select('organization_id')
          .eq('user_id', userId)
          .eq('organization_id', org.id)
          .eq('is_active', true)
          .single()
        
        if (membership) return org.id
      }
    }
  }
  
  // Method 3: Get user's first/default organization
  const { data: membership } = await supabase
    .from('user_organizations')
    .select('organization_id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at')
    .limit(1)
    .single()
  
  return membership?.organization_id || null
}

/**
 * Get all organizations for a user
 */
export async function getUserOrganizations(userId: string): Promise<UserOrganization[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('user_organizations')
    .select(`
      organization_id,
      role,
      is_active,
      organization:organizations!inner(
        id,
        name,
        subdomain,
        plan,
        status
      )
    `)
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at')
  
  if (error) {
    console.error('Error fetching user organizations:', error)
    return []
  }
  
  // Transform the data to match UserOrganization interface
  const transformedData: UserOrganization[] = (data || []).map(item => ({
    organization_id: item.organization_id,
    role: item.role,
    is_active: item.is_active,
    organization: item.organization as Organization
  }))
  
  return transformedData
}

/**
 * Verify user has access to an organization
 */
export async function verifyOrganizationAccess(
  userId: string,
  organizationId: string,
  requiredRole?: string
): Promise<boolean> {
  const supabase = await createClient()
  
  const query = supabase
    .from('user_organizations')
    .select('role')
    .eq('user_id', userId)
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .single()
  
  const { data, error } = await query
  
  if (error || !data) return false
  
  // If no specific role required, any membership is sufficient
  if (!requiredRole) return true
  
  // Check role hierarchy
  const roleHierarchy = ['owner', 'admin', 'member', 'staff']
  const userRoleIndex = roleHierarchy.indexOf(data.role)
  const requiredRoleIndex = roleHierarchy.indexOf(requiredRole)
  
  return userRoleIndex >= 0 && userRoleIndex <= requiredRoleIndex
}

/**
 * Create organization context middleware for API routes
 */
export async function withOrganizationContext(
  request: NextRequest,
  handler: (req: NextRequest, context: { organizationId: string; userId: string }) => Promise<Response>
): Promise<Response> {
  const supabase = await createClient()
  
  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    })
  }
  
  // Get organization context
  const organizationId = await getCurrentOrganization(request, user.id)
  if (!organizationId) {
    return new Response(JSON.stringify({ error: 'No organization context' }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }
  
  // Call handler with context
  return handler(request, { organizationId, userId: user.id })
}