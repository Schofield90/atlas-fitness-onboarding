import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Get current authenticated user from httpOnly cookies
 * This endpoint allows Client Components to check auth status
 * without needing direct access to httpOnly cookies
 */
export async function GET(request: NextRequest) {
  try {
    // Create server client which reads httpOnly cookies
    const supabase = await createClient();

    // Get user from session stored in httpOnly cookies
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Get user role from database
    const { data: userRecord } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        role: userRecord?.role || null,
      },
    });
  } catch (error: any) {
    console.error("[user] Error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
