import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

interface TokenRefreshResult {
  integration: string;
  success: boolean;
  tenantsAffected: number;
  tokensRefreshed: number;
  errors: string[];
  message: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    // Authorization check
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const authorizedEmails = ["sam@atlas-gyms.co.uk", "sam@gymleadhub.co.uk"];
    if (!authorizedEmails.includes(user.email?.toLowerCase() || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { integrationId, forceRefresh = false } = await request.json();

    let results: TokenRefreshResult[] = [];

    if (integrationId) {
      // Refresh specific integration
      const result = await refreshIntegrationTokens(
        integrationId,
        forceRefresh,
      );
      results.push(result);
    } else {
      // Refresh all OAuth integrations
      const oauthIntegrations = ["google-calendar", "facebook"];
      results = await Promise.all(
        oauthIntegrations.map((id) =>
          refreshIntegrationTokens(id, forceRefresh),
        ),
      );
    }

    // Log the refresh operation
    await supabase.from("token_refresh_logs").insert({
      integration_id: integrationId || "all",
      results: results,
      refreshed_by: user.id,
      refreshed_at: new Date().toISOString(),
      force_refresh: forceRefresh,
    });

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Token refresh error:", error);
    return NextResponse.json(
      { error: "Token refresh failed" },
      { status: 500 },
    );
  }
}

async function refreshIntegrationTokens(
  integrationId: string,
  forceRefresh: boolean,
): Promise<TokenRefreshResult> {
  const supabase = await createClient();

  try {
    switch (integrationId) {
      case "google-calendar":
        return await refreshGoogleTokens(supabase, forceRefresh);
      case "facebook":
        return await refreshFacebookTokens(supabase, forceRefresh);
      default:
        return {
          integration: integrationId,
          success: false,
          tenantsAffected: 0,
          tokensRefreshed: 0,
          errors: [`Unknown integration: ${integrationId}`],
          message: "Integration not supported for token refresh",
        };
    }
  } catch (error) {
    return {
      integration: integrationId,
      success: false,
      tenantsAffected: 0,
      tokensRefreshed: 0,
      errors: [error instanceof Error ? error.message : "Unknown error"],
      message: "Token refresh failed",
    };
  }
}

async function refreshGoogleTokens(
  supabase: any,
  forceRefresh: boolean,
): Promise<TokenRefreshResult> {
  const errors: string[] = [];
  let tokensRefreshed = 0;
  let tenantsAffected = 0;

  try {
    // Get all organizations with Google Calendar integrations
    const { data: integrations, error } = await supabase
      .from("google_calendar_integrations")
      .select("*")
      .not("refresh_token", "is", null);

    if (error) throw error;

    tenantsAffected = integrations?.length || 0;

    for (const integration of integrations || []) {
      try {
        const now = new Date();
        const expiresAt = new Date(integration.expires_at);
        const shouldRefresh =
          forceRefresh || expiresAt <= new Date(now.getTime() + 300000); // 5 minutes buffer

        if (!shouldRefresh) {
          continue;
        }

        // Refresh the token
        const tokenResponse = await fetch(
          "https://oauth2.googleapis.com/token",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              client_id: process.env.GOOGLE_CLIENT_ID!,
              client_secret: process.env.GOOGLE_CLIENT_SECRET!,
              refresh_token: integration.refresh_token,
              grant_type: "refresh_token",
            }),
          },
        );

        const tokenData = await tokenResponse.json();

        if (!tokenResponse.ok) {
          throw new Error(
            `Google token refresh failed: ${tokenData.error_description || tokenData.error}`,
          );
        }

        // Update the integration with new token
        const newExpiresAt = new Date(
          now.getTime() + tokenData.expires_in * 1000,
        );

        const { error: updateError } = await supabase
          .from("google_calendar_integrations")
          .update({
            access_token: tokenData.access_token,
            expires_at: newExpiresAt.toISOString(),
            updated_at: now.toISOString(),
          })
          .eq("id", integration.id);

        if (updateError) throw updateError;

        tokensRefreshed++;

        // Log successful refresh
        await supabase.from("integration_logs").insert({
          organization_id: integration.organization_id,
          integration_type: "google-calendar",
          action: "token_refresh",
          status: "success",
          message: "Access token refreshed successfully",
          created_at: now.toISOString(),
        });
      } catch (tokenError) {
        const errorMessage =
          tokenError instanceof Error ? tokenError.message : "Unknown error";
        errors.push(`Tenant ${integration.organization_id}: ${errorMessage}`);

        // Log failed refresh
        await supabase.from("integration_logs").insert({
          organization_id: integration.organization_id,
          integration_type: "google-calendar",
          action: "token_refresh",
          status: "error",
          message: errorMessage,
          created_at: new Date().toISOString(),
        });
      }
    }

    return {
      integration: "google-calendar",
      success: errors.length === 0,
      tenantsAffected,
      tokensRefreshed,
      errors,
      message: `Refreshed ${tokensRefreshed}/${tenantsAffected} Google Calendar tokens`,
    };
  } catch (error) {
    return {
      integration: "google-calendar",
      success: false,
      tenantsAffected: 0,
      tokensRefreshed: 0,
      errors: [error instanceof Error ? error.message : "Unknown error"],
      message: "Failed to refresh Google Calendar tokens",
    };
  }
}

async function refreshFacebookTokens(
  supabase: any,
  forceRefresh: boolean,
): Promise<TokenRefreshResult> {
  const errors: string[] = [];
  let tokensRefreshed = 0;
  let tenantsAffected = 0;

  try {
    // Get all organizations with Facebook integrations
    const { data: integrations, error } = await supabase
      .from("facebook_integrations")
      .select("*")
      .not("access_token", "is", null);

    if (error) throw error;

    tenantsAffected = integrations?.length || 0;

    for (const integration of integrations || []) {
      try {
        const now = new Date();
        const expiresAt = new Date(integration.expires_at);
        const shouldRefresh =
          forceRefresh || expiresAt <= new Date(now.getTime() + 86400000); // 24 hours buffer

        if (!shouldRefresh) {
          continue;
        }

        // Extend Facebook long-lived token (60 days)
        const tokenResponse = await fetch(
          `https://graph.facebook.com/v18.0/oauth/access_token?` +
            `grant_type=fb_exchange_token&` +
            `client_id=${process.env.FACEBOOK_APP_ID}&` +
            `client_secret=${process.env.FACEBOOK_APP_SECRET}&` +
            `fb_exchange_token=${integration.access_token}`,
        );

        const tokenData = await tokenResponse.json();

        if (!tokenResponse.ok) {
          throw new Error(
            `Facebook token refresh failed: ${tokenData.error?.message || "Unknown error"}`,
          );
        }

        // Update the integration with new token
        const newExpiresAt = new Date(
          now.getTime() + tokenData.expires_in * 1000,
        );

        const { error: updateError } = await supabase
          .from("facebook_integrations")
          .update({
            access_token: tokenData.access_token,
            expires_at: newExpiresAt.toISOString(),
            updated_at: now.toISOString(),
          })
          .eq("id", integration.id);

        if (updateError) throw updateError;

        tokensRefreshed++;

        // Log successful refresh
        await supabase.from("integration_logs").insert({
          organization_id: integration.organization_id,
          integration_type: "facebook",
          action: "token_refresh",
          status: "success",
          message: "Access token refreshed successfully",
          created_at: now.toISOString(),
        });
      } catch (tokenError) {
        const errorMessage =
          tokenError instanceof Error ? tokenError.message : "Unknown error";
        errors.push(`Tenant ${integration.organization_id}: ${errorMessage}`);

        // Log failed refresh
        await supabase.from("integration_logs").insert({
          organization_id: integration.organization_id,
          integration_type: "facebook",
          action: "token_refresh",
          status: "error",
          message: errorMessage,
          created_at: new Date().toISOString(),
        });
      }
    }

    return {
      integration: "facebook",
      success: errors.length === 0,
      tenantsAffected,
      tokensRefreshed,
      errors,
      message: `Refreshed ${tokensRefreshed}/${tenantsAffected} Facebook tokens`,
    };
  } catch (error) {
    return {
      integration: "facebook",
      success: false,
      tenantsAffected: 0,
      tokensRefreshed: 0,
      errors: [error instanceof Error ? error.message : "Unknown error"],
      message: "Failed to refresh Facebook tokens",
    };
  }
}

// Get token refresh history
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const authorizedEmails = ["sam@atlas-gyms.co.uk", "sam@gymleadhub.co.uk"];
    if (!authorizedEmails.includes(user.email?.toLowerCase() || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get recent token refresh logs
    const { data: refreshLogs, error } = await supabase
      .from("token_refresh_logs")
      .select("*")
      .order("refreshed_at", { ascending: false })
      .limit(50);

    if (error) {
      throw error;
    }

    return NextResponse.json({ refreshLogs });
  } catch (error) {
    console.error("Get token refresh history error:", error);
    return NextResponse.json(
      { error: "Failed to get refresh history" },
      { status: 500 },
    );
  }
}
