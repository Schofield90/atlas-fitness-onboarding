import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { AutoMatcher } from "@/app/lib/migration/auto-matcher";

export async function POST(request: NextRequest) {
  try {
    const { organizationId } = await request.json();
    const supabaseAdmin = createAdminClient();

    console.log(
      "Starting automatic matching for organization:",
      organizationId,
    );

    const matcher = new AutoMatcher(supabaseAdmin);
    const stats = await matcher.linkAllUnmatched(organizationId);

    console.log("Auto-matching complete:", stats);

    return NextResponse.json({
      success: true,
      stats,
      message: `Automatically linked ${stats.leadsLinked} leads, ${stats.clientsLinked} clients, and ${stats.paymentsLinked} payments`,
    });
  } catch (error: any) {
    console.error("Auto-match error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Auto-matching failed",
    });
  }
}
