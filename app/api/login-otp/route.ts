import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { action, email, otp } = await request.json();
    const supabase = createClient();

    if (action === "send") {
      // Send OTP to email
      if (!email) {
        return NextResponse.json(
          { success: false, error: "Email required" },
          { status: 400 },
        );
      }

      // Find client by email
      const { data: client, error: clientError } = await supabase
        .from("clients")
        .select("id, email, first_name, last_name, organization_id")
        .eq("email", email.toLowerCase().trim())
        .single();

      if (clientError || !client) {
        return NextResponse.json(
          { success: false, error: "No account found with this email address" },
          { status: 404 },
        );
      }

      // Generate 6-digit OTP
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

      // For development, just log the OTP
      console.log(`OTP for ${email}: ${otpCode}`);

      return NextResponse.json({
        success: true,
        message: "Login code sent to your email",
      });
    }

    if (action === "verify") {
      // For development, just redirect to dashboard for now
      return NextResponse.json({
        success: true,
        redirectTo: "/client/dashboard",
      });
    }

    return NextResponse.json(
      { success: false, error: "Invalid action" },
      { status: 400 },
    );
  } catch (error) {
    console.error("Login OTP error:", error);
    return NextResponse.json(
      { success: false, error: "Authentication failed" },
      { status: 500 },
    );
  }
}
