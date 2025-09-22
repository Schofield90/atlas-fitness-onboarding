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
        .select("user_id, organization_id")
        .eq("email", email.toLowerCase())
        .single();

      if (!client) {
        return NextResponse.json(
          { success: false, error: "Client record not found" },
          { status: 404 },
        );
      }

      // For members/clients, we'll handle auth differently
      // Instead of using magic links (which can redirect wrongly),
      // we'll sign them in directly using the admin API
      if (client.user_id) {
        // Sign the user in directly - this supports multiple concurrent sessions by default
        try {
          const { data: sessionData, error: sessionError } =
            await adminSupabase.auth.admin.createSession({
              user_id: client.user_id,
            });

          if (sessionError) {
            console.error("Session creation error:", sessionError);

            // Log detailed error for debugging multi-device issues
            console.error("Session error details:", {
              message: sessionError.message,
              status: sessionError.status,
              user_id: client.user_id,
              email: email.toLowerCase(),
            });

            // Try to generate a magic link as fallback
            const { data: linkData, error: linkError } =
              await adminSupabase.auth.admin.generateLink({
                type: "magiclink",
                email: email.toLowerCase(),
                options: {
                  redirectTo:
                    "https://members.gymleadhub.co.uk/client/dashboard",
                },
              });

            if (!linkError && linkData?.properties?.action_link) {
              return NextResponse.json({
                success: true,
                authUrl: linkData.properties.action_link,
                redirectTo: "/client/dashboard",
                userRole: "member",
                sessionMethod: "magic_link_fallback",
              });
            }

            // If both methods fail, return error
            return NextResponse.json(
              {
                success: false,
                error: "Unable to create session. Please try again.",
                sessionError: sessionError.message,
              },
              { status: 500 },
            );
          }

          if (sessionData?.session) {
            // Log successful session creation for debugging
            console.log("Multi-device session created successfully:", {
              user_id: client.user_id,
              session_id:
                sessionData.session.access_token.split(".")[1] || "unknown",
              expires_at: sessionData.session.expires_at,
            });

            // Return the session tokens for the client to set
            return NextResponse.json({
              success: true,
              session: {
                access_token: sessionData.session.access_token,
                refresh_token: sessionData.session.refresh_token,
                expires_at: sessionData.session.expires_at,
              },
              redirectTo: "/client/dashboard",
              userRole: "member",
              sessionMethod: "admin_create_session",
            });
          }
        } catch (error) {
          console.error("Unexpected session error:", error);

          // Enhanced error logging for multi-device debugging
          console.error("Multi-device session creation failed:", {
            user_id: client.user_id,
            error_message:
              error instanceof Error ? error.message : "Unknown error",
            error_stack: error instanceof Error ? error.stack : undefined,
          });
        }
      }

      // Fallback - just return redirect URL for client-side handling
      // This handles cases where user doesn't have a user_id yet
      return NextResponse.json({
        success: true,
        redirectTo: "/client/dashboard",
        userRole: "member", // Explicitly set role as member
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
