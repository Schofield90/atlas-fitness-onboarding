import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { getCurrentUserOrganization } from "@/app/lib/organization-server";

export async function GET() {
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

    // First check if we have a Facebook integration
    const { data: integration } = await supabase
      .from("facebook_integrations")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .single();

    if (!integration) {
      // No integration found, return empty pages
      return NextResponse.json({
        pages: [],
        hasConnection: false,
        message:
          "No Facebook integration found. Please connect your Facebook account first.",
      });
    }

    // Fetch Facebook pages for the organization
    // Note: Removing the lead_forms join as it causes schema cache errors
    const { data: pages, error } = await supabase
      .from("facebook_pages")
      .select(
        `
        id,
        facebook_page_id,
        page_id,
        page_name,
        access_token,
        is_active,
        is_primary,
        page_username,
        page_category,
        page_info,
        permissions
      `,
      )
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .order("is_primary", { ascending: false })
      .order("page_name");

    // Fetch lead forms separately if pages exist
    // Wrap in try-catch in case table doesn't exist yet
    let leadFormsMap: Record<string, any[]> = {};
    if (pages && pages.length > 0) {
      try {
        const pageIds = pages.map((p) => p.facebook_page_id);
        const { data: leadForms, error: leadFormsError } = await supabase
          .from("facebook_lead_forms")
          .select("*")
          .eq("organization_id", organizationId)
          .in("facebook_page_id", pageIds)
          .eq("is_active", true);

        if (leadFormsError) {
          // Table might not exist yet - that's ok
          console.log(
            "Lead forms table not available:",
            leadFormsError.message,
          );
        } else if (leadForms) {
          leadForms.forEach((form) => {
            if (!leadFormsMap[form.facebook_page_id]) {
              leadFormsMap[form.facebook_page_id] = [];
            }
            leadFormsMap[form.facebook_page_id].push({
              id: form.id,
              facebook_form_id: form.facebook_form_id,
              form_name: form.form_name,
              is_active: form.is_active,
              last_sync_at: form.last_sync_at,
            });
          });
        }
      } catch (err) {
        // Silently handle if lead forms table doesn't exist
        console.log("Lead forms query skipped:", err);
      }
    }

    if (error) {
      console.error("Error fetching Facebook pages:", error);
      return NextResponse.json(
        { error: `Failed to fetch pages: ${error.message}` },
        { status: 500 },
      );
    }

    // Transform data for the frontend
    const transformedPages =
      pages?.map((page) => ({
        id: page.facebook_page_id || page.page_id || page.id, // Handle all column names
        name: page.page_name,
        access_token: page.access_token,
        cover: page.page_info?.cover?.source || null,
        category: page.page_category || "Business",
        hasLeadAccess: page.permissions?.includes("MANAGE") || false,
        followers_count: page.page_info?.followers_count || 0,
        website: page.page_info?.website || null,
        forms:
          leadFormsMap[page.facebook_page_id || page.page_id || page.id] || [],
      })) || [];

    return NextResponse.json({
      pages: transformedPages,
      hasConnection: pages && pages.length > 0,
    });
  } catch (error) {
    console.error("Error in GET /api/integrations/facebook/pages:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Create or update Facebook pages
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { organizationId, error: orgError } =
      await getCurrentUserOrganization();

    if (orgError || !organizationId) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 },
      );
    }

    const body = await request.json();
    const { pages, integrationId } = body;

    if (!pages || !Array.isArray(pages)) {
      return NextResponse.json(
        { error: "Invalid pages data" },
        { status: 400 },
      );
    }

    // Upsert pages
    const upsertData = pages.map((page) => ({
      organization_id: organizationId,
      integration_id: integrationId,
      facebook_page_id: page.id,
      page_name: page.name,
      access_token: page.access_token,
      is_active: true,
      is_primary: page.is_primary || false,
    }));

    const { data, error } = await supabase
      .from("facebook_pages")
      .upsert(upsertData, {
        onConflict: "organization_id,facebook_page_id",
      })
      .select();

    if (error) {
      console.error("Error upserting Facebook pages:", error);
      return NextResponse.json(
        { error: "Failed to save pages" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      pages: data,
      message: `Successfully saved ${data.length} pages`,
    });
  } catch (error) {
    console.error("Error in POST /api/integrations/facebook/pages:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
