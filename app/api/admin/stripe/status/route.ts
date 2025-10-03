import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import Stripe from "stripe";

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

// GET /api/admin/stripe/status
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const authCheck = await checkAdminAuth(supabase);

    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: 401 });
    }

    // Check if Stripe API key is configured and working
    const stripeKey = process.env.STRIPE_SECRET_KEY;

    if (!stripeKey) {
      return NextResponse.json({ connected: false });
    }

    // Try to retrieve account info from Stripe
    const stripe = new Stripe(stripeKey, {
      apiVersion: "2024-11-20.acacia",
    });

    const account = await stripe.accounts.retrieve();

    return NextResponse.json({
      connected: true,
      account: {
        id: account.id,
        country: account.country,
        default_currency: account.default_currency,
        email: account.email,
      },
    });
  } catch (error) {
    console.error("Error checking Stripe status:", error);
    return NextResponse.json({ connected: false });
  }
}
