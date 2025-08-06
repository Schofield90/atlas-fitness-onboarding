import { createClient } from '@/app/lib/supabase/client'

export async function getCurrentUserOrganization() {
  const supabase = createClient()
  
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error('No authenticated user found', userError)
      return { organizationId: null, error: 'No authenticated user', organization: null }
    }
    
    // Get user's organization
    const { data: userOrg, error: orgError } = await supabase
      .from('user_organizations')
      .select('organization_id, organizations!inner(*)')
      .eq('user_id', user.id)
      .single()
    
    if (orgError || !userOrg) {
      console.error('No organization found for user', orgError)
      return { organizationId: null, error: 'No organization found', organization: null }
    }
    
    return { 
      organizationId: userOrg.organization_id, 
      error: null,
      organization: userOrg.organizations
    }
  } catch (error) {
    console.error('Error getting user organization:', error)
    return { organizationId: null, error: 'Failed to get organization', organization: null }
  }
}