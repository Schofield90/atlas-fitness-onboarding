import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const { action, email, otp } = await request.json();
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    if (action === "send") {
      // Send OTP to email
      if (!email) {
        return NextResponse.json(
          { success: false, error: "Email required" },
          { status: 400 },
        );
      }

      // Find client by email
      const { data: client, error: clientError } = await adminSupabase
        .from("clients")
        .select("id, email, first_name, last_name, organization_id, user_id")
        .eq("email", email.toLowerCase().trim())
        .single();

      if (clientError || !client) {
        return NextResponse.json(
          { success: false, error: "No account found with this email address" },
          { status: 404 },
        );
      }

      // Always use OTP flow for simple-login
      // Generate random 6-digit code for all users
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

      // Delete any existing OTP for this email first (due to UNIQUE constraint)
      await adminSupabase
        .from("otp_tokens")
        .delete()
        .eq("email", email.toLowerCase());

      // Store OTP in database
      const { error: insertError } = await adminSupabase
        .from("otp_tokens")
        .insert({
          email: email.toLowerCase(),
          token: otpCode,
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        });

      if (insertError) {
        console.error("Failed to store OTP:", insertError);
        return NextResponse.json(
          { success: false, error: "Failed to generate verification code" },
          { status: 500 },
        );
      }

      console.log(`OTP for ${email}: ${otpCode}`);

      // Send OTP email
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Your Login Verification Code</h2>
          <p>Hi ${client.first_name || "there"},</p>
          <p>Your verification code is:</p>
          <div style="background: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
            ${otpCode}
          </div>
          <p>This code will expire in 10 minutes.</p>
          <p>If you didn't request this code, please ignore this email.</p>
        </div>
      `;

      // Try to send email using Resend
      if (process.env.RESEND_API_KEY) {
        try {
          const resendResponse = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from:
                process.env.RESEND_FROM_EMAIL ||
                "Atlas Fitness <noreply@gymleadhub.co.uk>",
              to: email,
              subject: `Your verification code: ${otpCode}`,
              html: emailHtml,
              text: `Your verification code is: ${otpCode}\n\nThis code will expire in 10 minutes.`,
            }),
          });

          const resendData = await resendResponse.json();

          if (!resendResponse.ok) {
            console.error("Failed to send OTP email via Resend:", resendData);
            // Don't fail the request, just log the error
          } else {
            console.log("Email sent successfully:", resendData);
          }
        } catch (emailError) {
          console.error("Email sending error:", emailError);
          // Don't fail the request, just log the error
        }
      } else {
        console.log("RESEND_API_KEY not configured - OTP email not sent");
      }

      // Return success regardless of email status
      return NextResponse.json({
        success: true,
        message: "Verification code sent!",
      });
    }

    if (action === "verify") {
      if (!email || !otp) {
        return NextResponse.json(
          { success: false, error: "Email and OTP required" },
          { status: 400 },
        );
      }

      // Verify OTP from database
      const { data: otpRecord, error: otpError } = await adminSupabase
        .from("otp_tokens")
        .select("*")
        .eq("email", email.toLowerCase())
        .eq("token", otp.trim()) // Trim any whitespace from the OTP
        .gte("expires_at", new Date().toISOString())
        .single();

      if (otpError) {
        console.error("OTP verification error:", otpError);
        console.error("Email:", email.toLowerCase(), "OTP:", otp.trim());
      }

      if (otpError || !otpRecord) {
        // Check if there's any OTP for this email to provide better error message
        const { data: anyOtp } = await adminSupabase
          .from("otp_tokens")
          .select("*")
          .eq("email", email.toLowerCase())
          .single();

        if (anyOtp) {
          console.error("OTP exists but doesn't match or is expired:", {
            provided: otp.trim(),
            stored: anyOtp.token,
            expired: new Date(anyOtp.expires_at) < new Date(),
          });
        }

        return NextResponse.json(
          { success: false, error: "Invalid or expired code" },
          { status: 400 },
        );
      }

      // Delete used OTP
      await adminSupabase.from("otp_tokens").delete().eq("id", otpRecord.id);

      // Get the client record
      const { data: client } = await adminSupabase
        .from("clients")
        .select("user_id")
        .eq("email", email.toLowerCase())
        .single();

      if (client?.user_id) {
        // Generate magic link for user
        const { data: authData, error: authError } =
          await adminSupabase.auth.admin.generateLink({
            type: "magiclink",
            email: email.toLowerCase(),
            options: {
              redirectTo: "/client/dashboard",
            },
          });

        if (!authError && authData?.properties?.action_link) {
          return NextResponse.json({
            success: true,
            authUrl: authData.properties.action_link,
          });
        }
      }

      // Fallback redirect
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
