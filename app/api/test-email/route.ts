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

  console.log("Test email endpoint called");

  // Check environment variables
  const hasResendKey = !!process.env.RESEND_API_KEY;
  const resendKeyLength = process.env.RESEND_API_KEY?.length || 0;
  const resendKeyPreview = process.env.RESEND_API_KEY
    ? `${process.env.RESEND_API_KEY.substring(0, 7)}...`
    : "not set";

  console.log("Environment check:", {
    hasResendKey,
    resendKeyLength,
    resendKeyPreview,
    nodeEnv: process.env.NODE_ENV,
  });

  // Try to send a test email
  const resend = getResendClient();
  if (resend) {
    try {
      const { data, error } = await resend.emails.send({
        from: "Gym Lead Hub <sam@email.gymleadhub.co.uk>",
        to: "sam@atlas-gyms.co.uk", // Your email
        subject: "Test Email from Gym Lead Hub",
        html: "<p>This is a test email to verify Resend is working.</p>",
        text: "This is a test email to verify Resend is working.",
      });

      if (error) {
        console.error("Resend error:", error);
        return NextResponse.json(
          {
            success: false,
            error: "Resend error",
            details: error,
            config: {
              hasResendKey,
              resendKeyLength,
              resendKeyPreview,
            },
          },
          { status: 500 },
        );
      }

      console.log("Email sent successfully:", data);
      return NextResponse.json({
        success: true,
        message: "Test email sent!",
        emailId: data?.id,
        config: {
          hasResendKey,
          resendKeyLength,
          resendKeyPreview,
        },
      });
    } catch (error) {
      console.error("Unexpected error:", error);
      return NextResponse.json(
        {
          success: false,
          error: "Unexpected error",
          details: error instanceof Error ? error.message : String(error),
          config: {
            hasResendKey,
            resendKeyLength,
            resendKeyPreview,
          },
        },
        { status: 500 },
      );
    }
  } else {
    return NextResponse.json(
      {
        success: false,
        error: "Resend API key not configured",
        config: {
          hasResendKey,
          resendKeyLength,
          resendKeyPreview,
        },
        instructions:
          "Please set RESEND_API_KEY in Vercel environment variables",
      },
      { status: 400 },
    );
  }
}
