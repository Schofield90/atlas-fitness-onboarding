import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { getCurrentUserOrganization } from "@/app/lib/organization-server";

export async function GET() {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    // Get organization using the service
    const { organizationId, error: orgError } =
      await getCurrentUserOrganization();

    // Get user's organizations directly
    let userOrgs = null;
    if (user) {
      const { data: orgs } = await supabase
        .from("organization_members")
        .select(
          `
          organization:organizations(id, name),
          role
        `,
        )
        .eq("user_id", user.id);
      userOrgs = orgs;
    }

    // Get all organizations
    const { data: allOrgs } = await supabase
      .from("organizations")
      .select("id, name");

    return NextResponse.json({
      currentUser: user
        ? {
            id: user.id,
            email: user.email,
          }
        : null,
      organizationFromService: {
        organizationId,
        error: orgError,
      },
      userOrganizations: userOrgs,
      allOrganizations: allOrgs,
      errors: {
        userError,
        orgError,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
