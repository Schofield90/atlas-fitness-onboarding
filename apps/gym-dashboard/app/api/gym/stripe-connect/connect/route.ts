import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's organization
    const { data: userOrg } = await supabase
      .from("user_organizations")
      .select("organization_id")
      .eq("user_id", user.id)
      .single();

    if (!userOrg) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 404 },
      );
    }

    const clientId = process.env.STRIPE_CONNECT_CLIENT_ID;
    const redirectUri = `${process.env.NEXT_PUBLIC_GYM_DASHBOARD_URL || "https://login.gymleadhub.co.uk"}/api/gym/stripe-connect/callback`;

    if (!clientId) {
      return NextResponse.json(
        { error: "Stripe Connect not configured" },
        { status: 500 },
      );
    }

    // Encode state with organization and user info
    const state = Buffer.from(
      JSON.stringify({
        organization_id: userOrg.organization_id,
        user_id: user.id,
      }),
    ).toString("base64");

    // OAuth URL - user can sign in to existing account OR create new one
    const stripeAuthUrl = `https://connect.stripe.com/oauth/authorize?${new URLSearchParams(
      {
        response_type: "code",
        client_id: clientId,
        scope: "read_write",
        redirect_uri: redirectUri,
        state,
        // This allows connecting existing accounts OR creating new ones
        "stripe_user[email]": user.email || "",
      },
    )}`;

    return NextResponse.json({ url: stripeAuthUrl });
  } catch (error) {
    console.error("Error initiating Stripe Connect:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
