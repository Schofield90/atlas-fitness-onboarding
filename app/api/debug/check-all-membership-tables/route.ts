import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get("customerId");

    // Try admin client first
    let supabase;
    try {
      supabase = await createAdminClient();
      console.log("Using admin client");
    } catch {
      supabase = await createClient();
      console.log("Using regular client");
    }

    const results: any = {
      customerId,
      tables: {},
    };

    // Check customer_memberships table
    const { data: customerMemberships, error: cmError } = await supabase
      .from("customer_memberships")
      .select("*, membership_plan:membership_plans(*)")
      .or(
        `customer_id.eq.${customerId},customer_id.eq.1c7255f6-ba26-4258-8693-379ce97732ed,customer_id.eq.9433c71d-2c3f-4d99-b254-68ae5b56978a`,
      );

    results.tables.customer_memberships = {
      data: customerMemberships,
      error: cmError?.message,
      count: customerMemberships?.length || 0,
    };

    // Check memberships table (from booking system migration)
    const { data: memberships, error: mError } = await supabase
      .from("memberships")
      .select("*")
      .or(
        `customer_id.eq.${customerId},customer_id.eq.1c7255f6-ba26-4258-8693-379ce97732ed,customer_id.eq.9433c71d-2c3f-4d99-b254-68ae5b56978a`,
      );

    results.tables.memberships = {
      data: memberships,
      error: mError?.message,
      count: memberships?.length || 0,
    };

    // Check if membership_plans table has any data
    const { data: plans, error: plansError } = await supabase
      .from("membership_plans")
      .select("*")
      .limit(5);

    results.tables.membership_plans = {
      data: plans,
      error: plansError?.message,
      count: plans?.length || 0,
      sample: plans?.[0],
    };

    // Check organizations to find the right one
    const { data: orgs } = await supabase
      .from("organizations")
      .select("id, name")
      .eq("name", "Atlas Fitness");

    results.organizations = orgs;

    // Get table structure info
    const { data: bookingColumns } = await supabase
      .from("bookings")
      .select("*")
      .limit(1);

    results.bookingTableStructure = bookingColumns?.[0]
      ? Object.keys(bookingColumns[0])
      : "No bookings";

    return NextResponse.json(results);
  } catch (error: any) {
    console.error("Debug error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
