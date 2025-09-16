import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { getCurrentUserOrganization } from "@/app/lib/organization-server";
import MetaAdsClient from "@/app/lib/integrations/meta-ads-client";

export async function GET() {
  try {
    const supabase = createClient();
    const { organizationId } = await getCurrentUserOrganization();

    if (!organizationId) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 400 },
      );
    }

    // Check if we have a Facebook integration
    const { data: integration, error: integrationError } = await supabase
      .from("facebook_integrations")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .single();

    if (integrationError || !integration) {
      return NextResponse.json({
        status: "no_integration",
        error: "No active Facebook integration found",
        details: integrationError,
      });
    }

    // Check if we have pages in the database
    const { data: dbPages, error: pagesError } = await supabase
      .from("facebook_pages")
      .select("*")
      .eq("organization_id", organizationId);

    // Try to create Meta client and fetch pages from API
    let apiPages = null;
    let apiError = null;
    let tokenValidation = null;

    try {
      const metaClient =
        await MetaAdsClient.createFromIntegration(organizationId);
      if (metaClient) {
        // Validate token
        try {
          tokenValidation = await metaClient.validateAccessToken();
        } catch (e: any) {
          tokenValidation = { valid: false, error: e.message };
        }

        // Try to get pages
        try {
          apiPages = await metaClient.getPages();
        } catch (e: any) {
          apiError = {
            message: e.message,
            code: e.code,
            type: e.type,
            fbtrace_id: e.fbtrace_id,
          };
        }
      }
    } catch (e: any) {
      apiError = {
        message: e.message,
        details: "Failed to create Meta client",
      };
    }

    // Check token expiry
    const tokenExpiry = integration.token_expires_at
      ? new Date(integration.token_expires_at)
      : null;
    const isTokenExpired = tokenExpiry && tokenExpiry < new Date();

    return NextResponse.json({
      integration: {
        id: integration.id,
        user_id: integration.user_id,
        user_name: integration.user_name,
        created_at: integration.created_at,
        last_sync_at: integration.last_sync_at,
        is_active: integration.is_active,
        token_expires_at: integration.token_expires_at,
        is_token_expired: isTokenExpired,
        has_access_token: !!integration.access_token,
        token_length: integration.access_token
          ? integration.access_token.length
          : 0,
      },
      database: {
        pages_count: dbPages?.length || 0,
        pages: dbPages || [],
      },
      api: {
        token_valid: tokenValidation,
        pages_count: apiPages?.length || 0,
        pages: apiPages || [],
        error: apiError,
      },
      recommendations: [
        isTokenExpired && "Token has expired - reconnect Facebook",
        (!dbPages || dbPages.length === 0) &&
          "No pages in database - click Refresh to sync",
        apiError && "API error occurred - check permissions or reconnect",
        !integration.access_token &&
          "No access token stored - reconnect Facebook",
      ].filter(Boolean),
    });
  } catch (error: any) {
    console.error("Debug endpoint error:", error);
    return NextResponse.json(
      {
        error: "Debug check failed",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
