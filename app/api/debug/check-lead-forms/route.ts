import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { getCurrentUserOrganization } from "@/app/lib/organization-server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { organizationId, error: orgError } =
      await getCurrentUserOrganization();

    if (orgError || !organizationId) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 },
      );
    }

    // Get all lead forms for this organization
    const { data: allForms, error: formsError } = await supabase
      .from("facebook_lead_forms")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });

    // Get active forms specifically
    const { data: activeForms } = await supabase
      .from("facebook_lead_forms")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("is_active", true);

    // Get Facebook pages for context
    const { data: pages } = await supabase
      .from("facebook_pages")
      .select("id, facebook_page_id, page_name")
      .eq("organization_id", organizationId);

    return NextResponse.json({
      organizationId,
      totalForms: allForms?.length || 0,
      activeForms: activeForms?.length || 0,
      pages: pages || [],
      forms: allForms || [],
      debug: {
        allFormsQuery: {
          table: "facebook_lead_forms",
          filter: `organization_id = '${organizationId}'`,
        },
        activeFormsQuery: {
          table: "facebook_lead_forms",
          filter: `organization_id = '${organizationId}' AND is_active = true`,
        },
      },
    });
  } catch (error) {
    console.error("Debug endpoint error:", error);
    return NextResponse.json(
      { error: "Failed to fetch debug data" },
      { status: 500 },
    );
  }
}
