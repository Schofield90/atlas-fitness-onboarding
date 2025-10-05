import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { NextResponse } from "next/server";
import {
  AuthenticationError,
  AuthorizationError,
  MultiTenantError,
  DatabaseError,
  handleApiError,
} from "@/app/lib/errors";

// Keep old AuthError for backward compatibility
export class AuthError extends AuthenticationError {
  constructor(
    message: string,
    public statusCode: number = 401,
  ) {
    super(message, "legacy", undefined, { legacyError: true });
    this.name = "AuthError";
    this.statusCode = statusCode;
  }
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  organizationId: string;
  role?: string;
}

// Cache for organization lookups to reduce database queries
const orgCache = new Map<
  string,
  { organizationId: string; role?: string; timestamp: number }
>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Security event logging
interface SecurityEvent {
  event: string;
  userId?: string;
  organizationId?: string;
  details?: any;
}

function logSecurityEvent(event: SecurityEvent) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level: "security",
    ...event,
  };

  console.warn("SECURITY EVENT:", logEntry);

  // In production, send to security monitoring service
  if (
    process.env.NODE_ENV === "production" &&
    process.env.SECURITY_WEBHOOK_URL
  ) {
    fetch(process.env.SECURITY_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(logEntry),
    }).catch((err) => console.error("Failed to send security event:", err));
  }
}

// Function to clear cache for a specific user
export function clearUserCache(userId: string) {
  orgCache.delete(userId);
}

/**
 * Check if the current request has a valid Supabase session and return user with organization
 * @returns The authenticated user object with organization info
 * @throws {AuthError} If no valid session exists or no organization found
 */
export async function requireAuth(): Promise<AuthenticatedUser> {
  console.log("[requireAuth] Starting authentication check");
  const supabase = await createClient();

  // Get the current user session
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  console.log("[requireAuth] Got user:", {
    userId: user?.id,
    email: user?.email,
    error: error?.message,
  });

  if (error || !user) {
    // Log security event for failed authentication
    logSecurityEvent({
      event: "AUTH_FAILED",
      userId: user?.id || "unknown",
      details: { error: error?.message || "No user session" },
    });

    console.error("[requireAuth] Authentication failed - no user or error");
    throw AuthenticationError.invalidCredentials("session", {
      supabaseError: error?.message,
      hasUser: !!user,
    });
  }

  // Check cache first
  const cached = orgCache.get(user.id);
  console.log("[requireAuth] Cache check:", {
    cached: !!cached,
    expired: cached ? Date.now() - cached.timestamp >= CACHE_TTL : null,
  });
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log("[requireAuth] Returning cached org:", cached.organizationId);
    return {
      id: user.id,
      email: user.email!,
      organizationId: cached.organizationId,
      role: cached.role,
    };
  }

  // Get user's organization - try multiple sources with improved security validation
  console.log("[requireAuth] Creating admin client to fetch organization");
  const adminClient = createAdminClient();

  // First check user_organizations table (primary source)
  console.log("[requireAuth] Querying user_organizations for user:", user.id);
  const { data: userOrgData, error: userOrgError } = await adminClient
    .from("user_organizations")
    .select("organization_id, role")
    .eq("user_id", user.id)
    .single();

  console.log("[requireAuth] user_organizations result:", {
    found: !!userOrgData,
    orgId: userOrgData?.organization_id,
    role: userOrgData?.role,
    error: userOrgError?.message,
  });

  let organizationId = userOrgData?.organization_id;
  let role = userOrgData?.role;

  // If not found, check organization_members table as fallback
  if (!organizationId) {
    console.log(
      "[requireAuth] Not found in user_organizations, checking organization_members",
    );
    const { data: memberData, error: memberError } = await adminClient
      .from("organization_members")
      .select("organization_id, role")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    console.log("[requireAuth] organization_members result:", {
      found: !!memberData,
      orgId: memberData?.organization_id,
      role: memberData?.role,
      error: memberError?.message,
    });

    if (memberData?.organization_id) {
      organizationId = memberData.organization_id;
      role = memberData.role || role;
    }
  }

  // SECURITY: Validate organization exists and is active before auto-assignment
  if (!organizationId) {
    const defaultOrgId = "63589490-8f55-4157-bd3a-e141594b748e";

    // Verify default organization exists and is active
    const { data: orgData } = await adminClient
      .from("organizations")
      .select("id, subscription_status")
      .eq("id", defaultOrgId)
      .or("subscription_status.eq.active,subscription_status.eq.trialing")
      .single();

    if (orgData) {
      organizationId = defaultOrgId;
      role = "member"; // Default to member, not owner for security

      // Log security event for auto-assignment
      logSecurityEvent({
        event: "AUTO_ORG_ASSIGNMENT",
        userId: user.id,
        organizationId,
        details: { assignedRole: role },
      });

      // Try to create the association
      await adminClient.from("user_organizations").upsert(
        {
          user_id: user.id,
          organization_id: organizationId,
          role: role,
        },
        {
          onConflict: "user_id",
        },
      );

      console.log(
        "Created default organization association for user:",
        user.id,
      );
    }
  }

  if (!organizationId) {
    // Log security event for missing organization
    logSecurityEvent({
      event: "MISSING_ORGANIZATION",
      userId: user.id,
      details: { email: user.email },
    });

    throw MultiTenantError.missingOrganization({
      userId: user.id,
      email: user.email,
      userData: null,
    });
  }

  // SECURITY: Validate organization is active
  const { data: orgStatus, error: orgError } = await adminClient
    .from("organizations")
    .select("subscription_status")
    .eq("id", organizationId)
    .single();

  console.log("Organization status check:", {
    organizationId,
    orgStatus,
    orgError,
  });

  if (orgError) {
    console.error("Error fetching organization status:", orgError);
    logSecurityEvent({
      event: "ORGANIZATION_LOOKUP_ERROR",
      userId: user.id,
      organizationId,
      details: { error: orgError.message },
    });
  }

  // Allow if no organization record (for backward compatibility) or if subscription status is active or trialing
  const isValidOrg =
    !orgError &&
    orgStatus &&
    (orgStatus.subscription_status === "active" ||
      orgStatus.subscription_status === "trialing" ||
      !orgStatus.subscription_status);

  // For development, allow organizations that don't have a subscription_status column or are missing
  // This provides backward compatibility while the schema is being updated
  if (orgError && orgError.code === "42703") {
    console.log(
      "Organizations table missing subscription_status column - allowing for backward compatibility",
    );
  } else if (
    orgError ||
    (orgStatus &&
      orgStatus.subscription_status &&
      orgStatus.subscription_status !== "active" &&
      orgStatus.subscription_status !== "trialing")
  ) {
    logSecurityEvent({
      event: "INACTIVE_ORGANIZATION_ACCESS",
      userId: user.id,
      organizationId,
      details: {
        subscription_status: orgStatus?.subscription_status || "not_found",
        error: orgError?.message || "Organization check failed",
      },
    });

    throw MultiTenantError.inactiveOrganization({
      organizationId,
      status: orgStatus?.subscription_status || "not_found",
    });
  }

  // Cache the result
  orgCache.set(user.id, {
    organizationId: organizationId,
    role: role,
    timestamp: Date.now(),
  });

  return {
    id: user.id,
    email: user.email!,
    organizationId: organizationId,
    role: role,
  };
}

/**
 * Get the current user session without throwing an error
 * @returns The user object with organization or null if not authenticated
 */
export async function getUser(): Promise<AuthenticatedUser | null> {
  try {
    return await requireAuth();
  } catch (error) {
    return null;
  }
}

/**
 * Check if the user has a specific role or permission
 * @param permission The permission to check for
 * @returns True if the user has the permission, false otherwise
 */
export async function hasPermission(permission: string): Promise<boolean> {
  const user = await getUser();

  if (!user) {
    return false;
  }

  // Define role permissions (customize based on your needs)
  const rolePermissions: Record<string, string[]> = {
    owner: ["*"], // All permissions
    admin: [
      "manage_users",
      "manage_leads",
      "manage_clients",
      "view_reports",
      "manage_settings",
      "manage_bookings",
    ],
    staff: [
      "manage_leads",
      "manage_clients",
      "view_reports",
      "manage_bookings",
    ],
    viewer: ["view_reports"],
  };

  const permissions = rolePermissions[user.role || "viewer"] || [];

  return permissions.includes("*") || permissions.includes(permission);
}

/**
 * SECURE: Build Supabase query with organization_id filter
 * This ensures all database queries are automatically filtered by organization
 * @param tableName The table to query
 * @param supabase The Supabase client
 * @param select Optional select clause
 * @returns Query builder with organization_id filter applied
 */
export async function buildSecureQuery<T>(
  tableName: string,
  supabase: any,
  select?: string,
): Promise<any> {
  const user = await requireAuth();

  return supabase
    .from(tableName)
    .select(select || "*")
    .eq("organization_id", user.organizationId);
}

/**
 * SECURE: Execute query with automatic organization filtering
 * @param tableName The table to query
 * @param supabase The Supabase client
 * @param select Optional select clause
 * @returns Query result with organization filtering
 */
export async function executeSecureQuery<T>(
  tableName: string,
  supabase: any,
  select?: string,
): Promise<{ data: T[] | null; error: any; user: AuthenticatedUser }> {
  const user = await requireAuth();

  const { data, error } = await supabase
    .from(tableName)
    .select(select || "*")
    .eq("organization_id", user.organizationId);

  return { data, error, user };
}

/**
 * SECURE: Insert data with automatic organization_id
 * @param tableName The table to insert into
 * @param supabase The Supabase client
 * @param data The data to insert (organization_id will be automatically added)
 * @returns Insert result
 */
export async function executeSecureInsert<T>(
  tableName: string,
  supabase: any,
  data: any,
): Promise<{ data: T | null; error: any; user: AuthenticatedUser }> {
  const user = await requireAuth();

  const insertData = {
    ...data,
    organization_id: user.organizationId,
  };

  const { data: result, error } = await supabase
    .from(tableName)
    .insert(insertData)
    .select()
    .single();

  return { data: result, error, user };
}

/**
 * SECURE: Update data with organization verification
 * @param tableName The table to update
 * @param supabase The Supabase client
 * @param id The record ID to update
 * @param data The data to update
 * @returns Update result
 */
export async function executeSecureUpdate<T>(
  tableName: string,
  supabase: any,
  id: string,
  data: any,
): Promise<{ data: T | null; error: any; user: AuthenticatedUser }> {
  const user = await requireAuth();

  // Remove organization_id from update data to prevent tampering
  const { organization_id, ...updateData } = data;

  const { data: result, error } = await supabase
    .from(tableName)
    .update(updateData)
    .eq("id", id)
    .eq("organization_id", user.organizationId) // Ensure organization ownership
    .select()
    .single();

  return { data: result, error, user };
}

/**
 * SECURE: Delete data with organization verification
 * @param tableName The table to delete from
 * @param supabase The Supabase client
 * @param id The record ID to delete
 * @returns Delete result
 */
export async function executeSecureDelete(
  tableName: string,
  supabase: any,
  id: string,
): Promise<{ error: any; user: AuthenticatedUser }> {
  const user = await requireAuth();

  const { error } = await supabase
    .from(tableName)
    .delete()
    .eq("id", id)
    .eq("organization_id", user.organizationId); // Ensure organization ownership

  return { error, user };
}

/**
 * Helper function to create a standardized error response
 * @param error The error object or message
 * @param statusCode The HTTP status code
 * @returns NextResponse with error details
 * @deprecated Use handleApiError from @/app/lib/errors instead
 */
export function createErrorResponse(error: unknown, statusCode: number = 500) {
  // For backward compatibility, convert to new error handling
  return handleApiError(error, undefined, { endpoint: "legacy_auth_check" });
}
