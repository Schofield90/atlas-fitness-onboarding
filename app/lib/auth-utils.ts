import { createClient } from './supabase/server';
import { cookies } from 'next/headers';

export async function getOrganizationAndUser() {
  const supabase = await createClient();
  
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return { organization: null, user: null, error: 'Not authenticated' };
    }

    // Get user's organization from user_organizations table
    const { data: userOrg, error: userOrgError } = await supabase
      .from('user_organizations')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (userOrgError || !userOrg?.organization_id) {
      console.error('No organization found in user_organizations:', userOrgError);
      
      // Try to get organization by owner as fallback
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('owner_id', user.id)
        .single();

      if (orgError || !orgData) {
        return { organization: null, user, error: 'No organization found' };
      }

      // Create user_organizations entry if they own an org but don't have the entry
      await supabase
        .from('user_organizations')
        .insert({
          user_id: user.id,
          organization_id: orgData.id,
          role: 'owner'
        });

      return { organization: orgData, user, error: null };
    }

    // Get the full organization data
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', userOrg.organization_id)
      .single();

    if (orgError || !organization) {
      return { organization: null, user, error: 'Organization not found' };
    }

    return { organization, user, error: null };
  } catch (error: any) {
    console.error('Error getting organization and user:', error);
    return { organization: null, user: null, error: error.message };
  }
}

export async function requireAuth() {
  const { organization, user, error } = await getOrganizationAndUser();
  
  if (error || !organization || !user) {
    throw new Error(error || 'Authentication required');
  }
  
  return { organization, user };
}

export async function getOrganizationId() {
  const { organization, error } = await getOrganizationAndUser();
  
  if (error || !organization) {
    throw new Error(error || 'No organization found');
  }
  
  return organization.id;
}

export async function getUserRole(organizationId: string, userId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('user_organizations')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .single();
    
  if (error || !data) {
    return null;
  }
  
  return data.role;
}

export async function hasPermission(permission: string) {
  const { organization, user } = await getOrganizationAndUser();
  
  if (!organization || !user) {
    return false;
  }
  
  const role = await getUserRole(organization.id, user.id);
  
  // Simple role-based permissions
  const rolePermissions: Record<string, string[]> = {
    owner: ['*'], // All permissions
    admin: ['read', 'write', 'delete', 'manage_staff', 'manage_billing'],
    manager: ['read', 'write', 'manage_staff'],
    staff: ['read', 'write'],
    viewer: ['read']
  };
  
  const permissions = rolePermissions[role || 'viewer'] || [];
  
  return permissions.includes('*') || permissions.includes(permission);
}