import { createClient } from './supabase/client'

export async function getCurrentUserOrganization() {
  const supabase = createClient()
  
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return { organizationId: null, error: 'Not authenticated' }
    }

    // Get user's organization from organization_staff
    const { data: staffData, error: staffError } = await supabase
      .from('organization_staff')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    if (staffError || !staffData) {
      // Try to get organization by owner
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('id')
        .eq('owner_id', user.id)
        .single()

      if (orgError || !orgData) {
        return { organizationId: null, error: 'No organization found' }
      }

      return { organizationId: orgData.id, error: null }
    }

    return { organizationId: staffData.organization_id, error: null }
  } catch (error: any) {
    console.error('Error getting organization:', error)
    return { organizationId: null, error: error.message }
  }
}