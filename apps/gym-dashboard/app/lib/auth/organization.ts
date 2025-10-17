/**
 * Multi-tenant organization utilities
 * CRITICAL: Always use these functions to get organization context
 * NEVER hard-code organization IDs
 */

import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { cache } from "react";

/**
 * Get the current authenticated user
 * @returns User object or null if not authenticated
 */
export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

/**
 * Get the current user's organization ID from the database
 * This is the PRIMARY method for getting organization context
 *
 * @param userId - Optional user ID, defaults to current authenticated user
 * @returns Organization ID for the user
 * @throws Error if no organization found
 */
export async function getUserOrganization(userId?: string): Promise<string> {
  const supabase = await createClient();

  // Get current user if no userId provided
  if (!userId) {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) {
      throw new Error("Not authenticated");
    }
    userId = user.id;
  }

  // Try multiple tables in order of preference
  // 1. First try user_organizations table (primary source)
  const { data: userOrg } = await supabase
    .from("user_organizations")
    .select("organization_id")
    .eq("user_id", userId)
    .single();

  if (userOrg?.organization_id) {
    return userOrg.organization_id;
  }

  // 2. Try organization_members table (legacy)
  const { data: memberOrg } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId)
    .eq("is_active", true)
    .single();

  if (memberOrg?.organization_id) {
    return memberOrg.organization_id;
  }

  // 3. Try users table (if it has organization_id)
  const { data: userProfile } = await supabase
    .from("users")
    .select("organization_id")
    .eq("id", userId)
    .single();

  if (userProfile?.organization_id) {
    return userProfile.organization_id;
  }

  // If no organization found, throw error
  // NEVER return a default organization ID
  throw new Error(`No organization found for user ${userId}`);
}

/**
 * Get organization with caching for performance
 * Use this in React Server Components
 */
export const getCachedUserOrganization = cache(getUserOrganization);

/**
 * Verify a user has access to a specific organization
 * Use this for authorization checks
 */
export async function userHasOrgAccess(
  userId: string,
  organizationId: string,
): Promise<boolean> {
  try {
    const userOrgId = await getUserOrganization(userId);
    return userOrgId === organizationId;
  } catch {
    return false;
  }
}

/**
 * Get organization details
 */
export async function getOrganization(organizationId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", organizationId)
    .single();

  if (error) {
    throw new Error(`Organization not found: ${organizationId}`);
  }

  return data;
}

/**
 * Create organization association for a user
 * Only use this during user onboarding
 */
export async function createUserOrganization(
  userId: string,
  organizationId: string,
  role: string = "member",
) {
  const adminClient = createAdminClient();

  // Use upsert to handle existing records
  const { data, error } = await adminClient
    .from("user_organizations")
    .upsert(
      {
        user_id: userId,
        organization_id: organizationId,
        role: role,
        is_active: true,
      },
      {
        onConflict: "user_id",
      },
    )
    .select()
    .single();

  if (error) {
    throw new Error(
      `Failed to create organization association: ${error.message}`,
    );
  }

  return data;
}

/**
 * Helper for API routes - gets organization and validates in one call
 */
export async function requireOrgAccess() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error("Not authenticated");
  }

  const organizationId = await getUserOrganization(user.id);

  return {
    userId: user.id,
    organizationId,
    userEmail: user.email,
  };
}

/**
 * DEPRECATED: This function exists only for migration purposes
 * DO NOT USE IN NEW CODE
 * @deprecated Use getUserOrganization() instead
 */
export function getDefaultOrganizationId(): never {
  throw new Error(
    "getDefaultOrganizationId() is deprecated and must not be used. " +
      "Use getUserOrganization() to get the user's actual organization. " +
      "Hard-coded organization IDs are forbidden in multi-tenant applications.",
  );
}
