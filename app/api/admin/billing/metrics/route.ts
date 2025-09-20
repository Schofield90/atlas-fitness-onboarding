import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { getBillingMetrics } from "@/app/lib/stripe/admin";

export async function GET(request: NextRequest) {
  try {
    // Check admin authentication
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const authorizedEmails = ["sam@atlas-gyms.co.uk", "sam@gymleadhub.co.uk"];
    if (!authorizedEmails.includes(user.email?.toLowerCase() || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get billing metrics from Stripe
    const metrics = await getBillingMetrics();

    // Also get organization-based metrics from database
    const { data: orgs } = await supabase
      .from("organizations")
      .select("mrr_cents, status");

    // Calculate database MRR if Stripe is not connected
    if (orgs && orgs.length > 0) {
      const dbMrr = orgs.reduce((sum, org) => {
        if (org.status === "active" && org.mrr_cents) {
          return sum + org.mrr_cents / 100;
        }
        return sum;
      }, 0);

      // Use database MRR if Stripe MRR is 0
      if (metrics.totalMrr === 0 && dbMrr > 0) {
        metrics.totalMrr = dbMrr;
        metrics.totalArr = dbMrr * 12;
      }
    }

    return NextResponse.json(metrics);
  } catch (error: any) {
    console.error("Error fetching billing metrics:", error);
    return NextResponse.json(
      { error: "Failed to fetch billing metrics" },
      { status: 500 },
    );
  }
}
