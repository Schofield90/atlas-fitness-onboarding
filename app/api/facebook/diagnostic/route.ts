import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Use the known organization ID
    const organizationId = "63589490-8f55-4157-bd3a-e141594b748e";

    // Check facebook_integrations table
    const { data: integrations, error: intError } = await supabase
      .from("facebook_integrations")
      .select(
        "id, user_id, organization_id, facebook_user_id, facebook_user_name, is_active, connection_status, last_sync_at, created_at",
      )
      .or(`organization_id.eq.${organizationId},user_id.eq.${user.id}`);

    // Check facebook_pages table
    const { data: pages, error: pagesError } = await supabase
      .from("facebook_pages")
      .select("id, facebook_page_id, page_name, is_active, created_at")
      .eq("organization_id", organizationId);

    // Prepare diagnostic info
    const diagnosticInfo = {
      user: {
        id: user.id,
        email: user.email,
      },
      facebook_integration: {
        exists: integrations && integrations.length > 0,
        count: integrations?.length || 0,
        active: integrations?.some((i) => i.is_active) || false,
        needs_fix:
          integrations?.some((i) => i.organization_id !== organizationId) ||
          false,
        summary: integrations?.map((i) => ({
          id: i.id,
          org_id: i.organization_id,
          is_active: i.is_active,
          status: i.connection_status,
          last_sync: i.last_sync_at,
        })),
      },
      facebook_pages: {
        count: pages?.length || 0,
        pages: pages?.map((p) => ({
          id: p.facebook_page_id,
          name: p.page_name,
          active: p.is_active,
        })),
      },
      recommendations: [],
    };

    // Add recommendations
    if (!integrations || integrations.length === 0) {
      diagnosticInfo.recommendations.push(
        "No Facebook integration found. Please reconnect your Facebook account.",
      );
    } else if (integrations.some((i) => i.organization_id !== organizationId)) {
      diagnosticInfo.recommendations.push(
        'Integration has wrong organization ID. Click "Sync Pages from Facebook" to fix.',
      );
    } else if (!integrations.some((i) => i.is_active)) {
      diagnosticInfo.recommendations.push(
        "Integration is inactive. Please reconnect your Facebook account.",
      );
    } else if (pages?.length === 0) {
      diagnosticInfo.recommendations.push(
        'No pages synced yet. Click "Sync Pages from Facebook" button.',
      );
    }

    return NextResponse.json(diagnosticInfo);
  } catch (error) {
    console.error("Diagnostic error:", error);
    return NextResponse.json(
      {
        error: "Diagnostic failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
