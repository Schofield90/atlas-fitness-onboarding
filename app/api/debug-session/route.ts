import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = await createClient();

    // Get all auth-related cookies
    const authCookies: Record<string, string> = {};
    cookieStore.getAll().forEach((cookie) => {
      if (cookie.name.includes("auth") || cookie.name.includes("supabase")) {
        authCookies[cookie.name] = cookie.value.substring(0, 50) + "...";
      }
    });

    // Try to get session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    // Try to get user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    // Get hostname and subdomain
    const hostname = request.headers.get("host") || "";
    const subdomain = hostname.split(".")[0];

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      hostname,
      subdomain,
      cookies: {
        count: Object.keys(authCookies).length,
        names: Object.keys(authCookies),
        preview: authCookies,
      },
      session: {
        exists: !!session,
        user_id: session?.user?.id,
        email: session?.user?.email,
        expires_at: session?.expires_at,
        error: sessionError?.message,
      },
      user: {
        exists: !!user,
        id: user?.id,
        email: user?.email,
        error: userError?.message,
      },
    });
  } catch (error) {
    console.error("Debug session error:", error);
    return NextResponse.json(
      {
        error: "Failed to debug session",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
