import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

// GET /api/admin/stripe/callback
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (!code) {
      return NextResponse.redirect(
        new URL("/admin/settings/stripe?error=missing_code", request.url),
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || user.email?.toLowerCase() !== "sam@gymleadhub.co.uk") {
      return NextResponse.redirect(
        new URL("/admin/settings/stripe?error=unauthorized", request.url),
      );
    }

    // Exchange code for access token
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2024-11-20.acacia",
    });

    const response = await stripe.oauth.token({
      grant_type: "authorization_code",
      code,
    });

    const adminSupabase = createAdminClient();

    // Store the connected account
    const { error } = await adminSupabase
      .from("platform_stripe_accounts")
      .upsert({
        platform_id: "platform",
        stripe_account_id: response.stripe_user_id,
        access_token: response.access_token,
        refresh_token: response.refresh_token,
        scope: response.scope,
        connected_at: new Date().toISOString(),
      });

    if (error) {
      console.error("Error saving Stripe account:", error);
      return NextResponse.redirect(
        new URL("/admin/settings/stripe?error=save_failed", request.url),
      );
    }

    return NextResponse.redirect(
      new URL("/admin/settings/stripe?stripe_success=true", request.url),
    );
  } catch (error: any) {
    console.error("Stripe OAuth callback error:", error);
    return NextResponse.redirect(
      new URL(
        `/admin/settings/stripe?error=${encodeURIComponent(error.message)}`,
        request.url,
      ),
    );
  }
}
