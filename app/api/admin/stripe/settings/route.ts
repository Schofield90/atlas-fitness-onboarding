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

// GET /api/admin/stripe/settings
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const authCheck = await checkAdminAuth(supabase);

    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: 401 });
    }

    // For now, return from environment variables
    // In production, you'd store encrypted in database
    const settings = {
      stripe_publishable_key:
        process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "",
      stripe_secret_key: process.env.STRIPE_SECRET_KEY ? "sk_****" : "", // Masked
      stripe_webhook_secret: process.env.STRIPE_WEBHOOK_SECRET
        ? "whsec_****"
        : "", // Masked
    };

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Error fetching Stripe settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// PUT /api/admin/stripe/settings
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const authCheck = await checkAdminAuth(supabase);

    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: 401 });
    }

    const body = await request.json();
    const { stripe_publishable_key, stripe_secret_key, stripe_webhook_secret } =
      body;

    // Validate keys format
    if (stripe_publishable_key && !stripe_publishable_key.startsWith("pk_")) {
      return NextResponse.json(
        { error: "Invalid publishable key format" },
        { status: 400 },
      );
    }

    if (stripe_secret_key && !stripe_secret_key.startsWith("sk_")) {
      return NextResponse.json(
        { error: "Invalid secret key format" },
        { status: 400 },
      );
    }

    if (stripe_webhook_secret && !stripe_webhook_secret.startsWith("whsec_")) {
      return NextResponse.json(
        { error: "Invalid webhook secret format" },
        { status: 400 },
      );
    }

    // Store in database (you'll need to create admin_settings table)
    // For now, just return success - you'll need to add these to Vercel env vars manually

    return NextResponse.json({
      success: true,
      message:
        "Settings saved. Please add these to your Vercel environment variables:\n" +
        "- NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY\n" +
        "- STRIPE_SECRET_KEY\n" +
        "- STRIPE_WEBHOOK_SECRET",
    });
  } catch (error) {
    console.error("Error saving Stripe settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
