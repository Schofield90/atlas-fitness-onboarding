import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

export async function GET(request: NextRequest) {
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
  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);

      const { data, error } = await resend.emails.send({
        from: "Atlas Fitness <onboarding@resend.dev>",
        to: "sam@atlas-gyms.co.uk", // Your email
        subject: "Test Email from Atlas Fitness",
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
