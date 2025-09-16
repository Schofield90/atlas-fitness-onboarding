import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { getCurrentUserOrganization } from "@/app/lib/organization-server";

export async function GET() {
  try {
    const supabase = createClient();
    const { organizationId, error } = await getCurrentUserOrganization();

    if (error || !organizationId) {
      return NextResponse.json(
        {
          error: "No organization found",
          organization: null,
        },
        { status: 404 },
      );
    }

    // Get organization details
    const { data: organization, error: orgError } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", organizationId)
      .single();

    if (orgError || !organization) {
      return NextResponse.json(
        {
          error: "Organization not found",
          organization: null,
        },
        { status: 404 },
      );
    }

    // Get user's role in the organization
    const {
      data: { user },
    } = await supabase.auth.getUser();
    let role = "member";

    if (user) {
      const { data: userOrg } = await supabase
        .from("user_organizations")
        .select("role")
        .eq("user_id", user.id)
        .eq("organization_id", organizationId)
        .single();

      if (userOrg) {
        role = userOrg.role;
      }
    }

    return NextResponse.json({
      organization: {
        id: organization.id,
        name: organization.name,
        subdomain: organization.subdomain,
        plan: organization.plan,
        status: organization.status,
        settings: organization.settings,
        created_at: organization.created_at,
      },
      role,
    });
  } catch (error: unknown) {
    console.error("Error fetching organization:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch organization",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
