import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  // Check if we're getting the actual customer ID from the URL
  const url = new URL(request.url);
  const testEmail = url.searchParams.get("email") || "test@example.com";

  return NextResponse.json({
    status: "Email Configuration Status",
    resend: {
      configured: !!process.env.RESEND_API_KEY,
      keyLength: process.env.RESEND_API_KEY?.length || 0,
      keyPrefix: process.env.RESEND_API_KEY?.substring(0, 7) || "not set",
    },
    sender: {
      domain: "email.gymleadhub.co.uk",
      email: "sam@email.gymleadhub.co.uk",
      verified: "Yes - Verified in Resend",
    },
    test: {
      message: "Click 'Send Test' to send a test welcome email",
      testEndpoint: `/api/customers/send-welcome-email`,
      testPayload: {
        customerId: "test-123",
        email: testEmail,
        name: "Test User",
      },
    },
    instructions:
      "To send a test email, make a POST request to /api/customers/send-welcome-email with the test payload",
  });
}
