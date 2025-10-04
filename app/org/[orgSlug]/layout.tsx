import { ReactNode } from "react";

/**
 * Layout for path-based multi-tenant routes: /org/[orgSlug]/...
 *
 * Access verification is handled by middleware which:
 * 1. Checks if user is authenticated
 * 2. Verifies user has access to the organization slug
 * 3. Sets x-organization-id header for downstream use
 *
 * If verification fails, middleware redirects to /dashboard or /login
 * So if this layout renders, the user has valid access.
 */
export default function OrgLayout({ children }: { children: ReactNode }) {
  // Middleware has already verified access
  // Just render children
  return <>{children}</>;
}
