import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { blockInProduction } from "../production-check";

// Force dynamic rendering
export const dynamic = "force-dynamic";

export async function GET() {
  // Block in production
  const productionBlock = blockInProduction();
  if (productionBlock) return productionBlock;
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();

    // Get current user from session
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({
        status: "unauthenticated",
        error: authError?.message || "No user session",
      });
    }

    // Check user_organizations
    const { data: userOrg, error: userOrgError } = await adminClient
      .from("user_organizations")
      .select("organization_id, role")
      .eq("user_id", user.id)
      .single();

    // Check organization_members
    const { data: orgMember, error: orgMemberError } = await adminClient
      .from("organization_members")
      .select("organization_id, role, is_active")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    // Check if organization exists
    let orgData = null;
    if (userOrg?.organization_id || orgMember?.organization_id) {
      const orgId = userOrg?.organization_id || orgMember?.organization_id;
      const { data, error: orgError } = await adminClient
        .from("organizations")
        .select("id, name, slug, subscription_status")
        .eq("id", orgId)
        .single();

      orgData = data || null;
    }

    return NextResponse.json({
      status: "authenticated",
      user: {
        id: user.id,
        email: user.email,
      },
      user_organizations: {
        found: !!userOrg,
        data: userOrg,
        error: userOrgError?.message,
      },
      organization_members: {
        found: !!orgMember,
        data: orgMember,
        error: orgMemberError?.message,
      },
      organization: orgData,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({
      status: "error",
      error: error.message,
      stack: error.stack,
    });
  }
}
