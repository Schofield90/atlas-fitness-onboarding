import { createClient } from "@/app/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: "Not authenticated",
        debug: { authError, hasUser: !!user },
      });
    }

    // Test the exact same query the MembershipsTab component uses
    const customerId = "60655c1c-0d3d-47cf-a53e-54fa0fa1e2d9"; // Sam Schofield

    const { data, error } = await supabase
      .from("customer_memberships")
      .select(
        `
        *,
        membership_plan:membership_plans(*)
      `,
      )
      .or(`customer_id.eq.${customerId},client_id.eq.${customerId}`)
      .order("created_at", { ascending: false });

    // Format data exactly like the component would see it
    const formattedMemberships = data?.map((membership) => ({
      id: membership.id,
      status: membership.status,
      start_date: membership.start_date,
      end_date: membership.end_date,
      next_billing_date: membership.next_billing_date,
      notes: membership.notes,
      plan: {
        exists: !!membership.membership_plan,
        name: membership.membership_plan?.name || "NO NAME",
        price: membership.membership_plan?.price || "NO PRICE",
        billing_period:
          membership.membership_plan?.billing_period || "NO PERIOD",
        raw: membership.membership_plan,
      },
    }));

    return NextResponse.json({
      success: true,
      debug: {
        user: { id: user.id, email: user.email },
        queryError: error,
        rawDataCount: data?.length || 0,
        formattedMemberships,
        // Test the formatBritishCurrency function
        testFormatting: {
          price100: formatBritishCurrency(100),
          price200: formatBritishCurrency(200),
          priceUndefined: formatBritishCurrency(undefined),
          priceNull: formatBritishCurrency(null),
        },
      },
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: "Server error",
      debug: { error: error.message },
    });
  }
}

// Test the formatting function
function formatBritishCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return "£0.00";
  }
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(amount);
}
