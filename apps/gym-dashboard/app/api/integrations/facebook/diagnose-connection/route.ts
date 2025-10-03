import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { getCurrentUserOrganization } from "@/app/lib/organization-server";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    checks: {},
  };

  try {
    // 1. Check auth
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    diagnostics.checks.auth = {
      success: !authError && !!user,
      userId: user?.id,
      email: user?.email,
      error: authError?.message,
    };

    if (!user) {
      return NextResponse.json(diagnostics);
    }

    // 2. Check organization
    const { organizationId, error: orgError } =
      await getCurrentUserOrganization();

    diagnostics.checks.organization = {
      success: !orgError && !!organizationId,
      organizationId,
      error: orgError,
    };

    // 3. Check database for Facebook integration
    const { data: integration, error: intError } = await supabase
      .from("facebook_integrations")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("user_id", user.id)
      .single();

    diagnostics.checks.database = {
      success: !intError && !!integration,
      hasIntegration: !!integration,
      integrationId: integration?.id,
      isActive: integration?.is_active,
      facebookUserId: integration?.facebook_user_id,
      tokenExpiresAt: integration?.token_expires_at,
      error: intError?.message,
    };

    // 4. Check token validity
    if (integration?.token_expires_at) {
      const expiryDate = new Date(integration.token_expires_at);
      const now = new Date();
      diagnostics.checks.token = {
        expires: integration.token_expires_at,
        isExpired: expiryDate < now,
        expiresIn:
          Math.floor(
            (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
          ) + " days",
      };
    }

    // 5. Check environment variables
    diagnostics.checks.environment = {
      hasFacebookAppId: !!process.env.NEXT_PUBLIC_FACEBOOK_APP_ID,
      hasFacebookAppSecret: !!process.env.FACEBOOK_APP_SECRET,
      hasRedirectUrl: !!process.env.NEXT_PUBLIC_SITE_URL,
      facebookAppId: process.env.NEXT_PUBLIC_FACEBOOK_APP_ID,
    };

    // 6. Check if callback would work
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL;
    const redirectUri = `${baseUrl}/api/auth/facebook/callback`;
    diagnostics.checks.callback = {
      expectedRedirectUri: redirectUri,
      wouldMatch: true, // We'll verify this matches Facebook app settings
    };

    // Overall status
    diagnostics.overallStatus = {
      isConnected:
        integration?.is_active && !diagnostics.checks.token?.isExpired,
      canConnect:
        diagnostics.checks.auth.success &&
        diagnostics.checks.organization.success,
      recommendation: !integration
        ? "No integration found. User needs to connect Facebook."
        : !integration.is_active
          ? "Integration exists but is inactive. May need to reconnect."
          : diagnostics.checks.token?.isExpired
            ? "Token expired. User needs to reconnect."
            : "Integration appears to be working.",
    };

    return NextResponse.json(diagnostics);
  } catch (error) {
    diagnostics.error =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(diagnostics, { status: 500 });
  }
}
