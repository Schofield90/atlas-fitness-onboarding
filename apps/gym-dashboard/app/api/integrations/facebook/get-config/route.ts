import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { getCurrentUserOrganization } from "@/app/lib/organization-server";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user and organization
    const supabase = await createClient();
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

    // Get Facebook integration
    const { data: integration, error: intError } = await supabase
      .from("facebook_integrations")
      .select("id, sync_config")
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .single();

    if (intError || !integration) {
      // Not an error - just means no config exists yet
      return NextResponse.json({
        success: true,
        config: null,
      });
    }

    // First try to get config from facebook_sync_configs table
    const { data: syncConfig } = await supabase
      .from("facebook_sync_configs")
      .select("selected_pages, selected_ad_accounts, selected_forms")
      .eq("organization_id", organizationId)
      .single();

    if (syncConfig) {
      return NextResponse.json({
        success: true,
        config: {
          selectedPages: syncConfig.selected_pages || [],
          selectedAdAccounts: syncConfig.selected_ad_accounts || [],
          selectedForms: syncConfig.selected_forms || [],
        },
      });
    }

    // Fall back to sync_config JSONB field in facebook_integrations
    if (integration.sync_config) {
      return NextResponse.json({
        success: true,
        config: {
          selectedPages: integration.sync_config.selected_pages || [],
          selectedAdAccounts:
            integration.sync_config.selected_ad_accounts || [],
          selectedForms: integration.sync_config.selected_forms || [],
        },
      });
    }

    // No config found
    return NextResponse.json({
      success: true,
      config: null,
    });
  } catch (error) {
    console.error("Error fetching Facebook configuration:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch configuration",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
