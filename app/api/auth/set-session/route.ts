import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Sets the session cookies after successful client-side login
 * This ensures middleware can read the session from cookies
 */
export async function POST(request: NextRequest) {
  try {
    const { access_token, refresh_token } = await request.json();

    if (!access_token || !refresh_token) {
      return NextResponse.json({ error: "Missing tokens" }, { status: 400 });
    }

    // Create server client which will set httpOnly cookies
    const supabase = await createClient();

    // Set the session using the tokens from client-side login
    const { data, error } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });

    if (error) {
      console.error("[set-session] Error setting session:", error);
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    console.log(
      "[set-session] Session set successfully for:",
      data.user?.email,
    );

    // Cookies are automatically set via the cookie store in createClient()
    // Next.js will include them in the response automatically
    console.log("[set-session] Session cookies set via Supabase cookie store");

    return NextResponse.json({
      success: true,
      user: data.user,
    });
  } catch (error: any) {
    console.error("[set-session] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
