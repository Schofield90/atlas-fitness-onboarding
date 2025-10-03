import { createClient } from "@/app/lib/supabase/server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

// EMERGENCY LOGIN ENDPOINT - REMOVE AFTER USE
// This creates a session directly for the admin user

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    // TEMPORARY HARDCODED CHECK - REMOVE AFTER USE
    if (email === "sam@gymleadhub.co.uk" && password === "@Aa80236661") {
      const supabase = await createClient();

      // Get the user from database
      const { data: adminUser } = await supabase
        .from("super_admin_users")
        .select("*")
        .eq("email", email)
        .eq("is_active", true)
        .single();

      if (adminUser && adminUser.role === "platform_owner") {
        // Create a session token manually
        const sessionData = {
          user_id: adminUser.user_id,
          email: adminUser.email,
          role: "admin",
          is_admin: true,
        };

        // Set a cookie to bypass auth temporarily
        cookies().set("admin_bypass_session", JSON.stringify(sessionData), {
          httpOnly: true,
          secure: true,
          sameSite: "strict",
          maxAge: 60 * 60 * 24, // 24 hours
          path: "/",
        });

        return NextResponse.json({
          success: true,
          message: "Emergency login successful",
          redirect: "/admin/dashboard",
        });
      }
    }

    return NextResponse.json(
      {
        success: false,
        message: "Invalid credentials",
      },
      { status: 401 },
    );
  } catch (error) {
    console.error("Emergency login error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Emergency login failed",
      },
      { status: 500 },
    );
  }
}
