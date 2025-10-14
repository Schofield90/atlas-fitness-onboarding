import { createClient } from '@/app/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * Super admin email addresses that have full platform access
 */
const SUPER_ADMIN_EMAILS = [
  'sam@gymleadhub.co.uk',
];

/**
 * Check if email is a super admin
 */
export function isSuperAdmin(email: string | undefined): boolean {
  if (!email) return false;
  return SUPER_ADMIN_EMAILS.includes(email.toLowerCase());
}

/**
 * Require authentication for SAAS admin routes
 * Super admins do NOT need organization membership
 *
 * @returns User object if authenticated as super admin
 * @throws 401 if not authenticated, 403 if not super admin
 */
export async function requireSuperAdmin() {
  const supabase = await createClient();

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error('Unauthorized - Please log in');
  }

  // Check if user is super admin
  if (!isSuperAdmin(user.email)) {
    throw new Error('Forbidden - Super admin access required');
  }

  return user;
}

/**
 * Require authentication and return organization context
 * For super admins: organization can be passed as parameter
 * For regular users: organization comes from their membership
 *
 * @param organizationId Optional org ID (required for super admins)
 * @returns User and organization ID
 */
export async function requireAuthWithOptionalOrg(organizationId?: string) {
  const supabase = await createClient();

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error('Unauthorized - Please log in');
  }

  // Super admins must provide organization ID
  if (isSuperAdmin(user.email)) {
    if (!organizationId) {
      throw new Error('Organization ID required for super admin operations');
    }

    return {
      user,
      organizationId,
      isSuperAdmin: true,
    };
  }

  // Regular users: get their organization
  const { data: userOrg } = await supabase
    .from('user_organizations')
    .select('organization_id')
    .eq('user_id', user.id)
    .single();

  if (!userOrg) {
    // Check if they own an org
    const { data: ownedOrg } = await supabase
      .from('organizations')
      .select('id')
      .eq('owner_id', user.id)
      .single();

    if (ownedOrg) {
      return {
        user,
        organizationId: ownedOrg.id,
        isSuperAdmin: false,
      };
    }

    // Check staff table
    const { data: staffOrg } = await supabase
      .from('organization_staff')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (staffOrg) {
      return {
        user,
        organizationId: staffOrg.organization_id,
        isSuperAdmin: false,
      };
    }

    throw new Error('No organization found for this user');
  }

  return {
    user,
    organizationId: userOrg.organization_id,
    isSuperAdmin: false,
  };
}
