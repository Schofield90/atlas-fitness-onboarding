import { createClient } from "@/app/lib/supabase/server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const supabase = createClient();

    // Get current session
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session) {
      // Force refresh the session
      const { data, error } = await supabase.auth.refreshSession(session);

      if (error) {
        return NextResponse.json({
          success: false,
          error: "Failed to refresh session",
          debug: { error: error.message },
        });
      }

      return NextResponse.json({
        success: true,
        message: "Session refreshed successfully",
        debug: {
          oldExpiry: session.expires_at,
          newExpiry: data.session?.expires_at,
          user: data.user?.email,
        },
      });
    } else {
      return NextResponse.json({
        success: false,
        error: "No active session found",
        debug: { hasSession: false },
      });
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: "Server error",
      debug: { error: error.message },
    });
  }
}

export async function DELETE() {
  try {
    const supabase = createClient();

    // Sign out completely
    await supabase.auth.signOut();

    // Clear all auth cookies
    const cookieStore = cookies();
    const authCookies = [
      "sb-lzlrojoaxrqvmhempnkn-auth-token",
      "sb-lzlrojoaxrqvmhempnkn-auth-token.0",
      "sb-lzlrojoaxrqvmhempnkn-auth-token.1",
    ];

    authCookies.forEach((cookieName) => {
      cookieStore.delete(cookieName);
    });

    return NextResponse.json({
      success: true,
      message: "Session cleared completely",
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: "Failed to clear session",
      debug: { error: error.message },
    });
  }
}
