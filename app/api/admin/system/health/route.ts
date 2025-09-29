import { NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { requireAdminAccess } from "@/app/lib/admin/impersonation";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { isAdmin } = await requireAdminAccess();

    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Check database connection
    const dbStart = Date.now();
    const { error: dbError } = await supabase
      .from("organizations")
      .select("count")
      .limit(1);
    const databaseLatency = Date.now() - dbStart;

    // Check pending webhooks
    const { count: webhookCount } = await supabase
      .from("webhook_events")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");

    // Check Stripe connectivity (mock for now)
    const stripeConnected = !!process.env.STRIPE_SECRET_KEY;

    // Check GoCardless connectivity (mock for now)
    const gocardlessConnected = !!process.env.GOCARDLESS_ACCESS_TOKEN;

    // Check email service (mock for now)
    const emailConnected = !!process.env.RESEND_API_KEY;

    return NextResponse.json({
      database: !dbError,
      databaseLatency,
      stripe: stripeConnected,
      stripeWebhooks: webhookCount || 0,
      gocardless: gocardlessConnected,
      email: emailConnected,
      emailQueue: 0, // TODO: Implement email queue check
    });
  } catch (error) {
    console.error("Failed to check system health:", error);
    return NextResponse.json(
      { error: "Failed to check system health" },
      { status: 500 },
    );
  }
}
