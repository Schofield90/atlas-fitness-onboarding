import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

// Generate a 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Generate a secure random password for internal use
function generateSecurePassword(): string {
  const charset =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";
  for (let i = 0; i < 16; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

// Send OTP via email
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, email, otp, firstName, lastName, phone } = body;

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

      // Check if client exists
      // Use case-insensitive search with ILIKE to handle any case variations
      const { data: client, error: clientError } = await supabase
        .from("clients")
        .select("id, first_name, last_name, user_id, phone, email")
        .ilike("email", email)
        .maybeSingle();

      console.log(`[OTP SEND] Searching for client with email: ${email}`);
      console.log(`[OTP SEND] Client query result:`, client);
      console.log(`[OTP SEND] Client query error:`, clientError);

      if (!client) {
        // Additional debugging - check what clients exist
        const { data: allClients } = await supabase
          .from("clients")
          .select("id, email, first_name, last_name")
          .limit(10);

        console.log(`[OTP SEND] No client found for email: ${email}`);
        console.log(`[OTP SEND] Available clients (first 10):`, allClients);

        return NextResponse.json(
          {
            error:
              "No account found with this email. Please check your email address or contact support.",
            debug:
              process.env.NODE_ENV === "development"
                ? {
                    searchedEmail: email,
                    lowercaseEmail: email.toLowerCase(),
                    availableEmails: allClients?.map((c) => c.email) || [],
                  }
                : undefined,
          },
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
        `[OTP SEND] Client found: ${client.first_name} ${client.last_name}`,
      );

      // Get the default organization_id
      const { data: orgData } = await supabase
        .from("organizations")
        .select("id")
        .limit(1)
        .single();

      const organizationId = orgData?.id;
      console.log(`[OTP SEND] Using organization_id: ${organizationId}`);

      const { error: upsertError } = await supabase
        .from("account_claim_tokens")
        .upsert(
          {
            client_id: client.id,
            email: email.toLowerCase(),
            token: otpCode, // Using token field for OTP
            expires_at: expiresAt,
            claimed_at: null,
            organization_id: organizationId,
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
      if (!email || !otp) {
        return NextResponse.json(
          {
            error: "Email and verification code are required",
          },
          { status: 400 },
        );
      }

      // Check OTP with case-insensitive email lookup
      console.log(
        `[OTP VERIFY] Checking OTP for email: ${email}, code: ${otp}`,
      );

      const { data: tokenData, error: tokenError } = await supabase
        .from("account_claim_tokens")
        .select("*")
        .ilike("email", email)
        .eq("token", otp)
        .maybeSingle();

      console.log(`[OTP VERIFY] Token search result:`, tokenData);
      console.log(`[OTP VERIFY] Token search error:`, tokenError);

      if (tokenError) {
        console.error("[OTP VERIFY] Database error:", tokenError);

        // Check if any token exists for this email (case-insensitive)
        const { data: anyToken } = await supabase
          .from("account_claim_tokens")
          .select("token, expires_at, claimed_at, email")
          .ilike("email", email)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        console.log(`[OTP VERIFY] Found any token for email search:`, anyToken);

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

      // First, try to get the user by email using a more reliable method
      let existingUser = null;
      try {
        const {
          data: { users },
          error: listError,
        } = await supabaseAdmin.auth.admin.listUsers();

        if (!listError && users) {
          existingUser = users.find(
            (u) => u.email?.toLowerCase() === email.toLowerCase(),
          );
        }
      } catch (err) {
        console.log(`[OTP VERIFY] Error listing users:`, err);
      }

      if (existingUser) {
        // Update existing user - just update metadata, don't change password
        userId = existingUser.id;
        await supabaseAdmin.auth.admin.updateUserById(userId, {
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
        // Create new user with a generated secure password
        console.log(`[OTP VERIFY] Creating new user for email: ${email}`);
        const securePassword = generateSecurePassword();

        const { data: authData, error: authError } =
          await supabaseAdmin.auth.admin.createUser({
            email: email,
            password: securePassword,
            email_confirm: true,
            user_metadata: {
              client_id: client.id,
              organization_id: tokenData.organization_id,
              first_name: firstName || client.first_name,
              last_name: lastName || client.last_name,
            },
          });

        if (authError) {
          // If user already exists, try to get the existing user and update
          if (
            authError.message?.includes("already been registered") ||
            authError.code === "email_exists"
          ) {
            const { data: existingUserData } =
              await supabaseAdmin.auth.admin.listUsers();
            const foundUser = existingUserData?.users?.find(
              (u) => u.email?.toLowerCase() === email.toLowerCase(),
            );

            if (foundUser) {
              userId = foundUser.id;
              // Update the existing user's metadata
              await supabaseAdmin.auth.admin.updateUserById(userId, {
                email_confirm: true,
                user_metadata: {
                  ...foundUser.user_metadata,
                  client_id: client.id,
                  organization_id: tokenData.organization_id,
                  first_name: firstName || client.first_name,
                  last_name: lastName || client.last_name,
                },
              });
            } else {
              console.error("Error creating user:", authError);
              return NextResponse.json(
                { error: "Failed to create account" },
                { status: 500 },
              );
            }
          } else {
            console.error("Error creating user:", authError);
            return NextResponse.json(
              { error: "Failed to create account" },
              { status: 500 },
            );
          }
        } else {
          userId = authData.user.id;
        }
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

      // Generate a one-time sign-in token for the user
      const { data: authLinkData, error: authLinkError } =
        await supabaseAdmin.auth.admin.generateLink({
          type: "magiclink",
          email: email,
        });

      let redirectUrl = undefined;
      if (authLinkData?.properties?.action_link) {
        // Extract the token from the magic link for client-side use
        const url = new URL(authLinkData.properties.action_link);
        redirectUrl = authLinkData.properties.action_link;
      }

      return NextResponse.json({
        success: true,
        message: "Account created successfully! You are now signed in.",
        email: email,
        userId: userId,
        authUrl: redirectUrl, // Send the auth URL for automatic sign-in
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
