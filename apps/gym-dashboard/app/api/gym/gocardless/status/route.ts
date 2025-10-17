import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { requireAuth } from "@/app/lib/api/auth-check";

export const dynamic = "force-dynamic";

/**
 * Check GoCardless connection status
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const organizationId = user.organizationId;

    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { data: connection } = await supabaseAdmin
      .from("payment_provider_accounts")
      .select("environment, connected_at, metadata")
      .eq("organization_id", organizationId)
      .eq("provider", "gocardless")
      .maybeSingle();

    if (!connection) {
      return NextResponse.json({
        connected: false,
      });
    }

    return NextResponse.json({
      connected: true,
      environment: connection.environment,
      connectedAt: connection.connected_at,
      creditor: {
        id: connection.metadata?.creditor_id,
        name: connection.metadata?.creditor_name,
        country: connection.metadata?.country_code,
        verified: connection.metadata?.verified || false,
      },
    });
  } catch (error: any) {
    console.error("GoCardless status check error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
