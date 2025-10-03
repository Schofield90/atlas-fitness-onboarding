import { createClient } from "@/app/lib/supabase/server";
import { redirect } from "next/navigation";
import { ReactNode } from "react";

interface OrganizationGuardProps {
  children: ReactNode;
  requiredRole?: "owner" | "admin" | "staff" | "member";
  fallbackUrl?: string;
}

/**
 * Server Component that enforces organization membership and role-based access
 */
export async function OrganizationGuard({
  children,
  requiredRole,
  fallbackUrl = "/onboarding/create-organization",
}: OrganizationGuardProps) {
  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/owner-login?error=unauthorized");
  }

  // Check organization membership
  const { data: orgMembership, error: orgError } = await supabase
    .from("organization_staff")
    .select("organization_id, role")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (orgError || !orgMembership) {
    // User doesn't belong to any organization
    redirect(fallbackUrl);
  }

  // Check role requirements if specified
  if (requiredRole) {
    const roleHierarchy = {
      owner: 4,
      admin: 3,
      staff: 2,
      member: 1,
    };

    const userRoleLevel =
      roleHierarchy[orgMembership.role as keyof typeof roleHierarchy] || 0;
    const requiredRoleLevel = roleHierarchy[requiredRole] || 0;

    if (userRoleLevel < requiredRoleLevel) {
      console.warn(
        `Insufficient permissions: User ${user.email} with role ${orgMembership.role} attempted to access ${requiredRole}-only content`,
      );

      // Log security event
      await supabase.from("security_audit_log").insert({
        event_type: "INSUFFICIENT_PERMISSIONS",
        user_id: user.id,
        organization_id: orgMembership.organization_id,
        details: {
          user_role: orgMembership.role,
          required_role: requiredRole,
          timestamp: new Date().toISOString(),
        },
      });

      redirect("/dashboard?error=insufficient_permissions");
    }
  }

  // User is authenticated and authorized
  return <>{children}</>;
}

/**
 * Hook to get organization context in server components
 */
export async function getOrganizationContext() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: orgMembership } = await supabase
    .from("organization_staff")
    .select(
      `
      organization_id,
      role,
      organizations (
        id,
        name,
        slug,
        subscription_status,
        subscription_plan_id
      )
    `,
    )
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  return orgMembership;
}
