import { createClient } from "@/app/lib/supabase/server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

// Custom authentication endpoint that bypasses Supabase Auth
// Only use this if Supabase Auth schema is completely broken
export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    // Validate email domain
    if (!email.endsWith("@gymleadhub.co.uk")) {
      return NextResponse.json(
        {
          success: false,
          message: "Access restricted to @gymleadhub.co.uk email addresses",
        },
        { status: 403 },
      );
    }

    const supabase = createClient();

    // Get admin user from super_admin_users table
    const { data: adminUser, error } = await supabase
      .from("super_admin_users")
      .select("*")
      .eq("email", email)
      .eq("is_active", true)
      .single();

    if (error || !adminUser) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid credentials",
        },
        { status: 401 },
      );
    }

    // For now, use a simple password check
    // In production, you'd hash the password and compare
    if (password !== "@Aa80236661") {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid credentials",
        },
        { status: 401 },
      );
    }

    // Create session data
    const sessionData = {
      user_id: adminUser.user_id || adminUser.id,
      email: adminUser.email,
      role: adminUser.role,
      is_admin: true,
      permissions: adminUser.permissions,
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
    };

    // Set secure session cookie
    (await cookies()).set("custom_admin_session", JSON.stringify(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    });

    return NextResponse.json({
      success: true,
      message: "Authentication successful",
      user: {
        id: sessionData.user_id,
        email: sessionData.email,
        role: sessionData.role,
      },
    });
  } catch (error) {
    console.error("Custom signin error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Authentication failed",
      },
      { status: 500 },
    );
  }
}
