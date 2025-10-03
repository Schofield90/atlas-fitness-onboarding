import { createClient } from "@/app/lib/supabase/server";
import { redirect } from "next/navigation";
import { ReactNode } from "react";

interface SuperAdminGuardProps {
  children: ReactNode;
  fallbackUrl?: string;
}

/**
 * Server Component that enforces super admin authentication
 * Must be used at the page level for admin routes
 */
export async function SuperAdminGuard({
  children,
  fallbackUrl = "/dashboard",
}: SuperAdminGuardProps) {
  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/owner-login?error=unauthorized");
  }

  // Check super admin status
  const { data: superAdmin, error: adminError } = await supabase
    .from("super_admin_users")
    .select("id, is_active")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (adminError || !superAdmin) {
    console.warn(
      `Unauthorized super admin access attempt by user: ${user.email}`,
    );

    // Log security event
    await supabase.from("security_audit_log").insert({
      event_type: "UNAUTHORIZED_SUPER_ADMIN_ACCESS",
      user_id: user.id,
      details: {
        email: user.email,
        attempted_route: "super_admin_protected",
        timestamp: new Date().toISOString(),
      },
    });

    redirect(fallbackUrl);
  }

  // User is authenticated and authorized
  return <>{children}</>;
}
