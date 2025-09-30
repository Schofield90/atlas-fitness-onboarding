import { NextRequest, NextResponse } from "next/server";
import { createMiddlewareClient } from "@/app/lib/supabase/middleware";

export type UserRole =
  | "superadmin"
  | "owner"
  | "coach"
  | "member"
  | "anonymous";
export type Portal = "admin" | "owner" | "member";

export interface AuthClaims {
  user_id?: string;
  email?: string;
  role: UserRole;
  tenant_id?: string;
  portal?: Portal;
}

// Map subdomains to required roles
const PORTAL_ROLES: Record<Portal, UserRole[]> = {
  admin: ["superadmin"],
  owner: ["owner", "coach", "superadmin"],
  member: ["member"],
};

// Superadmin emails (should move to env var)
const SUPERADMIN_EMAILS = ["sam@gymleadhub.co.uk"];

/**
 * Extract subdomain from hostname
 */
export function extractSubdomain(hostname: string): Portal | null {
  // Handle localhost for development
  if (hostname.includes("localhost")) {
    const parts = hostname.split(".");
    if (parts.length > 1 && parts[0] !== "www") {
      return parts[0] as Portal;
    }
    // Default to owner for localhost without subdomain
    return "owner";
  }

  // Handle production domains
  if (hostname.includes("gymleadhub.co.uk")) {
    const parts = hostname.split(".");
    if (parts.length > 2 && parts[0] !== "www") {
      const subdomain = parts[0];
      // Map 'login' subdomain to 'owner' portal
      if (subdomain === "login") return "owner";
      if (subdomain === "members") return "member";
      return subdomain as Portal;
    }
  }

  // Handle Vercel preview deployments - default to owner portal
  if (hostname.includes("vercel.app")) {
    return "owner";
  }

  return null;
}

/**
 * Get auth claims from request
 */
export async function getAuthClaims(
  request: NextRequest,
  response: NextResponse,
): Promise<AuthClaims> {
  try {
    const supabase = createMiddlewareClient(request, response);
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      return { role: "anonymous" };
    }

    // Check if superadmin
    if (SUPERADMIN_EMAILS.includes(session.user.email || "")) {
      return {
        user_id: session.user.id,
        email: session.user.email,
        role: "superadmin",
      };
    }

    // Check user_organizations for owner/coach roles
    const { data: staffRole } = await supabase
      .from("user_organizations")
      .select("organization_id, role")
      .eq("user_id", session.user.id)
      .single();

    if (staffRole) {
      return {
        user_id: session.user.id,
        email: session.user.email,
        role: staffRole.role === "owner" ? "owner" : "coach",
        tenant_id: staffRole.organization_id,
      };
    }

    // Check if user owns an organization
    const { data: ownedOrg } = await supabase
      .from("organizations")
      .select("id")
      .eq("owner_id", session.user.id)
      .single();

    if (ownedOrg) {
      return {
        user_id: session.user.id,
        email: session.user.email,
        role: "owner",
        tenant_id: ownedOrg.id,
      };
    }

    // Check if user is a client/member
    const { data: client } = await supabase
      .from("clients")
      .select("id, organization_id")
      .eq("user_id", session.user.id)
      .single();

    if (client) {
      return {
        user_id: session.user.id,
        email: session.user.email,
        role: "member",
        tenant_id: client.organization_id,
      };
    }

    // Default to member role for authenticated users without specific roles
    return {
      user_id: session.user.id,
      email: session.user.email,
      role: "member",
    };
  } catch (error) {
    console.error("Error getting auth claims:", error);
    return { role: "anonymous" };
  }
}

/**
 * Check if user role is allowed for the portal
 */
export function isRoleAllowedForPortal(
  role: UserRole,
  portal: Portal,
): boolean {
  const allowedRoles = PORTAL_ROLES[portal];
  return allowedRoles.includes(role);
}

/**
 * Assert role for subdomain - returns 404 response if not allowed
 */
export function assertRoleForSubdomain(
  claims: AuthClaims,
  portal: Portal,
  pathname: string,
): NextResponse | null {
  // Allow public routes
  const publicPaths = [
    "/auth/callback",
    "/api/auth",
    "/api/webhooks",
    "/_next",
    "/favicon.ico",
  ];

  if (publicPaths.some((path) => pathname.startsWith(path))) {
    return null;
  }

  // Allow login/signup routes
  const authPaths = [
    "/login",
    "/owner-login",
    "/signin",
    "/signup",
    "/simple-login",
  ];
  if (
    authPaths.some(
      (path) => pathname === path || pathname.startsWith(path + "/"),
    )
  ) {
    return null;
  }

  // Check role permissions
  if (!isRoleAllowedForPortal(claims.role, portal)) {
    // Return 404 instead of 401 to not reveal existence of resources
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return null;
}

/**
 * Get cookie name for portal
 */
export function getCookieName(portal: Portal): string {
  const cookieNames: Record<Portal, string> = {
    admin: "admin_session",
    owner: "owner_session",
    member: "member_session",
  };
  return cookieNames[portal];
}

/**
 * Get cookie options for portal
 */
export function getCookieOptions(portal: Portal, hostname: string) {
  const isProduction = hostname.includes("gymleadhub.co.uk");

  const domain = isProduction
    ? portal === "admin"
      ? ".admin.gymleadhub.co.uk"
      : portal === "member"
        ? ".members.gymleadhub.co.uk"
        : ".login.gymleadhub.co.uk"
    : undefined;

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict" as const,
    path: "/",
    domain,
    maxAge: 60 * 60 * 24 * 7, // 7 days
  };
}
