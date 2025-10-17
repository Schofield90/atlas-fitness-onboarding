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

// GET /api/admin/stripe/test
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const authCheck = await checkAdminAuth(supabase);

    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: 401 });
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

    if (!stripeSecretKey) {
      return NextResponse.json(
        { error: "Stripe secret key not configured" },
        { status: 400 },
      );
    }

    // Test Stripe connection
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2024-11-20.acacia",
    });

    // Try to retrieve account info to test connection
    const account = await stripe.accounts.retrieve();

    return NextResponse.json({
      success: true,
      message: "Stripe connection successful",
      account: {
        id: account.id,
        country: account.country,
        default_currency: account.default_currency,
        email: account.email,
      },
    });
  } catch (error: any) {
    console.error("Stripe test error:", error);
    return NextResponse.json(
      {
        error: "Stripe connection failed",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
