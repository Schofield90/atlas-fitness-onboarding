import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { MetaMessengerClient } from "@/app/lib/meta/client";
import { encrypt } from "@/app/lib/encryption";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_URL}/settings/integrations?error=${encodeURIComponent(error)}`,
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_URL}/settings/integrations?error=missing_params`,
    );
  }

  const supabase = await createClient();

  // Verify state and get organization
  const { data: oauthState } = await supabase
    .from("oauth_states")
    .select("*")
    .eq("state", state)
    .eq("provider", "facebook")
    .gte("expires_at", new Date().toISOString())
    .single();

  if (!oauthState) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_URL}/settings/integrations?error=invalid_state`,
    );
  }

  // Delete used state
  await supabase.from("oauth_states").delete().eq("state", state);

  try {
    // Exchange code for access token
    const redirectUri =
      process.env.META_OAUTH_REDIRECT_URI ||
      `${process.env.NEXT_PUBLIC_URL}/api/integrations/meta/callback`;
    const userAccessToken = await MetaMessengerClient.exchangeCodeForToken(
      code,
      redirectUri,
    );

    // Get user's pages
    const client = new MetaMessengerClient();
    const pages = await client.getUserPages(userAccessToken);

    if (pages.length === 0) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_URL}/settings/integrations?error=no_pages`,
      );
    }

    // If only one page, auto-select it. Otherwise, redirect to page selector
    if (pages.length === 1) {
      const page = pages[0];

      // Subscribe to webhooks
      await client.subscribePageToWebhooks(page.id, page.access_token);

      // Store encrypted token
      const encryptedToken = encrypt(page.access_token);

      // Save integration account
      await supabase.from("integration_accounts").upsert(
        {
          organization_id: oauthState.organization_id,
          provider: "facebook",
          page_id: page.id,
          page_name: page.name,
          page_access_token: encryptedToken,
          status: "active",
          metadata: {
            category: page.category,
            tasks: page.tasks || [],
          },
        },
        {
          onConflict: "organization_id,provider,page_id",
        },
      );

      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_URL}/settings/integrations?success=connected`,
      );
    } else {
      // Store pages temporarily and redirect to selector
      await supabase.from("temp_oauth_data").insert({
        user_id: oauthState.user_id,
        organization_id: oauthState.organization_id,
        provider: "facebook",
        data: { pages },
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      });

      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_URL}/settings/integrations/meta/select-page`,
      );
    }
  } catch (error) {
    console.error("Meta OAuth callback error:", error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_URL}/settings/integrations?error=connection_failed`,
    );
  }
}
