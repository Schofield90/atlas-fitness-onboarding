import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get the hostname to check subdomain
    const hostname = request.headers.get("host") || "";
    const url = new URL(request.url);

    // Check all cookies
    const cookies = request.cookies.getAll();
    const authCookies = cookies.filter(
      (c) =>
        c.name.includes("auth") ||
        c.name.includes("supabase") ||
        c.name.includes("sb-"),
    );

    // Get session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    // Get user (this validates the session)
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    return NextResponse.json({
      success: true,
      data: {
        hostname,
        subdomain: hostname.split(".")[0],
        isProduction: hostname.includes("gymleadhub.co.uk"),
        cookies: {
          total: cookies.length,
          authCookies: authCookies.map((c) => ({
            name: c.name,
            domain: c.domain,
            path: c.path,
            secure: c.secure,
            sameSite: c.sameSite,
            hasValue: !!c.value,
            valueLength: c.value?.length || 0,
          })),
        },
        session: {
          exists: !!session,
          userId: session?.user?.id,
          email: session?.user?.email,
          expiresAt: session?.expires_at,
          error: sessionError?.message,
        },
        user: {
          exists: !!user,
          id: user?.id,
          email: user?.email,
          error: userError?.message,
        },
        cookieConfig: {
          expectedDomain: hostname.includes("gymleadhub.co.uk")
            ? ".gymleadhub.co.uk"
            : "localhost",
          expectedPath: "/",
          expectedSameSite: "lax",
        },
      },
    });
  } catch (error) {
    console.error("Test auth cookies error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to test auth cookies",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
