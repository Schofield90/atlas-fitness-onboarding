import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

// Generate a 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send OTP via email
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, email, otp, password, firstName, lastName, phone } = body;

    const supabase = await createClient();
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Action 1: Send OTP
    if (action === "send-otp") {
      if (!email) {
        return NextResponse.json(
          { error: "Email is required" },
          { status: 400 },
        );
      }

      // Check if client exists (include organization_id)
      const { data: client } = await supabase
        .from("clients")
        .select("id, first_name, last_name, user_id, organization_id, phone")
        .eq("email", email.toLowerCase())
        .single();

      if (!client) {
        return NextResponse.json(
          { error: "No account found with this email" },
          { status: 404 },
        );
      }

      if (client.user_id) {
        return NextResponse.json(
          { error: "Account already claimed. Please sign in instead." },
          { status: 400 },
        );
      }

      // Generate OTP
      const otpCode = generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

      // Store OTP in database
      console.log(`[OTP SEND] Storing OTP with expiry: ${expiresAt}`);
      console.log(
        `[OTP SEND] Client organization_id: ${client.organization_id}`,
      );

      const { error: upsertError } = await supabase
        .from("account_claim_tokens")
        .upsert(
          {
            client_id: client.id,
            email: email.toLowerCase(),
            token: otpCode, // Using token field for OTP
            expires_at: expiresAt,
            claimed_at: null,
            organization_id: client.organization_id, // Use directly from client record
            metadata: {
              type: "otp",
              created_at: new Date().toISOString(),
            },
          },
          {
            onConflict: "client_id",
            ignoreDuplicates: false,
          },
        );

      if (upsertError) {
        console.error("[OTP SEND] Failed to store OTP:", upsertError);
        return NextResponse.json(
          { error: "Failed to generate verification code" },
          { status: 500 },
        );
      }

      // Send OTP email
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Your Account Verification Code</h2>
          <p>Hi ${client.first_name || "there"},</p>
          <p>Your verification code is:</p>
          <div style="background: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
            ${otpCode}
          </div>
          <p>This code will expire in 10 minutes.</p>
          <p>If you didn't request this code, please ignore this email.</p>
        </div>
      `;

      // Log OTP to server console for testing (ONLY for debugging - remove in production!)
      console.log(`[OTP DEBUG] Code for ${email}: ${otpCode}`);
      console.log(`[OTP DEBUG] Expires at: ${expiresAt}`);

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
              from: "Atlas Fitness <sam@email.gymleadhub.co.uk>", // Use verified domain email
              to: email,
              subject: `Your verification code: ${otpCode}`,
              html: emailHtml,
            }),
          });

          const resendData = await resendResponse.json();

          if (!resendResponse.ok) {
            console.error("Failed to send OTP email via Resend:", resendData);
            return NextResponse.json(
              {
                success: false,
                error:
                  "Failed to send verification email. Please contact support.",
                details:
                  process.env.NODE_ENV === "development"
                    ? resendData
                    : undefined,
              },
              { status: 500 },
            );
          }

          console.log("Email sent successfully:", resendData);
        } catch (emailError) {
          console.error("Email sending error:", emailError);
          return NextResponse.json(
            {
              success: false,
              error: "Failed to send verification email. Please try again.",
            },
            { status: 500 },
          );
        }
      } else {
        console.error("RESEND_API_KEY not configured");
        return NextResponse.json(
          {
            success: false,
            error: "Email service not configured. Please contact support.",
          },
          { status: 500 },
        );
      }

      // NEVER return OTP in response - security risk!
      // EXCEPT in test mode for debugging
      const response: any = {
        success: true,
        message: "Verification code sent to your email",
        clientDetails: {
          first_name: client.first_name,
          last_name: client.last_name,
          phone: client.phone,
        },
      };

      // TEMPORARY: Show OTP in test mode while email issues are being fixed
      // This should be removed once email delivery is working
      if (
        process.env.SHOW_OTP_FOR_TESTING === "true" ||
        process.env.NODE_ENV === "development"
      ) {
        response.testModeOTP = otpCode;
        response.testModeWarning =
          "⚠️ TEST MODE: OTP shown for debugging. Remove in production!";
      }

      return NextResponse.json(response);
    }

    // Action 2: Verify OTP and create account
    if (action === "verify-otp") {
      if (!email || !otp || !password) {
        return NextResponse.json(
          {
            error: "Email, verification code, and password are required",
          },
          { status: 400 },
        );
      }

      // Check OTP
      console.log(
        `[OTP VERIFY] Checking OTP for email: ${email}, code: ${otp}`,
      );

      const { data: tokenData, error: tokenError } = await supabase
        .from("account_claim_tokens")
        .select("*")
        .eq("email", email.toLowerCase())
        .eq("token", otp)
        .single();

      if (tokenError) {
        console.error("[OTP VERIFY] Database error:", tokenError);

        // Check if any token exists for this email
        const { data: anyToken } = await supabase
          .from("account_claim_tokens")
          .select("token, expires_at, claimed_at")
          .eq("email", email.toLowerCase())
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (anyToken) {
          console.log(
            `[OTP VERIFY] Found token for email but code didn't match. Expected: [hidden], Got: ${otp}`,
          );
          if (anyToken.claimed_at) {
            return NextResponse.json(
              {
                error:
                  "This account has already been claimed. Please sign in instead.",
              },
              { status: 400 },
            );
          }
          if (new Date(anyToken.expires_at) < new Date()) {
            return NextResponse.json(
              {
                error:
                  "Verification code has expired. Please request a new one.",
              },
              { status: 400 },
            );
          }
        }

        return NextResponse.json(
          { error: "Invalid verification code" },
          { status: 400 },
        );
      }

      if (!tokenData) {
        console.log(
          "[OTP VERIFY] No token found for email and code combination",
        );
        return NextResponse.json(
          { error: "Invalid verification code" },
          { status: 400 },
        );
      }

      // Check if expired
      const now = new Date();
      const expiresAt = new Date(tokenData.expires_at);
      console.log(
        `[OTP VERIFY] Time check - Now: ${now.toISOString()}, Expires: ${expiresAt.toISOString()}`,
      );
      console.log(`[OTP VERIFY] Is expired? ${expiresAt < now}`);

      if (expiresAt < now) {
        const minutesAgo = Math.round(
          (now.getTime() - expiresAt.getTime()) / (1000 * 60),
        );
        console.log(`[OTP VERIFY] Code expired ${minutesAgo} minutes ago`);
        return NextResponse.json(
          {
            error: `Verification code has expired (expired ${minutesAgo} minutes ago). Please request a new one.`,
          },
          { status: 400 },
        );
      }

      // Check if already claimed
      if (tokenData.claimed_at) {
        return NextResponse.json(
          { error: "This code has already been used" },
          { status: 400 },
        );
      }

      // Get client data
      const { data: client } = await supabase
        .from("clients")
        .select("*")
        .eq("id", tokenData.client_id)
        .single();

      if (!client) {
        return NextResponse.json(
          { error: "Client record not found" },
          { status: 404 },
        );
      }

      // Create or update user
      let userId: string;

      // Check if user exists
      const { data: existingUsers } =
        await supabaseAdmin.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find(
        (u) => u.email?.toLowerCase() === email.toLowerCase(),
      );

      if (existingUser) {
        // Update existing user
        userId = existingUser.id;
        await supabaseAdmin.auth.admin.updateUserById(userId, {
          password: password,
          email_confirm: true,
          user_metadata: {
            ...existingUser.user_metadata,
            client_id: client.id,
            organization_id: tokenData.organization_id,
            first_name: firstName || client.first_name,
            last_name: lastName || client.last_name,
          },
        });
      } else {
        // Create new user
        const { data: authData, error: authError } =
          await supabaseAdmin.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true,
            user_metadata: {
              client_id: client.id,
              organization_id: tokenData.organization_id,
              first_name: firstName || client.first_name,
              last_name: lastName || client.last_name,
            },
          });

        if (authError) {
          console.error("Error creating user:", authError);
          return NextResponse.json(
            { error: "Failed to create account" },
            { status: 500 },
          );
        }

        userId = authData.user.id;
      }

      // Update client record
      await supabase
        .from("clients")
        .update({
          user_id: userId,
          first_name: firstName || client.first_name,
          last_name: lastName || client.last_name,
          phone: phone || client.phone,
          updated_at: new Date().toISOString(),
        })
        .eq("id", client.id);

      // Mark token as claimed
      await supabase
        .from("account_claim_tokens")
        .update({ claimed_at: new Date().toISOString() })
        .eq("client_id", client.id)
        .eq("token", otp);

      return NextResponse.json({
        success: true,
        message: "Account successfully created! You can now sign in.",
        email: email,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error in OTP claim process:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
