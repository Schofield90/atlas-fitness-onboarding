import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { getCurrentUserOrganization } from "@/app/lib/organization-server";
import MetaAdsClient from "@/app/lib/integrations/meta-ads-client";

export async function GET() {
  try {
    const supabase = await createClient();
    const { organizationId } = await getCurrentUserOrganization();

    if (!organizationId) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 400 },
      );
    }

    // Step 1: Check integration status
    const { data: integration, error: integrationError } = await supabase
      .from("facebook_integrations")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .single();

    if (integrationError || !integration) {
      return NextResponse.json({
        step: "integration_check",
        status: "failed",
        error: "No active integration found",
        details: integrationError,
      });
    }

    // Step 2: Check database pages
    const { data: dbPages, error: pagesError } = await supabase
      .from("facebook_pages")
      .select("*")
      .eq("organization_id", organizationId);

    // Step 3: Try to sync pages from API
    let syncResult = null;
    let syncError = null;

    try {
      const syncRes = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/integrations/meta/sync-pages`,
        {
          method: "POST",
          headers: {
            Cookie: `${Object.entries(await supabase.auth.getSession())
              .map(([k, v]) => `${k}=${v}`)
              .join("; ")}`,
          },
        },
      );

      if (syncRes.ok) {
        syncResult = await syncRes.json();
      } else {
        syncError = await syncRes.text();
      }
    } catch (e: any) {
      syncError = e.message;
    }

    // Step 4: Check if we can fetch pages directly
    let directPages = null;
    let directError = null;

    try {
      const metaClient =
        await MetaAdsClient.createFromIntegration(organizationId);
      if (metaClient) {
        directPages = await metaClient.getPages();
      }
    } catch (e: any) {
      directError = {
        message: e.message,
        code: e.code,
        type: e.type,
      };
    }

    // Step 5: Check old endpoint
    let oldEndpointResult = null;
    let oldEndpointError = null;

    try {
      const oldRes = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/integrations/facebook/pages`,
        {
          headers: {
            Cookie: `${Object.entries(await supabase.auth.getSession())
              .map(([k, v]) => `${k}=${v}`)
              .join("; ")}`,
          },
        },
      );

      if (oldRes.ok) {
        oldEndpointResult = await oldRes.json();
      } else {
        oldEndpointError = await oldRes.text();
      }
    } catch (e: any) {
      oldEndpointError = e.message;
    }

    return NextResponse.json({
      summary: {
        has_integration: !!integration,
        database_pages_count: dbPages?.length || 0,
        api_pages_count: directPages?.length || 0,
        sync_successful: !!syncResult?.success,
        old_endpoint_working: !!oldEndpointResult?.pages,
      },
      integration: {
        id: integration.id,
        created_at: integration.created_at,
        has_access_token: !!integration.access_token,
        token_length: integration.access_token
          ? integration.access_token.length
          : 0,
      },
      database: {
        pages_count: dbPages?.length || 0,
        pages: dbPages?.map((p) => ({
          id: p.id,
          facebook_page_id: p.facebook_page_id,
          page_name: p.page_name,
          has_access_token: !!p.access_token,
        })),
      },
      sync_attempt: {
        result: syncResult,
        error: syncError,
      },
      direct_api_call: {
        pages_count: directPages?.length || 0,
        pages: directPages?.map((p) => ({ id: p.id, name: p.name })),
        error: directError,
      },
      old_endpoint: {
        result: oldEndpointResult,
        error: oldEndpointError,
      },
      recommendations: [
        (!dbPages || dbPages.length === 0) &&
          directPages &&
          directPages.length > 0 &&
          "Pages exist in API but not in database - sync should fix this",
        syncError && "Sync endpoint is failing - check error details",
        directError && "Direct API call failing - check Meta API permissions",
        oldEndpointError &&
          "Old endpoint failing - likely due to column name issue (fixed now)",
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
