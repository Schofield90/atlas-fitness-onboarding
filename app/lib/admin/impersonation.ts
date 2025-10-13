/**
 * Admin Impersonation System
 * Just-In-Time elevation with audit logging
 * SOC 2 compliant with least-privilege principles
 */

import { createClient } from "@/app/lib/supabase/server";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { nanoid } from "nanoid";

const IMPERSONATION_SECRET = new TextEncoder().encode(
  process.env.IMPERSONATION_SECRET || "dev-secret-change-in-production",
);

const MAX_IMPERSONATION_DURATION = 30 * 60 * 1000; // 30 minutes
const DEFAULT_IMPERSONATION_DURATION = 15 * 60 * 1000; // 15 minutes

export interface ImpersonationToken {
  jti: string; // JWT ID for revocation
  sub: string; // Admin user ID
  org: string; // Target organization ID
  scope: "read" | "write";
  reason: string;
  iat: number;
  exp: number;
  adminEmail?: string;
  orgName?: string;
}

export interface ImpersonationRequest {
  organizationId: string;
  scope?: "read" | "write";
  reason: string;
  durationMinutes?: number;
}

export interface ImpersonationSession {
  token: string;
  expiresAt: Date;
  organizationId: string;
  organizationName: string;
  scope: "read" | "write";
  reason: string;
}

/**
 * Start an impersonation session
 * Creates a time-boxed, scoped token with full audit logging
 */
export async function startImpersonation(
  request: ImpersonationRequest,
): Promise<{
  success: boolean;
  session?: ImpersonationSession;
  error?: string;
}> {
  try {
    const supabase = await createClient();

    // 1. Verify admin user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Unauthorized" };
    }

    // 2. Check admin permissions
    const { data: adminUser, error: adminError } = await supabase
      .from("super_admin_users")
      .select("id, role")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    if (adminError || !adminUser) {
      await logSecurityEvent("IMPERSONATION_DENIED", user.id, {
        reason: "Not an admin user",
        organizationId: request.organizationId,
      });
      return { success: false, error: "Insufficient privileges" };
    }

    // 3. Validate target organization
    const { data: organization, error: orgError } = await supabase
      .from("organizations")
      .select("id, name")
      .eq("id", request.organizationId)
      .single();

    if (orgError || !organization) {
      return { success: false, error: "Organization not found" };
    }

    // 4. Calculate expiration
    const durationMs = Math.min(
      (request.durationMinutes || 15) * 60 * 1000,
      MAX_IMPERSONATION_DURATION,
    );
    const expiresAt = new Date(Date.now() + durationMs);

    // 5. Create access record in database
    const { data: accessRecord, error: accessError } = await supabase
      .from("admin_organization_access")
      .insert({
        admin_user_id: adminUser.id,
        organization_id: request.organizationId,
        access_level: request.scope || "read",
        reason: request.reason,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (accessError) {
      console.error("Failed to create access record:", accessError);
      return { success: false, error: "Failed to grant access" };
    }

    // 6. Create JWT token
    const token = await new SignJWT({
      jti: accessRecord.id,
      sub: user.id,
      org: request.organizationId,
      scope: request.scope || "read",
      reason: request.reason,
      adminEmail: user.email,
      orgName: organization.name,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(expiresAt)
      .sign(IMPERSONATION_SECRET);

    // 7. Log the impersonation start
    await supabase.from("admin_activity_logs").insert({
      admin_user_id: adminUser.id,
      action_type: "IMPERSONATION_START",
      target_organization_id: request.organizationId,
      action_details: {
        scope: request.scope || "read",
        reason: request.reason,
        duration_minutes: request.durationMinutes || 15,
        expires_at: expiresAt.toISOString(),
      },
    });

    // 8. Set secure cookie
    const cookieStore = await cookies();
    cookieStore.set("admin-impersonation", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: expiresAt,
      path: "/",
    });

    return {
      success: true,
      session: {
        token,
        expiresAt,
        organizationId: request.organizationId,
        organizationName: organization.name,
        scope: request.scope || "read",
        reason: request.reason,
      },
    };
  } catch (error) {
    console.error("Impersonation error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to start impersonation",
    };
  }
}

/**
 * Stop an active impersonation session
 */
export async function stopImpersonation(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin-impersonation")?.value;

    if (!token) {
      return { success: true }; // Already stopped
    }

    const supabase = await createClient();

    // Verify and decode token
    const { payload } = await jwtVerify(token, IMPERSONATION_SECRET);
    const impersonation = payload as unknown as ImpersonationToken;

    // Get admin user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const { data: adminUser } = await supabase
      .from("super_admin_users")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (adminUser) {
      // Revoke the access record
      await supabase
        .from("admin_organization_access")
        .update({
          revoked_at: new Date().toISOString(),
          revoked_by: adminUser.id,
          revoke_reason: "Manual stop",
        })
        .eq("id", impersonation.jti);

      // Log the stop
      await supabase.from("admin_activity_logs").insert({
        admin_user_id: adminUser.id,
        action_type: "IMPERSONATION_STOP",
        target_organization_id: impersonation.org,
        action_details: {
          session_id: impersonation.jti,
          duration_seconds: Math.floor(
            (Date.now() - impersonation.iat * 1000) / 1000,
          ),
        },
      });
    }

    // Clear cookie
    cookieStore.delete("admin-impersonation");

    return { success: true };
  } catch (error) {
    console.error("Stop impersonation error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to stop impersonation",
    };
  }
}

/**
 * Get current impersonation session
 */
export async function getImpersonationSession(): Promise<ImpersonationToken | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin-impersonation")?.value;

    if (!token) {
      return null;
    }

    const { payload } = await jwtVerify(token, IMPERSONATION_SECRET);
    const impersonation = payload as unknown as ImpersonationToken;

    // Check if still valid in database
    const supabase = await createClient();
    const { data: access } = await supabase
      .from("admin_organization_access")
      .select("is_active")
      .eq("id", impersonation.jti)
      .single();

    if (!access?.is_active) {
      // Session revoked or expired
      cookieStore.delete("admin-impersonation");
      return null;
    }

    return impersonation;
  } catch (error) {
    // Invalid or expired token
    const cookieStore = await cookies();
    cookieStore.delete("admin-impersonation");
    return null;
  }
}

/**
 * Check if current request has required impersonation scope
 */
export async function requireImpersonationScope(
  requiredScope: "read" | "write",
): Promise<{ allowed: boolean; session?: ImpersonationToken; error?: string }> {
  const session = await getImpersonationSession();

  if (!session) {
    return { allowed: false, error: "No active impersonation session" };
  }

  if (requiredScope === "write" && session.scope === "read") {
    // Log attempted privilege escalation
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await logSecurityEvent("IMPERSONATION_SCOPE_DENIED", user.id, {
        required: requiredScope,
        current: session.scope,
        organization: session.org,
      });
    }

    return { allowed: false, error: "Insufficient impersonation scope" };
  }

  return { allowed: true, session };
}

/**
 * Log security events for audit trail
 */
async function logSecurityEvent(
  event: string,
  userId: string,
  details: Record<string, any>,
): Promise<void> {
  try {
    const supabase = await createClient();

    const { data: adminUser } = await supabase
      .from("super_admin_users")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (adminUser) {
      await supabase.from("admin_activity_logs").insert({
        admin_user_id: adminUser.id,
        action_type: event,
        action_details: details,
      });
    }
  } catch (error) {
    console.error("Failed to log security event:", error);
  }
}

/**
 * Middleware to check admin access
 */
export async function requireAdminAccess(): Promise<{
  isAdmin: boolean;
  adminUser?: any;
  error?: string;
}> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      console.error("Auth error in requireAdminAccess:", authError);
      return { isAdmin: false, error: "Auth error: " + authError.message };
    }

    if (!user) {
      console.error("No user found in requireAdminAccess");
      return { isAdmin: false, error: "No user session" };
    }

    console.log(
      "Checking admin access for user:",
      user.email,
      "with ID:",
      user.id,
    );

    const { data: staffUser, error: staffError } = await supabase
      .from("staff")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (staffError) {
      console.error("Staff lookup error:", staffError);
      return {
        isAdmin: false,
        error: "Staff lookup failed: " + staffError.message,
      };
    }

    if (!staffUser) {
      console.error("User is not staff:", user.email);
      return { isAdmin: false, error: "Not a staff user" };
    }

    // Check if user has superadmin role in metadata
    const role = staffUser.metadata?.role;
    const isActive = staffUser.metadata?.is_active;

    if (role !== "superadmin" || !isActive) {
      console.error("User does not have superadmin role:", user.email);
      return { isAdmin: false, error: "Not a superadmin user" };
    }

    console.log("Admin access granted for:", user.email, "with role:", role);
    return { isAdmin: true, adminUser: { ...staffUser, role } };
  } catch (error) {
    console.error("Unexpected error in requireAdminAccess:", error);
    return { isAdmin: false, error: "Unexpected error" };
  }
}

/**
 * Get organization context for impersonated requests
 */
export async function getOrganizationContext(): Promise<{
  organizationId: string | null;
  isImpersonating: boolean;
  scope?: "read" | "write";
}> {
  const session = await getImpersonationSession();

  if (session) {
    return {
      organizationId: session.org,
      isImpersonating: true,
      scope: session.scope,
    };
  }

  // Regular user context
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { organizationId: null, isImpersonating: false };
  }

  const { data: userOrg } = await supabase
    .from("user_organizations")
    .select("organization_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  return {
    organizationId: userOrg?.organization_id || null,
    isImpersonating: false,
  };
}
