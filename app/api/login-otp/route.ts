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
    if (action === "send") {
      if (!email) {
        return NextResponse.json(
          { error: "Email is required" },
          { status: 400 },
        );
      }

      // Check if user exists and has claimed account
      // Use admin client to bypass RLS
      const { data: client, error: clientError } = await supabaseAdmin
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

      // If no user_id, try to link with existing auth user or create new one
      if (!client.user_id) {
        let userId: string | null = null;

        // Try to create new auth user
        const { data: authUser, error: authError } =
          await supabaseAdmin.auth.admin.createUser({
            email: email.toLowerCase(),
            email_confirm: true,
            user_metadata: {
              first_name: client.first_name,
              last_name: client.last_name,
              client_id: client.id,
            },
          });

        if (authError) {
          // If user already exists, try to get their ID via signInWithPassword
          if (
            authError.message?.includes("already been registered") ||
            authError.code === "email_exists"
          ) {
            console.log(
              `Auth user already exists for ${email}, linking to client...`,
            );

            // Since we can't list users, we'll generate a magic link which will work for existing users
            const { data: magicLinkData, error: magicLinkError } =
              await supabaseAdmin.auth.admin.generateLink({
                type: "magiclink",
                email: email.toLowerCase(),
              });

            if (!magicLinkError && magicLinkData?.user) {
              userId = magicLinkData.user.id;
            }
          } else {
            console.error("Failed to create auth user:", authError);
            return NextResponse.json(
              { error: "Failed to activate account" },
              { status: 500 },
            );
          }
        } else if (authUser) {
          userId = authUser.user.id;
          console.log(`Created new auth user for ${email}: ${userId}`);
        }

        // Update client with user_id if we got one
        if (userId) {
          await supabaseAdmin
            .from("clients")
            .update({ user_id: userId })
            .eq("id", client.id);

          client.user_id = userId;
        }
      }

      // Generate OTP
      const otpCode = generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

      // Get the default organization_id
      const { data: orgData } = await supabaseAdmin
        .from("organizations")
        .select("id")
        .limit(1)
        .single();

      const organizationId = orgData?.id;

      // Store OTP in database (using otp_tokens table)
      const { error: upsertError } = await supabaseAdmin
        .from("otp_tokens")
        .upsert(
          {
            email: email.toLowerCase(),
            token: otpCode,
            expires_at: expiresAt,
            used: false,
            created_at: new Date().toISOString(),
          },
          {
            onConflict: "email",
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
    if (action === "verify") {
      if (!email || !otp) {
        return NextResponse.json(
          { error: "Email and verification code are required" },
          { status: 400 },
        );
      }

      // Check OTP
      const { data: tokenData, error: tokenError } = await supabaseAdmin
        .from("otp_tokens")
        .select("*")
        .ilike("email", email)
        .eq("token", otp)
        .eq("used", false)
        .maybeSingle();

      if (!tokenData) {
        return NextResponse.json(
          { error: "Invalid or already used verification code" },
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
      // Use admin client to bypass RLS
      const { data: client } = await supabaseAdmin
        .from("clients")
        .select("*")
        .ilike("email", email)
        .single();

      if (!client) {
        return NextResponse.json(
          { error: "Account not found" },
          { status: 404 },
        );
      }

      // If no user_id, try to link with existing auth user or create new one
      if (!client.user_id) {
        let userId: string | null = null;

        // Try to create new auth user
        const { data: authUser, error: authError } =
          await supabaseAdmin.auth.admin.createUser({
            email: email.toLowerCase(),
            email_confirm: true,
            user_metadata: {
              first_name: client.first_name,
              last_name: client.last_name,
              client_id: client.id,
            },
          });

        if (authError) {
          // If user already exists, try to get their ID via signInWithPassword
          if (
            authError.message?.includes("already been registered") ||
            authError.code === "email_exists"
          ) {
            console.log(
              `Auth user already exists for ${email}, linking to client...`,
            );

            // Since we can't list users, we'll generate a magic link which will work for existing users
            const { data: magicLinkData, error: magicLinkError } =
              await supabaseAdmin.auth.admin.generateLink({
                type: "magiclink",
                email: email.toLowerCase(),
              });

            if (!magicLinkError && magicLinkData?.user) {
              userId = magicLinkData.user.id;
            }
          } else {
            console.error("Failed to create auth user:", authError);
            return NextResponse.json(
              { error: "Failed to activate account" },
              { status: 500 },
            );
          }
        } else if (authUser) {
          userId = authUser.user.id;
          console.log(`Created new auth user for ${email}: ${userId}`);
        }

        // Update client with user_id if we got one
        if (userId) {
          await supabaseAdmin
            .from("clients")
            .update({ user_id: userId })
            .eq("id", client.id);

          client.user_id = userId;
        }
      }

      // Mark token as used
      await supabaseAdmin
        .from("otp_tokens")
        .update({ used: true })
        .eq("email", email.toLowerCase())
        .eq("token", otp);

      // Create a session directly using admin API
      // First ensure we have the user_id
      let authUserId = client.user_id;

      if (!authUserId) {
        // If client doesn't have user_id, we need to get/create it
        console.error("Client doesn't have user_id after OTP verification");
        return NextResponse.json(
          { error: "Account setup incomplete. Please contact support." },
          { status: 500 },
        );
      }

      // Generate a session token for the user
      const { data: sessionData, error: sessionError } =
        await supabaseAdmin.auth.admin.generateLink({
          type: "magiclink",
          email: email.toLowerCase(),
        });

      if (sessionError) {
        console.error("Failed to generate session:", sessionError);
        return NextResponse.json(
          { error: "Failed to create session" },
          { status: 500 },
        );
      }

      // Determine redirect based on whether user is a client
      const isClient = true; // User came through OTP login, they are a client
      const finalRedirect = "/client"; // Always redirect clients to client portal

      return NextResponse.json({
        success: true,
        message: "Successfully signed in!",
        email: email,
        userId: authUserId,
        authUrl: sessionData?.properties?.action_link, // Send the auth URL for automatic sign-in
        redirectTo: finalRedirect, // Tell frontend where to redirect
        userType: "client", // Explicitly mark as client
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
