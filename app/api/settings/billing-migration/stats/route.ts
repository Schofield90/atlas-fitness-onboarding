import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { requireAuth } from "@/app/lib/api/auth-check";

export const dynamic = "force-dynamic";

// GET - Fetch membership billing stats
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const organizationId = user.organizationId;

    const supabase = createAdminClient();

    // Get all memberships for this org
    const { data: memberships, error } = await supabase
      .from("customer_memberships")
      .select("billing_source, billing_paused")
      .eq("organization_id", organizationId);

    if (error) {
      console.error("Error fetching membership stats:", error);
      return NextResponse.json(
        { success: false, error: "Failed to load stats" },
        { status: 500 }
      );
    }

    // Calculate stats
    const total = memberships?.length || 0;
    const goteamup = memberships?.filter(m => m.billing_source === "goteamup").length || 0;
    const crm = memberships?.filter(m => m.billing_source === "crm").length || 0;
    const paused = memberships?.filter(m => m.billing_paused === true).length || 0;

    return NextResponse.json({
      success: true,
      stats: {
        total,
        goteamup,
        crm,
        paused,
      },
    });
  } catch (error: any) {
    console.error("Billing stats GET error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
