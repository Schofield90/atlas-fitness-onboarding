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

// POST /api/admin/stripe/disconnect
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const authCheck = await checkAdminAuth(supabase);

    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: 401 });
    }

    const adminSupabase = createAdminClient();

    // Delete the connected account
    const { error } = await adminSupabase
      .from("platform_stripe_accounts")
      .delete()
      .eq("platform_id", "platform");

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error disconnecting Stripe:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
