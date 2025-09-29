import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/app/lib/supabase/server";
import { getUserAndOrganization } from "@/app/lib/auth-utils";

export async function GET(request: NextRequest) {
  try {
    // First verify authentication
    const supabase = await createServerSupabaseClient();
    const { user, organization } = await getUserAndOrganization(supabase);

    if (!user || !organization) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use the authenticated user's organization
    const organizationId = organization.id;

    // Get all programs for this organization using authenticated supabase client
    const { data, error } = await supabase
      .from("programs")
      .select(`*`)
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching programs:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
