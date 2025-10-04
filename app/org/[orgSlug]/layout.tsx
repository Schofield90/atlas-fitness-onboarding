import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";

const SUPER_ADMIN_EMAIL = "sam@gymleadhub.co.uk";

export default async function OrgLayout({
  children,
  params,
}: {
  children: React.Node;
  params: { orgSlug: string };
}) {
  const supabase = createClient();

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/owner-login");
  }

  // Check if user is super admin (bypass access checks)
  const isSuperAdmin = user.email?.toLowerCase() === SUPER_ADMIN_EMAIL;

  // Get organization by slug
  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .select("id, name, slug, owner_id")
    .eq("slug", params.orgSlug)
    .single();

  if (orgError || !org) {
    // Organization not found
    redirect("/dashboard");
  }

  // Verify user has access to this organization (unless super admin)
  if (!isSuperAdmin) {
    const { data: accessData } = await supabase.rpc(
      "verify_org_access_by_slug",
      {
        p_slug: params.orgSlug,
        p_user_id: user.id,
      },
    );

    const hasAccess = accessData?.[0]?.has_access;

    if (!hasAccess) {
      // User doesn't have access to this organization
      redirect("/dashboard");
    }
  }

  // User has access - render children with organization context
  // The middleware has already set x-organization-id header
  return <>{children}</>;
}
