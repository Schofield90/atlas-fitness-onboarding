import { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "../supabase/admin";

export interface UserRole {
  userId: string;
  organizationId?: string;
  role?: "owner" | "admin" | "manager" | "staff" | "member";
  isSuperAdmin: boolean;
  isGymOwner: boolean;
  isClient: boolean;
  organizationName?: string;
}

/**
 * Get comprehensive user role information from database
 * This replaces the hardcoded email checks
 */
export async function getUserRole(
  userId: string,
  supabase: SupabaseClient,
): Promise<UserRole | null> {
  if (!userId) return null;

  try {
    // Get all role information in parallel
    const [superAdminResult, orgStaffResult, orgOwnerResult, clientResult] =
      await Promise.all([
        // Check super admin status
        supabase
          .from("super_admin_users")
          .select("id")
          .eq("user_id", userId)
          .eq("is_active", true)
          .single(),

        // Check organization staff status (new structure)
        supabase
          .from("user_organizations")
          .select(
            `
          organization_id,
          role,
          organizations!inner(name, is_active)
        `,
          )
          .eq("user_id", userId)
          .single(),

        // Check if user owns an organization
        supabase
          .from("organizations")
          .select("id, name, is_active")
          .eq("owner_id", userId)
          .single(),

        // Check if user is a client
        supabase
          .from("clients")
          .select("id, organization_id")
          .eq("user_id", userId)
          .single(),
      ]);

    // Build the role object
    const role: UserRole = {
      userId,
      isSuperAdmin: !!superAdminResult.data,
      isGymOwner: !!orgOwnerResult.data || !!orgStaffResult.data,
      isClient: !!clientResult.data,
    };

    // Set organization details
    if (orgOwnerResult.data) {
      role.organizationId = orgOwnerResult.data.id;
      role.organizationName = orgOwnerResult.data.name;
      role.role = "owner";
    } else if (orgStaffResult.data) {
      role.organizationId = orgStaffResult.data.organization_id;
      role.organizationName = (orgStaffResult.data as any).organizations?.name;
      role.role = orgStaffResult.data.role as any;
    } else if (clientResult.data) {
      role.organizationId = clientResult.data.organization_id;
      role.role = "member";
    }

    return role;
  } catch (error) {
    console.error("Error fetching user role:", error);
    return null;
  }
}

/**
 * Validate that a user belongs to a specific organization
 */
export async function validateOrganizationMembership(
  userId: string,
  organizationId: string,
  supabase: SupabaseClient,
): Promise<boolean> {
  if (!userId || !organizationId) return false;

  // Check if user owns the organization
  const { data: owner } = await supabase
    .from("organizations")
    .select("id")
    .eq("owner_id", userId)
    .eq("id", organizationId)
    .single();

  if (owner) return true;

  // Check if user is staff in the organization
  const { data: staff } = await supabase
    .from("user_organizations")
    .select("user_id")
    .eq("user_id", userId)
    .eq("organization_id", organizationId)
    .single();

  if (staff) return true;

  // Check if user is a client in the organization
  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("user_id", userId)
    .eq("organization_id", organizationId)
    .single();

  return !!client;
}

/**
 * Get user's organization with validation
 */
export async function getUserOrganization(
  userId: string,
  supabase: SupabaseClient,
): Promise<{ id: string; name: string; role: string } | null> {
  if (!userId) return null;

  // First check if user owns an organization
  const { data: ownedOrg } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("owner_id", userId)
    .eq("is_active", true)
    .single();

  if (ownedOrg) {
    return {
      id: ownedOrg.id,
      name: ownedOrg.name,
      role: "owner",
    };
  }

  // Then check staff membership
  const { data: staffOrg } = await supabase
    .from("user_organizations")
    .select(
      `
      organization_id,
      role,
      organizations!inner(name, is_active)
    `,
    )
    .eq("user_id", userId)
    .single();

  if (staffOrg && (staffOrg as any).organizations?.is_active) {
    return {
      id: staffOrg.organization_id,
      name: (staffOrg as any).organizations.name,
      role: staffOrg.role,
    };
  }

  return null;
}

/**
 * Check if an organization is active and valid
 */
export async function validateOrganizationStatus(
  organizationId: string,
  supabase: SupabaseClient,
): Promise<{ valid: boolean; reason?: string }> {
  if (!organizationId) {
    return { valid: false, reason: "No organization ID provided" };
  }

  const { data: org } = await supabase
    .from("organizations")
    .select("is_active, subscription_status")
    .eq("id", organizationId)
    .single();

  if (!org) {
    return { valid: false, reason: "Organization not found" };
  }

  if (!org.is_active) {
    return { valid: false, reason: "Organization is inactive" };
  }

  if (
    org.subscription_status === "suspended" ||
    org.subscription_status === "cancelled"
  ) {
    return {
      valid: false,
      reason: `Organization subscription ${org.subscription_status}`,
    };
  }

  return { valid: true };
}

/**
 * Set RLS context for the current session
 * This ensures all database queries respect organization boundaries
 */
export async function setRLSContext(
  userId: string,
  organizationId: string,
  role: string,
): Promise<void> {
  const adminSupabase = createAdminClient();

  // Set PostgreSQL session variables for RLS
  // These will be used by RLS policies to filter data
  try {
    await adminSupabase.rpc("set_auth_context", {
      p_user_id: userId,
      p_org_id: organizationId,
      p_user_role: role,
    });
  } catch (error) {
    // If the function doesn't exist yet, log but don't fail
    console.warn("Could not set RLS context:", error);
  }
}
