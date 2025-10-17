import { createClient } from './supabase/server'

export async function getCurrentUserOrganization() {
  const supabase = await createClient()
  
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return { organizationId: null, error: 'Not authenticated' }
    }

    // Get user's organization from user_organizations table
    const { data: userOrg, error: userOrgError } = await supabase
      .from('user_organizations')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    if (userOrgError || !userOrg?.organization_id) {
      console.error('No organization found in user_organizations:', userOrgError)
      
      // Use default Atlas Fitness organization as fallback
      const defaultOrgId = '63589490-8f55-4157-bd3a-e141594b748e'
      
      // Check if this organization exists
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('id')
        .eq('id', defaultOrgId)
        .single()

      if (orgError || !orgData) {
        return { organizationId: null, error: 'No organization found' }
      }

      // Create user_organizations entry with default org
      await supabase
        .from('user_organizations')
        .insert({
          user_id: user.id,
          organization_id: defaultOrgId,
          role: 'member'
        })
        .select()

      return { organizationId: defaultOrgId, error: null }
    }

    return { organizationId: userOrg.organization_id, error: null }
  } catch (error: unknown) {
    console.error('Error getting organization:', error)
    return { organizationId: null, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

export async function requireAuth() {
  const { organizationId, error } = await getCurrentUserOrganization()
  
  if (error || !organizationId) {
    throw new Error(error || 'Authentication required')
  }
  
  return { organizationId }
}

// Alias function for compatibility
export async function getOrganization() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('Not authenticated')
  }
  
  const { organizationId, error } = await getCurrentUserOrganization()
  
  if (error || !organizationId) {
    throw new Error(error || 'No organization found')
  }
  
  const { data: organization } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', organizationId)
    .single()
    
  return { organization, user }
}