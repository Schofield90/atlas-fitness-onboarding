import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

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

    const adminSupabase = createAdminClient();

    // Check if platform Stripe account is connected
    const { data: stripeAccount } = await adminSupabase
      .from("platform_stripe_accounts")
      .select("*")
      .eq("platform_id", "platform") // Fixed platform ID for admin
      .single();

    if (!stripeAccount || !stripeAccount.stripe_account_id) {
      return NextResponse.json({ connected: false });
    }

    return NextResponse.json({
      connected: true,
      account: {
        id: stripeAccount.stripe_account_id,
        country: stripeAccount.country,
        default_currency: stripeAccount.default_currency,
        email: stripeAccount.email,
      },
    });
  } catch (error) {
    console.error("Error checking Stripe status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
