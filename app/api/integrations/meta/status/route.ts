import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { getCurrentUserOrganization } from "@/app/lib/organization-server";

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { organizationId } = await getCurrentUserOrganization();

    if (!organizationId) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 400 },
      );
    }

    // Get integration status
    const { data: integration } = await supabase
      .from("facebook_integrations")
      .select(
        `
        facebook_user_name,
        facebook_user_email,
        last_sync_at,
        is_active,
        token_expires_at,
        created_at
      `,
      )
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .single();

    if (!integration) {
      return NextResponse.json({
        success: true,
        status: {
          connected: false,
          message: "No active Meta Ads integration found",
        },
      });
    }

    // Check if token is expired
    const isTokenExpired = integration.token_expires_at
      ? new Date(integration.token_expires_at) < new Date()
      : false;

    if (isTokenExpired) {
      return NextResponse.json({
        success: true,
        status: {
          connected: false,
          user_name: integration.facebook_user_name,
          user_email: integration.facebook_user_email,
          message: "Token expired, please reconnect",
          token_expired: true,
        },
      });
    }

    // Get counts of synced data
    const [pagesResult, formsResult, accountsResult] = await Promise.allSettled(
      [
        supabase
          .from("facebook_pages")
          .select("id", { count: "exact" })
          .eq("organization_id", organizationId)
          .eq("is_active", true),

        supabase
          .from("facebook_lead_forms")
          .select("id", { count: "exact" })
          .eq("organization_id", organizationId)
          .eq("is_active", true),

        supabase
          .from("facebook_ad_accounts")
          .select("id", { count: "exact" })
          .eq("organization_id", organizationId)
          .eq("is_active", true),
      ],
    );

    const pagesCount =
      pagesResult.status === "fulfilled" ? pagesResult.value.count || 0 : 0;
    const formsCount =
      formsResult.status === "fulfilled" ? formsResult.value.count || 0 : 0;
    const accountsCount =
      accountsResult.status === "fulfilled"
        ? accountsResult.value.count || 0
        : 0;

    return NextResponse.json({
      success: true,
      status: {
        connected: true,
        user_name: integration.facebook_user_name,
        user_email: integration.facebook_user_email,
        last_sync_at: integration.last_sync_at,
        connected_at: integration.created_at,
        pages_count: pagesCount,
        forms_count: formsCount,
        accounts_count: accountsCount,
        token_expires_at: integration.token_expires_at,
      },
    });
  } catch (error: any) {
    console.error("Meta status check error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to check Meta integration status",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
