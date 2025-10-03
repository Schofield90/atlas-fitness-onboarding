/**
 * Domain-aware redirect utilities for multi-tenant authentication
 */

export type UserRole = "admin" | "owner" | "staff" | "client" | "member";
export type SubdomainType = "admin" | "login" | "members";

/**
 * Extract subdomain from hostname
 */
export function extractSubdomain(hostname: string): SubdomainType | null {
  // Handle localhost for development
  if (hostname.includes("localhost")) {
    const parts = hostname.split(".");
    if (parts.length > 1 && parts[0] !== "www") {
      return parts[0] as SubdomainType;
    }
    return null;
  }

  // Handle production domains
  if (hostname.includes("gymleadhub.co.uk")) {
    const parts = hostname.split(".");
    if (parts.length > 2 && parts[0] !== "www") {
      return parts[0] as SubdomainType;
    }
  }

  return null;
}

/**
 * Get the correct dashboard URL for a user based on their role and current domain
 */
export function getDashboardUrlForRole(
  role: UserRole,
  currentHostname?: string,
): string {
  const subdomain = currentHostname ? extractSubdomain(currentHostname) : null;

  switch (role) {
    case "admin":
      // Admin users go to admin dashboard on admin subdomain
      if (subdomain === "admin") {
        return "/dashboard";
      }
      // Redirect to admin subdomain
      return getDomainUrl("admin", currentHostname) + "/dashboard";

    case "owner":
      // Owners use admin subdomain
      if (subdomain === "admin") {
        return "/dashboard";
      }
      // Redirect to admin subdomain
      return getDomainUrl("admin", currentHostname) + "/dashboard";

    case "staff":
      // Staff users go to staff dashboard on login subdomain
      if (subdomain === "login") {
        return "/dashboard";
      }
      // Redirect to login subdomain
      return getDomainUrl("login", currentHostname) + "/dashboard";

    case "client":
    case "member":
      // Members go to client dashboard on members subdomain
      if (subdomain === "members") {
        return "/client/dashboard";
      }
      // Redirect to members subdomain
      return getDomainUrl("members", currentHostname) + "/client/dashboard";

    default:
      return "/dashboard";
  }
}

/**
 * Get the correct login URL based on user type and current domain
 */
export function getLoginUrlForUserType(
  userType: "admin" | "owner" | "client",
  currentHostname?: string,
): string {
  switch (userType) {
    case "admin":
      return getDomainUrl("admin", currentHostname) + "/admin/login";

    case "owner":
      return getDomainUrl("login", currentHostname) + "/owner-login";

    case "client":
      return getDomainUrl("members", currentHostname) + "/simple-login";

    default:
      return "/simple-login";
  }
}

/**
 * Build a full domain URL for a specific subdomain
 */
export function getDomainUrl(
  subdomain: SubdomainType,
  currentHostname?: string,
): string {
  if (!currentHostname) {
    if (typeof window !== "undefined") {
      currentHostname = window.location.hostname;
    } else {
      // Fallback for server-side
      return `https://${subdomain}.gymleadhub.co.uk`;
    }
  }

  // Handle localhost for development
  if (currentHostname.includes("localhost")) {
    const port = currentHostname.includes(":")
      ? currentHostname.split(":")[1]
      : "3000";
    return `http://${subdomain}.localhost:${port}`;
  }

  // Handle production domains
  if (currentHostname.includes("gymleadhub.co.uk")) {
    return `https://${subdomain}.gymleadhub.co.uk`;
  }

  // Handle Vercel preview deployments
  if (currentHostname.includes("vercel.app")) {
    // For Vercel, we can't use subdomains, so return current URL
    return `https://${currentHostname}`;
  }

  // Fallback
  return `https://${subdomain}.gymleadhub.co.uk`;
}

/**
 * Determine if we should redirect to a different domain based on user role and current subdomain
 */
export function shouldRedirectToDifferentDomain(
  userRole: UserRole,
  currentSubdomain: SubdomainType | null,
): { shouldRedirect: boolean; targetDomain?: string; targetPath?: string } {
  // Admin and Owner users should be on admin subdomain
  if (
    (userRole === "admin" || userRole === "owner") &&
    currentSubdomain !== "admin"
  ) {
    return {
      shouldRedirect: true,
      targetDomain: "admin",
      targetPath: "/dashboard",
    };
  }

  // Staff should be on login subdomain
  if (userRole === "staff" && currentSubdomain !== "login") {
    return {
      shouldRedirect: true,
      targetDomain: "login",
      targetPath: "/dashboard",
    };
  }

  // Clients and members should be on members subdomain
  if (
    (userRole === "client" || userRole === "member") &&
    currentSubdomain !== "members"
  ) {
    return {
      shouldRedirect: true,
      targetDomain: "members",
      targetPath: "/client/dashboard",
    };
  }

  return { shouldRedirect: false };
}

/**
 * Get the appropriate login URL based on current domain
 */
export function getLoginUrlForDomain(currentHostname?: string): string {
  const subdomain = extractSubdomain(currentHostname || "");

  switch (subdomain) {
    case "admin":
      return "/owner-login";
    case "login":
      return "/staff-login";
    case "members":
      return "/simple-login";
    default:
      // Default to owner login if no subdomain
      return "/owner-login";
  }
}

/**
 * Determine user role from current domain context
 */
export function getRoleFromDomain(hostname?: string): UserRole | null {
  const subdomain = extractSubdomain(hostname || "");

  switch (subdomain) {
    case "admin":
      return "owner"; // Admin subdomain is for owners/admins
    case "login":
      return "staff";
    case "members":
      return "member";
    default:
      return null;
  }
}

/**
 * Get the appropriate redirect URL after successful authentication
 * This preserves domain context and ensures users land in the right place
 */
export function getPostAuthRedirectUrl(
  userRole: UserRole,
  currentHostname?: string,
  requestedRedirect?: string,
): string {
  const subdomain = currentHostname ? extractSubdomain(currentHostname) : null;

  // If there's a requested redirect and it's safe, use it
  if (
    requestedRedirect &&
    !requestedRedirect.includes("auth") &&
    !requestedRedirect.includes("login")
  ) {
    // But ensure it's on the right domain
    const redirectCheck = shouldRedirectToDifferentDomain(userRole, subdomain);
    if (redirectCheck.shouldRedirect && redirectCheck.targetDomain) {
      return (
        getDomainUrl(
          redirectCheck.targetDomain as SubdomainType,
          currentHostname,
        ) + requestedRedirect
      );
    }
    return requestedRedirect;
  }

  // Check if we need to redirect to a different domain
  const redirectCheck = shouldRedirectToDifferentDomain(userRole, subdomain);

  if (
    redirectCheck.shouldRedirect &&
    redirectCheck.targetDomain &&
    redirectCheck.targetPath
  ) {
    return (
      getDomainUrl(
        redirectCheck.targetDomain as SubdomainType,
        currentHostname,
      ) + redirectCheck.targetPath
    );
  }

  // Stay on current domain but get the right dashboard path
  return getDashboardUrlForRole(userRole, currentHostname);
}
