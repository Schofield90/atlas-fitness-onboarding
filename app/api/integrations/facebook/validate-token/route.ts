import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get organization - use default if not found
    let organizationId = "63589490-8f55-4157-bd3a-e141594b748e";

    const { data: userOrg } = await supabase
      .from("user_organizations")
      .select("organization_id")
      .eq("user_id", user.id)
      .single();

    if (userOrg?.organization_id) {
      organizationId = userOrg.organization_id;
    }

    // Get the Facebook integration
    const { data: integration, error: intError } = await supabase
      .from("facebook_integrations")
      .select("*")
      .eq("organization_id", organizationId)
      .single();

    if (intError || !integration) {
      return NextResponse.json({
        success: false,
        error: "No Facebook integration found",
        should_reconnect: true,
      });
    }

    // Check if token exists
    if (!integration.access_token) {
      return NextResponse.json({
        success: false,
        error: "No access token stored",
        should_reconnect: true,
      });
    }

    // Test the token with Facebook Graph API
    const debugTokenUrl =
      `https://graph.facebook.com/debug_token?` +
      `input_token=${integration.access_token}&` +
      `access_token=${process.env.NEXT_PUBLIC_FACEBOOK_APP_ID}|${process.env.FACEBOOK_APP_SECRET}`;

    console.log("🔍 Validating Facebook token...");

    const debugResponse = await fetch(debugTokenUrl);
    const debugData = await debugResponse.json();

    if (debugData.error) {
      console.error("❌ Token debug error:", debugData.error);
      return NextResponse.json({
        success: false,
        error: "Token validation failed",
        fb_error: debugData.error,
        should_reconnect: true,
      });
    }

    const tokenData = debugData.data;

    // Check if token is valid
    if (!tokenData.is_valid) {
      console.error("❌ Token is invalid:", tokenData.error);

      // Clear the invalid token
      await supabase
        .from("facebook_integrations")
        .update({
          is_active: false,
          access_token: null,
          token_expires_at: null,
        })
        .eq("id", integration.id);

      return NextResponse.json({
        success: false,
        error: "Token is invalid",
        reason: tokenData.error?.message || "Unknown error",
        should_reconnect: true,
      });
    }

    // Check expiration
    const expiresAt = tokenData.expires_at
      ? new Date(tokenData.expires_at * 1000)
      : null;
    const isExpired = expiresAt ? expiresAt < new Date() : false;

    if (isExpired) {
      console.log("⏰ Token is expired, attempting to refresh...");

      // Try to refresh the token
      const refreshUrl =
        `https://graph.facebook.com/v18.0/oauth/access_token?` +
        `grant_type=fb_exchange_token&` +
        `client_id=${process.env.NEXT_PUBLIC_FACEBOOK_APP_ID}&` +
        `client_secret=${process.env.FACEBOOK_APP_SECRET}&` +
        `fb_exchange_token=${integration.access_token}`;

      const refreshResponse = await fetch(refreshUrl);
      const refreshData = await refreshResponse.json();

      if (refreshData.access_token) {
        // Update with new token
        const newExpiresAt = new Date(
          Date.now() + (refreshData.expires_in || 5184000) * 1000,
        );

        await supabase
          .from("facebook_integrations")
          .update({
            access_token: refreshData.access_token,
            token_expires_at: newExpiresAt.toISOString(),
            is_active: true,
            last_sync_at: new Date().toISOString(),
          })
          .eq("id", integration.id);

        console.log("✅ Token refreshed successfully");

        return NextResponse.json({
          success: true,
          message: "Token refreshed successfully",
          expires_at: newExpiresAt.toISOString(),
          scopes: tokenData.scopes,
        });
      } else {
        console.error("❌ Failed to refresh token:", refreshData.error);

        return NextResponse.json({
          success: false,
          error: "Failed to refresh token",
          fb_error: refreshData.error,
          should_reconnect: true,
        });
      }
    }

    // Token is valid and not expired
    console.log("✅ Token is valid");

    // Update last check time
    await supabase
      .from("facebook_integrations")
      .update({
        last_sync_at: new Date().toISOString(),
        is_active: true,
      })
      .eq("id", integration.id);

    // Also verify we can actually use the token
    const meUrl = `https://graph.facebook.com/v18.0/me?fields=id,name,email&access_token=${integration.access_token}`;
    const meResponse = await fetch(meUrl);
    const meData = await meResponse.json();

    if (meData.error) {
      console.error("❌ Token works but cannot fetch user data:", meData.error);
      return NextResponse.json({
        success: false,
        error: "Token cannot access user data",
        fb_error: meData.error,
        should_reconnect: true,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Token is valid and working",
      token_info: {
        is_valid: tokenData.is_valid,
        expires_at: expiresAt?.toISOString(),
        scopes: tokenData.scopes || [],
        user_id: tokenData.user_id,
        app_id: tokenData.app_id,
      },
      user_info: {
        id: meData.id,
        name: meData.name,
        email: meData.email,
      },
    });
  } catch (error: any) {
    console.error("❌ Token validation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to validate token",
        details: error.message,
        should_reconnect: true,
      },
      { status: 500 },
    );
  }
}
