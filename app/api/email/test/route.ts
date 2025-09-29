import { NextRequest, NextResponse } from "next/server";
import { emailService } from "@/app/lib/services/unified-email.service";
import { createClient } from "@supabase/supabase-js";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, subject, html, text, testMode } = body;

    // Get organization ID from auth or use default
    let organizationId = "63589490-8f55-4157-bd3a-e141594b748e"; // Default Atlas Fitness

    // Try to get from auth
    const authHeader = request.headers.get("authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );

      const {
        data: { user },
      } = await supabase.auth.getUser(token);
      if (user) {
        const { data: org } = await supabase
          .from("user_organizations")
          .select("organization_id")
          .eq("user_id", user.id)
          .single();

        if (org) {
          organizationId = org.organization_id;
        }
      }
    }

    // Set test mode if requested
    if (testMode !== undefined) {
      emailService.setTestMode(testMode);
    }

    // Send test email
    const result = await emailService.send({
      to: to || "test@example.com",
      subject: subject || "Test Email from Atlas Fitness CRM",
      html:
        html ||
        "<h1>Test Email</h1><p>This is a test email from your CRM system.</p>",
      text: text || "This is a test email from your CRM system.",
      organizationId,
    });

    return NextResponse.json({
      success: result.success,
      messageId: result.messageId,
      provider: result.provider,
      error: result.error,
      testMode: emailService.isTestMode(),
      message: emailService.isTestMode()
        ? "Email logged in test mode (not actually sent)"
        : "Email sent successfully",
    });
  } catch (error: any) {
    console.error("Email test error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        testMode: emailService.isTestMode(),
      },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Test connection and return status
    const status = await emailService.testConnection();

    return NextResponse.json({
      ...status,
      testMode: emailService.isTestMode(),
      configuration: {
        hasResendKey: !!process.env.RESEND_API_KEY,
        fromEmail: process.env.RESEND_FROM_EMAIL || "not configured",
        testModeEnabled: process.env.EMAIL_TEST_MODE === "true",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 },
    );
  }
}
