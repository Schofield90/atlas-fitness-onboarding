import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { getCurrentUserOrganization } from "@/app/lib/organization-server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { organizationId, error: orgError } =
      await getCurrentUserOrganization();

    if (orgError || !organizationId) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 },
      );
    }

    // Fetch website forms from the forms table
    const { data: forms, error } = await supabase
      .from("forms")
      .select("id, name, type, is_active, created_at")
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .order("name");

    if (error) {
      console.error("Error fetching website forms:", error);
      return NextResponse.json(
        { error: "Failed to fetch forms" },
        { status: 500 },
      );
    }

    // Transform data for the frontend
    const transformedForms =
      forms?.map((form) => ({
        id: form.id,
        name: form.name,
        type: form.type || "general",
      })) || [];

    return NextResponse.json({
      forms: transformedForms,
    });
  } catch (error) {
    console.error("Error in GET /api/integrations/website/forms:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
