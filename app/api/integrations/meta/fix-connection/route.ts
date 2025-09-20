import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
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

    // Use the correct organization ID
    const organizationId = "63589490-8f55-4157-bd3a-e141594b748e";

    console.log("🔧 Attempting to fix Facebook connection for user:", user.id);
    console.log("🔧 Organization ID:", organizationId);

    // First, clear any existing broken integrations
    const { error: deleteError } = await supabase
      .from("facebook_integrations")
      .delete()
      .eq("user_id", user.id);

    if (deleteError) {
      console.error("Error clearing old integrations:", deleteError);
    } else {
      console.log("✅ Cleared old integrations");
    }

    // Also clear any orphaned pages
    const { error: pagesDeleteError } = await supabase
      .from("facebook_pages")
      .delete()
      .eq("organization_id", organizationId);

    if (pagesDeleteError) {
      console.error("Error clearing old pages:", pagesDeleteError);
    } else {
      console.log("✅ Cleared old pages");
    }

    // Clear any orphaned ad accounts
    const { error: adAccountsDeleteError } = await supabase
      .from("facebook_ad_accounts")
      .delete()
      .eq("organization_id", organizationId);

    if (!adAccountsDeleteError) {
      console.log("✅ Cleared old ad accounts");
    }

    // Clear localStorage flags from cookies (if stored)
    const cookieStore = cookies();
    cookieStore.delete("fb_integration_status");
    cookieStore.delete("fb_access_token");

    return NextResponse.json({
      success: true,
      message:
        "Facebook integration has been reset. You can now reconnect your account.",
      actions: [
        "Cleared old integration records",
        "Removed orphaned pages",
        "Removed orphaned ad accounts",
        "Reset connection status",
      ],
    });
  } catch (error: any) {
    console.error("Fix connection error:", error);
    return NextResponse.json(
      {
        error: "Failed to fix connection",
        details: error.message,
      },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
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

    const organizationId = "63589490-8f55-4157-bd3a-e141594b748e";

    // Check current integration status
    const { data: integration, error: intError } = await supabase
      .from("facebook_integrations")
      .select("*")
      .eq("user_id", user.id)
      .single();

    // Check for pages
    const { data: pages, error: pagesError } = await supabase
      .from("facebook_pages")
      .select("*")
      .eq("organization_id", organizationId);

    // Check for ad accounts
    const { data: adAccounts } = await supabase
      .from("facebook_ad_accounts")
      .select("*")
      .eq("organization_id", organizationId);

    const status = {
      hasIntegration: !!integration && !intError,
      integrationActive: integration?.is_active || false,
      hasAccessToken: !!integration?.access_token,
      tokenExpired: integration?.connection_status === "expired",
      pagesCount: pages?.length || 0,
      adAccountsCount: adAccounts?.length || 0,
      lastSync: integration?.last_sync_at,
      errorDetails: integration?.error_details,
    };

    // Determine the issue
    let issue = "Unknown";
    let recommendation = "";

    if (!status.hasIntegration) {
      issue = "No integration record found";
      recommendation = "Please reconnect your Facebook account";
    } else if (!status.hasAccessToken) {
      issue = "No access token stored";
      recommendation = "Please reconnect your Facebook account";
    } else if (status.tokenExpired) {
      issue = "Access token has expired";
      recommendation =
        "Please reconnect your Facebook account to refresh the token";
    } else if (!status.integrationActive) {
      issue = "Integration is marked as inactive";
      recommendation = "Please reconnect your Facebook account";
    } else if (status.pagesCount === 0) {
      issue = "No pages synced";
      recommendation = "Try running the sync operation";
    }

    return NextResponse.json({
      status,
      issue,
      recommendation,
      debug: {
        userId: user.id,
        organizationId,
        integrationId: integration?.id,
        hasToken: !!integration?.access_token,
        tokenLength: integration?.access_token?.length || 0,
      },
    });
  } catch (error: any) {
    console.error("Status check error:", error);
    return NextResponse.json(
      {
        error: "Failed to check status",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
