import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

// Force dynamic rendering to prevent static generation
export const dynamic = "force-dynamic";

// Lazy load Resend to prevent initialization during build
function getResendClient() {
  return process.env.RESEND_API_KEY
    ? new Resend(process.env.RESEND_API_KEY)
    : null;
}

export async function GET(request: NextRequest) {
  // Prevent execution during build
  if (
    process.env.NODE_ENV === "production" &&
    !process.env.ALLOW_TEST_ENDPOINTS
  ) {
    return NextResponse.json(
      { error: "Test endpoints disabled in production" },
      { status: 403 },
    );
  }

  console.log("Test welcome email endpoint called");

  const resend = getResendClient();
  if (!resend) {
    return NextResponse.json(
      { error: "Resend not configured" },
      { status: 500 },
    );
  }

  // Generate a test magic link token
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
  const email = "samschofield90@hotmail.co.uk"; // Test email
  const name = "Test User";
  const appUrl = "https://atlas-fitness-onboarding.vercel.app";
  const magicLink = `${appUrl}/claim-account?token=${claimToken}`;

  try {
    console.log("Sending welcome email to:", email);

    // Try with your domain first
    let fromEmail = "sam@email.gymleadhub.co.uk";
    const fromName = "Gym Lead Hub";

    let { data: emailData, error: emailError } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: email,
      subject: `Welcome to Gym Lead Hub - Claim Your Account`,
      html: `
        <h2>Welcome to Gym Lead Hub!</h2>
        <p>Hi ${name},</p>
        <p>Your account has been created! Click the button below to set up your password and access your account:</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${magicLink}" style="background-color: #3B82F6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
            Claim Your Account
          </a>
        </p>
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #3B82F6;">${magicLink}</p>
        <p><small>This link will expire in 72 hours. If you didn't request this account, you can safely ignore this email.</small></p>
        <p>Best regards,<br/>The Gym Lead Hub Team</p>
      `,
      text: `Welcome to Gym Lead Hub!\n\nHi ${name},\n\nYour account has been created! Click the link below to set up your password and access your account:\n\n${magicLink}\n\nThis link will expire in 72 hours. If you didn't request this account, you can safely ignore this email.\n\nBest regards,\nThe Gym Lead Hub Team`,
    });

    // If domain error, retry with Resend's domain
    if (
      emailError &&
      (emailError.statusCode === 403 || emailError.name === "validation_error")
    ) {
      console.log("Domain issue, retrying with resend.dev");
      fromEmail = "onboarding@resend.dev";

      const retryResult = await resend.emails.send({
        from: `${fromName} <${fromEmail}>`,
        to: email,
        subject: `Welcome to Gym Lead Hub - Claim Your Account`,
        html: `
          <h2>Welcome to Gym Lead Hub!</h2>
          <p>Hi ${name},</p>
          <p>Your account has been created! Click the button below to set up your password and access your account:</p>
          <p style="text-align: center; margin: 30px 0;">
            <a href="${magicLink}" style="background-color: #3B82F6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
              Claim Your Account
            </a>
          </p>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #3B82F6;">${magicLink}</p>
          <p><small>This link will expire in 72 hours. If you didn't request this account, you can safely ignore this email.</small></p>
          <p>Best regards,<br/>The Gym Lead Hub Team</p>
        `,
        text: `Welcome to Gym Lead Hub!\n\nHi ${name},\n\nYour account has been created! Click the link below to set up your password and access your account:\n\n${magicLink}\n\nThis link will expire in 72 hours. If you didn't request this account, you can safely ignore this email.\n\nBest regards,\nThe Gym Lead Hub Team`,
      });

      emailData = retryResult.data;
      emailError = retryResult.error;
    }

    if (emailError) {
      console.error("Email error:", emailError);
      return NextResponse.json(
        {
          error: "Failed to send email",
          details: emailError,
        },
        { status: 500 },
      );
    }

    console.log("Email sent successfully:", emailData);
    return NextResponse.json({
      success: true,
      message: "Test welcome email sent!",
      emailId: emailData?.id,
      sentTo: email,
      sentFrom: fromEmail,
      magicLink: magicLink,
      note: "This is a test link that won't work without a database entry",
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      {
        error: "Unexpected error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
