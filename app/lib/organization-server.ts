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
      
      // Try to get organization by owner as fallback
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('id')
        .eq('owner_id', user.id)
        .single()

      if (orgError || !orgData) {
        return { organizationId: null, error: 'No organization found' }
      }

      // Create user_organizations entry if they own an org but don't have the entry
      await supabase
        .from('user_organizations')
        .insert({
          user_id: user.id,
          organization_id: orgData.id,
          role: 'owner'
        })

      return { organizationId: orgData.id, error: null }
    }

    return { organizationId: userOrg.organization_id, error: null }
  } catch (error: any) {
    console.error('Error getting organization:', error)
    return { organizationId: null, error: error.message }
  }
}

export async function requireAuth() {
  const { organizationId, error } = await getCurrentUserOrganization()
  
  if (error || !organizationId) {
    throw new Error(error || 'Authentication required')
  }
  
  return { organizationId }
}