import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { access_token, refresh_token, redirect_to } = await request.json();

    if (!access_token || !refresh_token) {
      return NextResponse.json(
        { error: "Missing session tokens" },
        { status: 400 },
      );
    }

    // Create server-side Supabase client
    const supabase = await createClient();

    // Set the session server-side (this will set proper cookies)
    const { data, error } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });

    if (error) {
      console.error("Failed to set session:", error);
      return NextResponse.json(
        { error: "Failed to set session", details: error.message },
        { status: 500 },
      );
    }

    if (!data.session) {
      return NextResponse.json(
        { error: "Session not established" },
        { status: 500 },
      );
    }

    // Verify the session was set
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Session verification failed" },
        { status: 500 },
      );
    }

    console.log("Session set successfully for user:", user.email);

    // Return success with redirect URL
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
      },
      redirect_to: redirect_to || "/client/dashboard",
    });
  } catch (error) {
    console.error("Set session error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
