import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/app/lib/supabase/server";
import { getCurrentUserOrganization } from "@/app/lib/organization-server";
import {
  handleFacebookCallback,
  validateFacebookEnv,
} from "@/app/lib/facebook/callback-handler";

export const runtime = "nodejs"; // Force Node.js runtime for better env var support

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const state = searchParams.get("state");

  // Check for errors from Facebook
  if (error) {
    const errorDescription =
      searchParams.get("error_description") || "Unknown error";
    console.error("Facebook OAuth error:", error, errorDescription);

    // Check if connection was initiated from settings
    const cookieStore = await cookies();
    const fromSettings =
      cookieStore.get("facebook_connect_from_settings")?.value === "true";

    if (fromSettings) {
      // Clear the cookie and redirect to settings with error
      cookieStore.delete("facebook_connect_from_settings");
      const settingsUrl = new URL(
        "/settings/integrations/facebook",
        request.url,
      );
      settingsUrl.searchParams.set("error", error);
      settingsUrl.searchParams.set("error_description", errorDescription);
      return NextResponse.redirect(settingsUrl);
    }

    // Default redirect to integrations callback page with error
    const callbackUrl = new URL("/integrations/facebook/callback", request.url);
    callbackUrl.searchParams.set("error", error);
    callbackUrl.searchParams.set("error_description", errorDescription);

    return NextResponse.redirect(callbackUrl);
  }

  // Verify state parameter for security
  const expectedState =
    process.env.FACEBOOK_OAUTH_STATE || "secure_oauth_state";
  if (state !== expectedState) {
    console.error("❌ Invalid OAuth state parameter:", state);
    const callbackUrl = new URL("/integrations/facebook/callback", request.url);
    callbackUrl.searchParams.set("error", "invalid_state");
    callbackUrl.searchParams.set("error_description", "OAuth state mismatch");

    return NextResponse.redirect(callbackUrl);
  }

  // Check if we received an authorization code
  if (!code) {
    console.error("No authorization code received");
    const callbackUrl = new URL("/integrations/facebook/callback", request.url);
    callbackUrl.searchParams.set("error", "no_code");

    return NextResponse.redirect(callbackUrl);
  }

  try {
    console.log(
      "🔄 Facebook OAuth code received:",
      code.substring(0, 10) + "...",
    );

    // Validate environment first
    const envCheck = validateFacebookEnv();
    if (!envCheck.valid) {
      console.error("❌ Environment validation failed:", envCheck.error);
      const callbackUrl = new URL(
        "/integrations/facebook/callback",
        request.url,
      );
      callbackUrl.searchParams.set("error", "configuration_error");
      callbackUrl.searchParams.set(
        "error_description",
        envCheck.error || "Missing required environment variables",
      );
      return NextResponse.redirect(callbackUrl);
    }

    // Get current user and organization
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("❌ User not authenticated during OAuth callback");
      const callbackUrl = new URL(
        "/integrations/facebook/callback",
        request.url,
      );
      callbackUrl.searchParams.set("error", "authentication_required");
      return NextResponse.redirect(callbackUrl);
    }

    let { organizationId, error: orgError } =
      await getCurrentUserOrganization();

    if (orgError || !organizationId) {
      // Require an existing organization; do not assign a default
      const callbackUrl = new URL(
        "/integrations/facebook/callback",
        request.url,
      );
      callbackUrl.searchParams.set("error", "organization_required");
      return NextResponse.redirect(callbackUrl);
    }

    // Use our new handler function
    const result = await handleFacebookCallback({
      code,
      state: state || "",
      organizationId,
      userId: user.id,
    });

    if (!result.success) {
      console.error("❌ Callback handler failed:", result.error);
      const callbackUrl = new URL(
        "/integrations/facebook/callback",
        request.url,
      );
      callbackUrl.searchParams.set("error", "processing_failed");
      callbackUrl.searchParams.set(
        "error_description",
        result.error || "Failed to complete OAuth flow",
      );
      return NextResponse.redirect(callbackUrl);
    }

    console.log("✅ Facebook integration completed successfully");

    // Check if connection was initiated from settings
    const cookieStore = await cookies();
    const fromSettings =
      cookieStore.get("facebook_connect_from_settings")?.value === "true";

    if (fromSettings) {
      // Clear the cookie
      cookieStore.delete("facebook_connect_from_settings");

      // Redirect back to settings with success indicator
      const settingsUrl = new URL(
        "/settings/integrations/facebook",
        request.url,
      );
      settingsUrl.searchParams.set("just_connected", "true");
      return NextResponse.redirect(settingsUrl);
    } else {
      // Default redirect to integrations page
      const callbackUrl = new URL(
        "/integrations/facebook/callback",
        request.url,
      );
      callbackUrl.searchParams.set("success", "true");
      callbackUrl.searchParams.set("user_id", result.data.facebook_user_id);
      callbackUrl.searchParams.set(
        "user_name",
        result.data.facebook_user_name || "",
      );
      callbackUrl.searchParams.set("state", state || "");

      return NextResponse.redirect(callbackUrl);
    }
  } catch (error) {
    console.error("Error processing Facebook OAuth:", error);

    const callbackUrl = new URL("/integrations/facebook/callback", request.url);
    callbackUrl.searchParams.set("error", "processing_error");

    return NextResponse.redirect(callbackUrl);
  }
}
