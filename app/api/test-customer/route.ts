import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { requireAuth } from "@/app/lib/api/auth-check";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await requireAuth();

    // Use admin client
    const supabase = createAdminClient();

    // Try to fetch the specific customer
    const customerId = "126059c3-3970-4db0-bccb-b66e5d948632";

    console.log("TEST: Fetching customer", {
      customerId,
      userOrgId: user.organizationId,
    });

    // First, try without any filters to see if customer exists at all
    const { data: allData, error: allError } = await supabase
      .from("clients")
      .select("id, org_id, first_name, last_name, email")
      .eq("id", customerId)
      .single();

    console.log("TEST: Customer without org filter:", {
      found: !!allData,
      data: allData,
      error: allError?.message,
    });

    // Now try with org filter
    const { data: orgData, error: orgError } = await supabase
      .from("clients")
      .select("id, org_id, first_name, last_name, email")
      .eq("id", customerId)
      .eq("org_id", user.organizationId)
      .single();

    console.log("TEST: Customer with org filter:", {
      found: !!orgData,
      data: orgData,
      error: orgError?.message,
    });

    return NextResponse.json({
      test: "customer-fetch",
      userId: user.id,
      userOrgId: user.organizationId,
      customerId,
      withoutOrgFilter: {
        found: !!allData,
        data: allData,
        error: allError?.message,
      },
      withOrgFilter: {
        found: !!orgData,
        data: orgData,
        error: orgError?.message,
      },
    });
  } catch (error: any) {
    console.error("TEST ERROR:", error);
    return NextResponse.json(
      {
        error: error.message,
        stack: error.stack,
      },
      { status: 500 },
    );
  }
}
