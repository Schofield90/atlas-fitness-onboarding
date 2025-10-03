import { SupabaseClient } from "@supabase/supabase-js";

export type Portal = "admin" | "login" | "members";
export type UserType = "super_admin" | "gym_owner" | "gym_member" | "unknown";

export interface PortalValidationResult {
  allowed: boolean;
  reason?: string;
  userType: UserType;
  suggestedRedirect?: string;
}

/**
 * Check if a user is a gym owner (owns an organization or is staff)
 */
export async function checkIfGymOwner(
  userId: string,
  supabase: SupabaseClient,
): Promise<boolean> {
  if (!userId) return false;

  // Check if user owns an organization
  const { data: ownedOrg } = await supabase
    .from("organizations")
    .select("id")
    .eq("owner_id", userId)
    .single();

  if (ownedOrg) return true;

  // Check if user is staff in an organization
  const { data: staffRole } = await supabase
    .from("user_organizations")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["owner", "admin", "manager", "staff"])
    .single();

  return !!staffRole;
}

/**
 * Check if a user is a client/member
 */
export async function checkIfClient(
  userId: string,
  supabase: SupabaseClient,
): Promise<boolean> {
  if (!userId) return false;

  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("user_id", userId)
    .single();

  return !!client;
}

/**
 * Check if a user is a super admin
 */
export async function checkIfSuperAdmin(
  userId: string,
  supabase: SupabaseClient,
): Promise<boolean> {
  if (!userId) return false;

  const { data: superAdmin } = await supabase
    .from("super_admin_users")
    .select("id")
    .eq("user_id", userId)
    .eq("is_active", true)
    .single();

  return !!superAdmin;
}

/**
 * Determine user type based on their roles
 */
export async function getUserType(
  userId: string,
  supabase: SupabaseClient,
): Promise<UserType> {
  const [isSuperAdmin, isGymOwner, isClient] = await Promise.all([
    checkIfSuperAdmin(userId, supabase),
    checkIfGymOwner(userId, supabase),
    checkIfClient(userId, supabase),
  ]);

  // Priority order: super_admin > gym_owner > gym_member
  if (isSuperAdmin) return "super_admin";
  if (isGymOwner) return "gym_owner";
  if (isClient) return "gym_member";
  return "unknown";
}

/**
 * Validate if a user can access a specific portal
 */
export async function validateUserPortalAccess(
  portal: Portal,
  userId: string,
  supabase: SupabaseClient,
): Promise<PortalValidationResult> {
  const userType = await getUserType(userId, supabase);

  switch (portal) {
    case "admin":
      // Only super admins can access admin portal
      if (userType === "super_admin") {
        return { allowed: true, userType };
      }
      return {
        allowed: false,
        userType,
        reason: "Admin portal requires super admin privileges",
        suggestedRedirect:
          userType === "gym_owner" ? "/dashboard" : "/simple-login",
      };

    case "login":
      // Gym owners portal - only for gym owners/staff
      if (userType === "gym_owner" || userType === "super_admin") {
        return { allowed: true, userType };
      }
      return {
        allowed: false,
        userType,
        reason: "This portal is for gym owners and staff only",
        suggestedRedirect:
          userType === "gym_member" ? "/client/dashboard" : "/owner-login",
      };

    case "members":
      // Members portal - ONLY for gym members, NOT for gym owners
      if (userType === "gym_member") {
        return { allowed: true, userType };
      }

      // Explicitly block gym owners and super admins
      if (userType === "gym_owner" || userType === "super_admin") {
        return {
          allowed: false,
          userType,
          reason:
            "This portal is for gym members only. Gym owners should use login.gymleadhub.co.uk",
          suggestedRedirect: "/owner-login",
        };
      }

      return {
        allowed: false,
        userType,
        reason:
          "No member account found. Please contact your gym to be added as a member.",
        suggestedRedirect: "/simple-login",
      };

    default:
      return {
        allowed: false,
        userType,
        reason: "Invalid portal",
      };
  }
}

/**
 * Get the appropriate login page for a portal
 */
export function getPortalLoginPage(portal: Portal): string {
  switch (portal) {
    case "admin":
      return "/signin";
    case "login":
      return "/owner-login";
    case "members":
      return "/simple-login";
    default:
      return "/";
  }
}

/**
 * Get the appropriate dashboard for a user type
 */
export function getUserDashboard(userType: UserType): string {
  switch (userType) {
    case "super_admin":
      return "/admin";
    case "gym_owner":
      return "/dashboard";
    case "gym_member":
      return "/client/dashboard";
    default:
      return "/";
  }
}
