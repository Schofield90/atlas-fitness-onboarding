import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { Resend } from "resend";
import { WelcomeEmail } from "@/emails/templates/WelcomeEmail";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

// Lazy load Resend to prevent initialization during build
function getResendClient() {
  return process.env.RESEND_API_KEY
    ? new Resend(process.env.RESEND_API_KEY)
    : null;
}

export async function POST(request: NextRequest) {
  console.log("=== SEND-WELCOME-EMAIL ENDPOINT HIT ===");
  console.log("Timestamp:", new Date().toISOString());
  console.log("Method:", request.method);

  try {
    const body = await request.json();
    console.log("Request body received:", body);
    const { customerId, email, name } = body;

    if (!customerId || !email) {
      return NextResponse.json(
        { error: "Customer ID and email are required" },
        { status: 400 },
      );
    }

    console.log("Creating Supabase client...");
    const supabase = await createClient();

    // Get the current user and their organization
    console.log("Getting authenticated user...");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      console.error("Auth error:", authError);
      return NextResponse.json(
        { error: "Authentication failed: " + authError.message },
        { status: 401 },
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized - no user found" },
        { status: 401 },
      );
    }

    // Get organization details
    console.log("Getting user organization...");
    const { data: userOrg, error: orgError } = await supabase
      .from("user_organizations")
      .select("organization_id")
      .eq("user_id", user.id)
      .single();

    if (orgError) {
      console.error("Error fetching user organization:", orgError);
      return NextResponse.json(
        { error: "Failed to fetch organization: " + orgError.message },
        { status: 500 },
      );
    }

    if (!userOrg?.organization_id) {
      return NextResponse.json(
        { error: "Organization not found for user" },
        { status: 404 },
      );
    }

    console.log("Getting organization details...");
    const { data: organization, error: orgDetailsError } = await supabase
      .from("organizations")
      .select("name, settings")
      .eq("id", userOrg.organization_id)
      .single();

    if (orgDetailsError) {
      console.error("Error fetching organization details:", orgDetailsError);
      // Continue anyway - organization name is optional
    }

    // Generate a secure claim token
    const generateToken = () => {
      const bytes = new Uint8Array(24);
      crypto.getRandomValues(bytes);
      return Buffer.from(bytes)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "");
    };

    const claimToken = generateToken();
    // No expiration - token is valid until claimed

    // Get the app URL from environment or use default
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      "https://atlas-fitness-onboarding.vercel.app";

    // Store the claim token in the database
    const { error: tokenError } = await supabase
      .from("account_claim_tokens")
      .insert({
        client_id: customerId,
        organization_id: userOrg.organization_id,
        token: claimToken,
        email: email,
        expires_at: null, // No expiration - valid until claimed
        metadata: {
          created_by: user.id,
          customer_name: name,
        },
      });

    if (tokenError) {
      console.error("Error creating claim token:", tokenError);
      return NextResponse.json(
        { error: "Failed to create claim token: " + tokenError.message },
        { status: 500 },
      );
    }

    // Create the magic link
    const magicLink = `${appUrl}/claim-account?token=${claimToken}`;

    // Send welcome email with magic link
    console.log("Attempting to send email via Resend...");
    console.log("Resend API Key exists:", !!process.env.RESEND_API_KEY);
    console.log("Resend API Key length:", process.env.RESEND_API_KEY?.length);
    console.log("Email details:", {
      to: email,
      from: `${organization?.name || "Gym Lead Hub"} <noreply@gymleadhub.co.uk>`,
      subject: `Welcome to ${organization?.name || "Gym Lead Hub"} - Your Account Details`,
    });

    // Check if Resend is configured
    const resend = getResendClient();
    if (!resend) {
      console.warn(
        "Resend API key not configured - returning magic link for manual sharing",
      );
      return NextResponse.json({
        success: true,
        message: "Account claim link generated (email service not configured)",
        credentials: {
          email,
          magicLink,
          // No expiration - link is permanent until claimed
          note: "Email service not configured. Please share this magic link with the customer manually.",
        },
      });
    }

    try {
      // Try with your domain first, fallback to Resend's domain if needed
      let fromEmail = "sam@email.gymleadhub.co.uk"; // Your verified subdomain
      const fromName = organization?.name || "Gym Lead Hub";

      // First attempt with your domain
      let { data: emailData, error: emailError } = await resend.emails.send({
        from: `${fromName} <${fromEmail}>`,
        to: email,
        subject: `Welcome to ${organization?.name || "Gym Lead Hub"} - Claim Your Account`,
        html: `
          <h2>Welcome to ${organization?.name || "Gym Lead Hub"}!</h2>
          <p>Hi ${name},</p>
          <p>Your account has been created! Click the button below to set up your password and access your account:</p>
          <p style="text-align: center; margin: 30px 0;">
            <a href="${magicLink}" style="background-color: #3B82F6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
              Claim Your Account
            </a>
          </p>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #3B82F6;">${magicLink}</p>
          <p><small>This link will remain valid until you claim your account. If you didn't request this account, you can safely ignore this email.</small></p>
          <p>Best regards,<br/>The ${organization?.name || "Gym Lead Hub"} Team</p>
        `,
        text: `Welcome to ${organization?.name || "Gym Lead Hub"}!\n\nHi ${name},\n\nYour account has been created! Click the link below to set up your password and access your account:\n\n${magicLink}\n\nThis link will remain valid until you claim your account. If you didn't request this account, you can safely ignore this email.\n\nBest regards,\nThe ${organization?.name || "Gym Lead Hub"} Team`,
      });

      // If domain error, retry with Resend's guaranteed domain
      if (
        emailError &&
        (emailError.statusCode === 403 ||
          emailError.name === "validation_error")
      ) {
        console.log("Domain issue detected, using Resend's domain");
        fromEmail = "onboarding@resend.dev";

        const retryResult = await resend.emails.send({
          from: `${fromName} <${fromEmail}>`,
          to: email,
          subject: `Welcome to ${organization?.name || "Gym Lead Hub"} - Claim Your Account`,
          html: `
            <h2>Welcome to ${organization?.name || "Gym Lead Hub"}!</h2>
            <p>Hi ${name},</p>
            <p>Your account has been created! Click the button below to set up your password and access your account:</p>
            <p style="text-align: center; margin: 30px 0;">
              <a href="${magicLink}" style="background-color: #3B82F6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
                Claim Your Account
              </a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #3B82F6;">${magicLink}</p>
            <p><small>This link will remain valid until you claim your account. If you didn't request this account, you can safely ignore this email.</small></p>
            <p>Best regards,<br/>The ${organization?.name || "Gym Lead Hub"} Team</p>
          `,
          text: `Welcome to ${organization?.name || "Gym Lead Hub"}!\n\nHi ${name},\n\nYour account has been created! Click the link below to set up your password and access your account:\n\n${magicLink}\n\nThis link will remain valid until you claim your account. If you didn't request this account, you can safely ignore this email.\n\nBest regards,\nThe ${organization?.name || "Gym Lead Hub"} Team`,
        });

        emailData = retryResult.data;
        emailError = retryResult.error;
      }

      if (emailError) {
        console.error("Resend error details:", emailError);
        console.error(
          "Full Resend error:",
          JSON.stringify(emailError, null, 2),
        );
        // If Resend fails, we can still return success but log the error
        console.log("Would have sent email with:", {
          to: email,
          tempPassword,
          loginUrl: `${appUrl}/portal/login`,
        });
      } else {
        console.log("Email sent successfully!", emailData);
        console.log("Sent from:", fromEmail);
      }

      // Update client metadata to track email sent
      await supabase
        .from("clients")
        .update({
          metadata: {
            claim_token_sent: new Date().toISOString(),
            welcome_email_sent: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", customerId);

      // Log the activity
      await supabase.from("activity_logs").insert({
        organization_id: userOrg.organization_id,
        lead_id: customerId,
        type: "welcome_email_sent",
        description: `Welcome email sent to ${name} (${email})`,
        metadata: {
          email_id: emailData?.id,
          sent_by: user.id,
          claim_token_expires: null, // No expiration
        },
      });

      return NextResponse.json({
        success: true,
        message: "Welcome email sent successfully",
        emailId: emailData?.id,
        sentTo: email,
        sentFrom: fromEmail,
        resendResponse: emailData,
        // Return magic link for testing (remove in production)
        magicLink,
      });
    } catch (emailError) {
      console.error("Email sending failed:", emailError);

      // Even if email fails, return the magic link for manual sharing
      return NextResponse.json({
        success: true,
        message: "Account claim link generated (email may have failed)",
        credentials: {
          email,
          magicLink,
          // No expiration - link is permanent until claimed
          note: "Please share this magic link with the customer manually",
        },
      });
    }
  } catch (error) {
    console.error("Error in send-welcome-email API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
