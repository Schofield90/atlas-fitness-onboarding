/**
 * GoCardless OAuth Callback Handler
 * Processes the OAuth callback and stores access tokens
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { goCardlessService } from "@/app/lib/gocardless-server";
import { redirect } from "next/navigation";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    // Handle OAuth errors
    if (error) {
      console.error("GoCardless OAuth error:", error, errorDescription);
      return redirect(
        `/billing?error=${encodeURIComponent(errorDescription || error)}`,
      );
    }

    if (!code || !state) {
      return redirect("/billing?error=Invalid callback parameters");
    }

    const supabase = createClient();

    // Verify state parameter
    const { data: oauthState } = await supabase
      .from("oauth_states")
      .select("organization_id")
      .eq("state", state)
      .eq("provider", "gocardless")
      .gte("expires_at", new Date().toISOString())
      .single();

    if (!oauthState) {
      return redirect("/billing?error=Invalid or expired OAuth state");
    }

    // Clean up used state
    await supabase.from("oauth_states").delete().eq("state", state);

    // Exchange code for access token
    const redirectUri =
      process.env.GOCARDLESS_REDIRECT_URI ||
      `${process.env.NEXT_PUBLIC_APP_URL}/api/connect/gocardless/callback`;

    const tokenData = await goCardlessService.exchangeCode(code, redirectUri);

    // Store connected account details
    await goCardlessService.storeConnectedAccount({
      organizationId: oauthState.organization_id,
      accessToken: tokenData.accessToken,
      organizationGcId: tokenData.organizationId,
      creditorId: tokenData.creditorId,
    });

    // Redirect to billing page with success message
    return redirect("/billing?success=GoCardless connected successfully");
  } catch (error) {
    console.error("Error processing GoCardless callback:", error);
    return redirect(
      `/billing?error=${encodeURIComponent("Failed to connect GoCardless account")}`,
    );
  }
}
