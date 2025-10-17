import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/app/lib/api/auth-check";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { GoCardlessService } from "@/app/lib/gocardless-server";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await requireAuth();

    // Parse request body
    const body = await request.json();
    const { customerId, customerEmail, customerName, membershipData } = body;

    if (!customerId) {
      return NextResponse.json(
        { error: "Customer ID is required" },
        { status: 400 },
      );
    }

    // Get organization's GoCardless account
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { data: gcAccount } = await supabaseAdmin
      .from("payment_provider_accounts")
      .select("access_token, environment")
      .eq("organization_id", user.organizationId)
      .eq("provider", "gocardless")
      .maybeSingle();

    if (!gcAccount || !gcAccount.access_token) {
      return NextResponse.json(
        {
          error:
            "GoCardless is not configured for your organization. Please connect GoCardless in Settings > Integrations.",
        },
        { status: 503 },
      );
    }

    // Initialize GoCardless service with org's access token
    const gcService = new GoCardlessService({
      accessToken: gcAccount.access_token,
      environment: gcAccount.environment || "live",
    });

    // Generate unique session token
    const sessionToken = crypto.randomBytes(32).toString("hex");

    // Create redirect flow first
    const { redirect_flows } = await gcService.createRedirectFlow({
      sessionToken,
      successRedirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/gocardless/redirect-callback`,
      description: `Membership setup for ${customerName || "member"}`,
      organizationId: user.organizationId,
      clientEmail: customerEmail,
      clientName: customerName,
    });

    // Store session data for completion callback (with redirect_flow_id)
    await supabaseAdmin.from("gocardless_sessions").insert({
      session_token: sessionToken,
      redirect_flow_id: redirect_flows.id,
      organization_id: user.organizationId,
      customer_id: customerId,
      membership_data: membershipData,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min expiry
    });

    return NextResponse.json({
      success: true,
      redirectUrl: redirect_flows.redirect_url,
      redirectFlowId: redirect_flows.id,
      sessionToken,
    });
  } catch (error: any) {
    console.error("Error creating GoCardless redirect flow:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to create GoCardless redirect flow",
      },
      { status: 500 },
    );
  }
}
