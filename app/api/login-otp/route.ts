import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import {
  checkAuthRateLimit,
  createRateLimitResponse,
} from "@/app/lib/rate-limit";
import { validateEmail, validateOTP } from "@/app/lib/input-sanitizer";

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

      // Validate and sanitize email
      const emailValidation = validateEmail(email);
      if (!emailValidation.valid) {
        return NextResponse.json(
          { success: false, error: "Invalid email address" },
          { status: 400 },
        );
      }
      const sanitizedEmail = emailValidation.sanitized;

      // Check rate limit for OTP sending
      const rateLimitCheck = checkAuthRateLimit(
        request,
        "otpSend",
        sanitizedEmail,
      );
      if (!rateLimitCheck.allowed) {
        return createRateLimitResponse(rateLimitCheck.resetIn);
      }

      // IMPORTANT: Check if this is a gym owner trying to use members portal
      // First check if user exists in auth system
      const { data: authUsers } = await adminSupabase
        .from("auth.users")
        .select("id, email")
        .eq("email", sanitizedEmail);

      if (authUsers && authUsers.length > 0) {
        const authUser = authUsers[0];

        // Check if this user is a gym owner
        const { data: gymOwner } = await adminSupabase
          .from("user_organizations")
          .select("user_id, role")
          .eq("user_id", authUser.id)
          .in("role", ["owner", "admin"])
          .single();

        // Also check if they own an organization directly
        const { data: ownerCheck } = await adminSupabase
          .from("organizations")
          .select("owner_id")
          .eq("owner_id", authUser.id)
          .single();

        // If this email belongs to a gym owner, block them from members portal
        if (gymOwner || ownerCheck) {
          console.log(
            "Gym owner attempted to use members portal:",
            sanitizedEmail,
          );
          return NextResponse.json(
            {
              success: false,
              error:
                "This login is for gym members only. Gym owners should use login.gymleadhub.co.uk",
            },
            { status: 403 },
          );
        }
      }

      // Find client by email
      const { data: client, error: clientError } = await adminSupabase
        .from("clients")
        .select("id, email, first_name, last_name, organization_id, user_id")
        .eq("email", sanitizedEmail)
        .single();

      if (clientError || !client) {
        return NextResponse.json(
          {
            success: false,
            error:
              "No member account found with this email address. Please contact your gym to be added as a member.",
          },
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
        .eq("email", sanitizedEmail);

      // Store OTP in database
      const otpData = {
        email: sanitizedEmail,
        token: otpCode,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      };

      console.log("Storing OTP:", {
        email: otpData.email,
        token: otpData.token,
        expires_at: otpData.expires_at,
      });

      const { data: insertedOtp, error: insertError } = await adminSupabase
        .from("otp_tokens")
        .insert(otpData)
        .select()
        .single();

      if (insertError) {
        console.error("Failed to store OTP:", insertError);
        return NextResponse.json(
          { success: false, error: "Failed to generate verification code" },
          { status: 500 },
        );
      }

      console.log(`OTP stored successfully:`, {
        id: insertedOtp?.id,
        email: insertedOtp?.email,
        token: insertedOtp?.token,
        expires_at: insertedOtp?.expires_at,
      });

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

      // Try to send email using Resend or Supabase
      let emailSent = false;

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
                process.env.RESEND_FROM_EMAIL &&
                process.env.RESEND_FROM_EMAIL.includes("@")
                  ? `GymLeadHub <${process.env.RESEND_FROM_EMAIL}>`
                  : "Atlas Fitness <onboarding@resend.dev>", // Fallback to Resend's test domain
              to: sanitizedEmail,
              subject: `Your verification code: ${otpCode}`,
              html: emailHtml,
              text: `Your verification code is: ${otpCode}\n\nThis code will expire in 10 minutes.`,
            }),
          });

          const resendData = await resendResponse.json();

          if (!resendResponse.ok) {
            console.error("Failed to send OTP email via Resend:", resendData);
          } else {
            console.log("Email sent successfully via Resend:", resendData);
            emailSent = true;
          }
        } catch (emailError) {
          console.error("Email sending error:", emailError);
        }
      }

      // If Resend failed or not configured, log for debugging
      if (!emailSent) {
        console.log("Email service not configured properly.");

        // For testing/development, log the OTP
        console.log("⚠️ EMAIL NOT SENT - OTP for testing:", {
          email: sanitizedEmail,
          code: otpCode,
          expiresAt: otpData.expires_at,
        });

        // Store a note that email wasn't sent
        await adminSupabase
          .from("otp_tokens")
          .update({
            metadata: {
              email_sent: false,
              reason: "No email service configured",
            },
          })
          .eq("email", sanitizedEmail)
          .eq("token", otpCode);
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

      // Validate and sanitize inputs
      const emailValidation = validateEmail(email);
      const otpValidation = validateOTP(otp);

      if (!emailValidation.valid) {
        return NextResponse.json(
          { success: false, error: "Invalid email address" },
          { status: 400 },
        );
      }

      if (!otpValidation.valid) {
        return NextResponse.json(
          { success: false, error: "Invalid verification code format" },
          { status: 400 },
        );
      }

      const sanitizedEmail = emailValidation.sanitized;
      const sanitizedOTP = otpValidation.sanitized;

      // Check rate limit for OTP verification
      const rateLimitCheck = checkAuthRateLimit(
        request,
        "otpVerify",
        sanitizedEmail,
      );
      if (!rateLimitCheck.allowed) {
        return createRateLimitResponse(rateLimitCheck.resetIn);
      }

      // Verify OTP from database - use maybeSingle to handle 0 or 1 rows
      const { data: otpRecords, error: otpError } = await adminSupabase
        .from("otp_tokens")
        .select("*")
        .eq("email", sanitizedEmail)
        .eq("token", sanitizedOTP)
        .gte("expires_at", new Date().toISOString());

      const otpRecord = otpRecords?.[0] || null;

      if (otpError) {
        console.error("OTP verification error:", otpError);
        console.error("Email:", sanitizedEmail, "OTP:", sanitizedOTP);
      }

      if (!otpRecord) {
        // Check if there's any OTP for this email to provide better error message
        const { data: anyOtps } = await adminSupabase
          .from("otp_tokens")
          .select("*")
          .eq("email", sanitizedEmail);

        const anyOtp = anyOtps?.[0];

        if (anyOtp) {
          console.error("OTP exists but doesn't match or is expired:", {
            provided: sanitizedOTP,
            stored: anyOtp.token,
            expired: new Date(anyOtp.expires_at) < new Date(),
            expires_at: anyOtp.expires_at,
            current_time: new Date().toISOString(),
          });
        } else {
          console.error("No OTP found for email:", sanitizedEmail);
          console.error("Attempted OTP:", sanitizedOTP);
        }

        return NextResponse.json(
          { success: false, error: "Invalid or expired code" },
          { status: 400 },
        );
      }

      // Get the client record FIRST (before deleting OTP)
      const { data: client } = await adminSupabase
        .from("clients")
        .select("id, user_id, organization_id, email, first_name, last_name")
        .eq("email", sanitizedEmail)
        .single();

      if (!client) {
        // Don't delete OTP if client not found
        console.error("Client not found for email:", email.toLowerCase());
        return NextResponse.json(
          { success: false, error: "Client record not found" },
          { status: 404 },
        );
      }

      // For members/clients, we'll handle auth differently
      // We'll create or ensure the user exists then generate a magic link
      if (!client.user_id) {
        // Create a new Supabase user for the client
        const { data: newUser, error: createError } =
          await adminSupabase.auth.admin.createUser({
            email: client.email,
            email_confirm: true,
            user_metadata: {
              first_name: client.first_name,
              last_name: client.last_name,
              role: "client",
            },
          });

        if (createError || !newUser.user) {
          console.error("Failed to create user:", createError);
          return NextResponse.json(
            { success: false, error: "Failed to create user session" },
            { status: 500 },
          );
        }

        // Update client with user_id
        await adminSupabase
          .from("clients")
          .update({ user_id: newUser.user.id })
          .eq("id", client.id);

        client.user_id = newUser.user.id;
      }

      // Skip custom token system - use direct Supabase auth
      // Generate magic link and exchange for session immediately
      console.log("Generating magic link for direct authentication");
      const { data: sessionData, error: sessionError } =
        await adminSupabase.auth.admin.generateLink({
          type: "magiclink",
          email: sanitizedEmail,
        });

      if (sessionError || !sessionData?.properties?.action_link) {
        return NextResponse.json(
          {
            success: false,
            error: "Unable to create session. Please try again.",
            details: sessionError?.message,
          },
          { status: 500 },
        );
      }

      // Try to exchange token immediately for session
      const url = new URL(sessionData.properties.action_link);
      const token = url.searchParams.get("token");
      const type = url.searchParams.get("type");

      if (token) {
        const { data: session, error: exchangeError } =
          await adminSupabase.auth.verifyOtp({
            token_hash: token,
            type: (type as any) || "magiclink",
          });

        if (!exchangeError && session?.session) {
          // Delete OTP after successful session creation
          await adminSupabase
            .from("otp_tokens")
            .delete()
            .eq("id", otpRecord.id);

          // Return session tokens for client-side session setup
          return NextResponse.json({
            success: true,
            session: {
              access_token: session.session.access_token,
              refresh_token: session.session.refresh_token,
            },
            redirectTo: "/client/dashboard",
            userRole: "member",
            sessionMethod: "direct_token_exchange",
          });
        }
      }

      // If exchange fails, return the magic link URL
      // But modify it to stay on the correct domain
      const host = request.headers.get("host") || "members.gymleadhub.co.uk";
      const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
      const baseUrl = `${protocol}://${host}`;

      // Replace the Supabase domain with our domain
      const magicLinkUrl = new URL(sessionData.properties.action_link);
      const finalUrl = `${baseUrl}/auth/callback?token_hash=${magicLinkUrl.searchParams.get("token")}&type=${magicLinkUrl.searchParams.get("type")}`;

      return NextResponse.json({
        success: true,
        authUrl: finalUrl,
        redirectTo: "/client/dashboard",
        userRole: "member",
        sessionMethod: "magic_link_domain_fixed",
      });

      // Fallback - just return redirect URL for client-side handling
      // This handles cases where user doesn't have a user_id yet
      // DON'T delete OTP here - let it expire naturally or be deleted after successful login

      return NextResponse.json({
        success: true,
        otpRecordId: otpRecord.id, // Pass this for later deletion
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
