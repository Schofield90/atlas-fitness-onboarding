import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

// Generate a 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, email, otp } = body;

    const supabase = await createClient();
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Action 1: Send OTP for login
    if (action === "send-otp") {
      if (!email) {
        return NextResponse.json(
          { error: "Email is required" },
          { status: 400 },
        );
      }

      // Check if user exists and has claimed account
      const { data: client, error: clientError } = await supabase
        .from("clients")
        .select("id, first_name, last_name, user_id, phone, email")
        .ilike("email", email)
        .maybeSingle();

      if (!client) {
        return NextResponse.json(
          { error: "No account found with this email address." },
          { status: 404 },
        );
      }

      if (!client.user_id) {
        return NextResponse.json(
          {
            error:
              "Account not claimed yet. Please use the claim account flow.",
          },
          { status: 400 },
        );
      }

      // Generate OTP
      const otpCode = generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

      // Get the default organization_id
      const { data: orgData } = await supabase
        .from("organizations")
        .select("id")
        .limit(1)
        .single();

      const organizationId = orgData?.id;

      // Store OTP in database (reuse account_claim_tokens table)
      const { error: upsertError } = await supabase
        .from("account_claim_tokens")
        .upsert(
          {
            client_id: client.id,
            email: email.toLowerCase(),
            token: otpCode,
            expires_at: expiresAt,
            claimed_at: null,
            organization_id: organizationId,
            metadata: {
              type: "login_otp",
              created_at: new Date().toISOString(),
            },
          },
          {
            onConflict: "client_id",
            ignoreDuplicates: false,
          },
        );

      if (upsertError) {
        console.error("[LOGIN OTP] Failed to store OTP:", upsertError);
        return NextResponse.json(
          { error: "Failed to generate verification code" },
          { status: 500 },
        );
      }

      // Send OTP email
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Your Login Verification Code</h2>
          <p>Hi ${client.first_name || "there"},</p>
          <p>Your login verification code is:</p>
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
              from: "Atlas Fitness <sam@email.gymleadhub.co.uk>",
              to: email,
              subject: `Your login code: ${otpCode}`,
              html: emailHtml,
            }),
          });

          const resendData = await resendResponse.json();

          if (!resendResponse.ok) {
            console.error(
              "Failed to send login OTP email via Resend:",
              resendData,
            );
          }
        } catch (emailError) {
          console.error("Email sending error:", emailError);
        }
      }

      const response: any = {
        success: true,
        message: "Login code sent to your email",
      };

      // Show OTP in test mode
      if (
        process.env.SHOW_OTP_FOR_TESTING === "true" ||
        process.env.NODE_ENV === "development"
      ) {
        response.testModeOTP = otpCode;
        response.testModeWarning = "⚠️ TEST MODE: OTP shown for debugging.";
      }

      return NextResponse.json(response);
    }

    // Action 2: Verify OTP and create session
    if (action === "verify-otp") {
      if (!email || !otp) {
        return NextResponse.json(
          { error: "Email and verification code are required" },
          { status: 400 },
        );
      }

      // Check OTP
      const { data: tokenData, error: tokenError } = await supabase
        .from("account_claim_tokens")
        .select("*")
        .ilike("email", email)
        .eq("token", otp)
        .maybeSingle();

      if (!tokenData) {
        return NextResponse.json(
          { error: "Invalid verification code" },
          { status: 400 },
        );
      }

      // Check if expired
      const now = new Date();
      const expiresAt = new Date(tokenData.expires_at);

      if (expiresAt < now) {
        return NextResponse.json(
          { error: "Verification code has expired. Please request a new one." },
          { status: 400 },
        );
      }

      // Get client data
      const { data: client } = await supabase
        .from("clients")
        .select("*")
        .eq("id", tokenData.client_id)
        .single();

      if (!client || !client.user_id) {
        return NextResponse.json(
          { error: "Account not found or not claimed" },
          { status: 404 },
        );
      }

      // Mark token as used
      await supabase
        .from("account_claim_tokens")
        .update({ claimed_at: new Date().toISOString() })
        .eq("client_id", client.id)
        .eq("token", otp);

      // Generate a one-time sign-in token for the user
      const { data: tokenData, error: tokenError } =
        await supabaseAdmin.auth.admin.generateLink({
          type: "magiclink",
          email: email,
        });

      let redirectUrl = undefined;
      if (tokenData?.properties?.action_link) {
        redirectUrl = tokenData.properties.action_link;
      }

      return NextResponse.json({
        success: true,
        message: "Successfully signed in!",
        email: email,
        userId: client.user_id,
        authUrl: redirectUrl, // Send the auth URL for automatic sign-in
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error in login OTP process:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
