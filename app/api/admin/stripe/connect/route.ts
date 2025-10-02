import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

export const dynamic = "force-dynamic";

async function checkAdminAuth(supabase: any) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { authorized: false, error: "Not authenticated" };
  }

  const authorizedEmails = ["sam@gymleadhub.co.uk"];
  if (!authorizedEmails.includes(user.email?.toLowerCase() || "")) {
    return { authorized: false, error: "Not authorized for admin access" };
  }

  return { authorized: true, user };
}

// GET /api/admin/stripe/connect
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const authCheck = await checkAdminAuth(supabase);

    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: 401 });
    }

    // Build Stripe OAuth URL
    const clientId = process.env.STRIPE_CLIENT_ID;
    const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL || "https://admin.gymleadhub.co.uk"}/api/admin/stripe/callback`;

    if (!clientId) {
      return NextResponse.json(
        { error: "Stripe client ID not configured" },
        { status: 500 },
      );
    }

    const state = Buffer.from(JSON.stringify({ admin: true })).toString(
      "base64",
    );

    const stripeAuthUrl = `https://connect.stripe.com/oauth/authorize?${new URLSearchParams(
      {
        response_type: "code",
        client_id: clientId,
        scope: "read_write",
        redirect_uri: redirectUri,
        state,
      },
    )}`;

    return NextResponse.json({ url: stripeAuthUrl });
  } catch (error) {
    console.error("Error initiating Stripe connect:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
