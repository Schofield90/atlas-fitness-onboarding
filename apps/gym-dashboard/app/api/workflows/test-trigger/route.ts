import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { requireAuth, createOrgScopedClient } from "@/lib/auth-middleware";

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  // Authentication check
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  // Create organization-scoped Supabase client
  const supabase = createOrgScopedClient(auth.organizationId);

  try {
    const body = await request.json();
    const { triggerType, leadData } = body;

    // Use hardcoded org ID for testing
    const organizationId = "63589490-8f55-4157-bd3a-e141594b748e";

    // Default test lead data
    const testLead = leadData || {
      id: "test-lead-123",
      name: "Test User",
      email: "test@example.com",
      phone: "+447700900000",
      source: "website",
      organization_id: organizationId,
    };

    let webhookUrl;
    let webhookData;

    switch (triggerType) {
      case "lead_created":
        webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/webhooks/lead-created`;
        webhookData = {
          lead: testLead,
          organizationId,
        };
        break;

      case "form_submitted":
        webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/webhooks/form-submitted`;
        webhookData = {
          formId: "test-form",
          formData: testLead,
          lead: testLead,
          organizationId,
          formType: "website",
        };
        break;

      default:
        return NextResponse.json(
          { error: "Invalid trigger type" },
          { status: 400 },
        );
    }

    // Call the webhook
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(webhookData),
    });

    const result = await response.json();

    return NextResponse.json({
      success: true,
      message: "Test trigger sent",
      triggerType,
      webhookResponse: result,
    });
  } catch (error) {
    console.error("Test trigger error:", error);
    return NextResponse.json(
      { error: "Failed to send test trigger" },
      { status: 500 },
    );
  }
}
