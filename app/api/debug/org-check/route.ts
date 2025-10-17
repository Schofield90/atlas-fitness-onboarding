import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({
        error: "Not authenticated",
        user: null,
        organizations: [],
      });
    }

    const adminClient = createAdminClient();

    // Check user_organizations
    const { data: userOrgs } = await adminClient
      .from("user_organizations")
      .select("organization_id, role")
      .eq("user_id", user.id);

    // Check organization_staff
    const { data: staffOrgs } = await adminClient
      .from("organization_staff")
      .select("organization_id, role")
      .eq("user_id", user.id);

    // Check clients count for first org
    const firstOrgId =
      userOrgs?.[0]?.organization_id || staffOrgs?.[0]?.organization_id;
    let clientCount = 0;
    if (firstOrgId) {
      const { count } = await adminClient
        .from("clients")
        .select("*", { count: "exact", head: true })
        .eq("org_id", firstOrgId);
      clientCount = count || 0;
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
      },
      userOrganizations: userOrgs || [],
      staffOrganizations: staffOrgs || [],
      total: (userOrgs?.length || 0) + (staffOrgs?.length || 0),
      firstOrgId,
      clientCount,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
