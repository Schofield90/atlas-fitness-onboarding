import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

/**
 * Session validation endpoint for multi-device support
 * Helps diagnose and resolve concurrent session issues
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    // Get current session from request
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      return NextResponse.json(
        {
          success: false,
          error: "Session validation failed",
          details: sessionError.message,
        },
        { status: 401 },
      );
    }

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: "No active session found",
        },
        { status: 401 },
      );
    }

    // Validate session with admin client to ensure it's still valid
    const { data: user, error: userError } =
      await adminSupabase.auth.admin.getUserById(session.user.id);

    if (userError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: "User session invalid",
          details: userError?.message,
        },
        { status: 401 },
      );
    }

    return NextResponse.json({
      success: true,
      session: {
        id: session.access_token.split(".")[1], // Extract session ID for debugging
        user_id: session.user.id,
        expires_at: session.expires_at,
        created_at: session.user.created_at,
      },
      user: {
        id: user.user.id,
        email: user.user.email,
        last_sign_in_at: user.user.last_sign_in_at,
      },
    });
  } catch (error) {
    console.error("Session check error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Session validation failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

/**
 * Force refresh session endpoint
 * Useful for resolving stale session issues
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Attempt to refresh the current session
    const { data, error } = await supabase.auth.refreshSession();

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: "Session refresh failed",
          details: error.message,
        },
        { status: 401 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Session refreshed successfully",
      session: {
        access_token: data.session?.access_token,
        refresh_token: data.session?.refresh_token,
        expires_at: data.session?.expires_at,
      },
    });
  } catch (error) {
    console.error("Session refresh error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Session refresh failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
