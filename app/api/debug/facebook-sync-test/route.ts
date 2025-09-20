import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { getCurrentUserOrganization } from "@/app/lib/organization-server";
import MetaAdsClient from "@/app/lib/integrations/meta-ads-client";

export async function GET() {
  try {
    const supabase = await createClient();
    const { organizationId } = await getCurrentUserOrganization();

    if (!organizationId) {
      return NextResponse.json(
        {
          error: "No organization found",
          step: "organization_check",
        },
        { status: 400 },
      );
    }

    // Step 1: Check if integration exists
    const { data: integration, error: integrationError } = await supabase
      .from("facebook_integrations")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .single();

    if (integrationError || !integration) {
      return NextResponse.json(
        {
          error: "No active Facebook integration found",
          step: "integration_check",
          details: integrationError,
          suggestion: "Please connect your Facebook account first",
        },
        { status: 400 },
      );
    }

    // Step 2: Check if access token exists
    if (!integration.access_token) {
      return NextResponse.json(
        {
          error: "No access token found",
          step: "token_check",
          suggestion: "Please reconnect your Facebook account",
        },
        { status: 400 },
      );
    }

    // Step 3: Try to create Meta client
    const metaClient =
      await MetaAdsClient.createFromIntegration(organizationId);
    if (!metaClient) {
      return NextResponse.json(
        {
          error: "Failed to create Meta API client",
          step: "client_creation",
          suggestion: "Check if access token is valid",
        },
        { status: 400 },
      );
    }

    // Step 4: Try to fetch pages directly
    let pages = [];
    let apiError = null;

    try {
      console.log("Fetching pages from Meta API...");
      pages = await metaClient.getPages();
      console.log(`Got ${pages.length} pages from Meta API`);
    } catch (error: any) {
      apiError = {
        message: error.message,
        code: error.code,
        type: error.type,
        subcode: error.subcode,
        traceId: error.traceId,
      };
      console.error("Meta API error:", apiError);
    }

    // Step 5: Check current database pages
    const { data: dbPages } = await supabase
      .from("facebook_pages")
      .select("*")
      .eq("organization_id", organizationId);

    return NextResponse.json({
      success: pages.length > 0,
      integration: {
        exists: true,
        has_token: !!integration.access_token,
        token_length: integration.access_token.length,
        created_at: integration.created_at,
        last_sync: integration.last_sync_at,
      },
      api_result: {
        pages_count: pages.length,
        pages: pages.map((p) => ({
          id: p.id,
          name: p.name,
          access_token: p.access_token ? "present" : "missing",
          category: p.category,
          username: p.username,
          tasks: p.tasks,
        })),
        error: apiError,
      },
      database: {
        pages_count: dbPages?.length || 0,
        pages: dbPages?.map((p) => ({
          id: p.id,
          facebook_page_id: p.facebook_page_id,
          page_name: p.page_name,
        })),
      },
      suggestions: [
        apiError &&
          "Check if your Facebook app has the correct permissions (pages_show_list, pages_read_engagement)",
        apiError?.code === 190 &&
          "Access token may be expired - try reconnecting Facebook",
        pages.length === 0 &&
          !apiError &&
          "No pages found - ensure you have admin access to at least one Facebook page",
        pages.length > 0 && "Pages found! The sync endpoint should work.",
      ].filter(Boolean),
    });
  } catch (error: any) {
    console.error("Debug test error:", error);
    return NextResponse.json(
      {
        error: "Debug test failed",
        details: error.message,
        stack: error.stack,
      },
      { status: 500 },
    );
  }
}
