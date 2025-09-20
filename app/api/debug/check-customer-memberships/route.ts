import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const customerName = searchParams.get("name") || "Sam Schofield";

    // Try admin client first
    let supabase;
    try {
      supabase = await createAdminClient();
      console.log("Using admin client");
    } catch {
      supabase = await createClient();
      console.log("Using regular client");
    }

    // First find the customer
    const { data: customers, error: customerError } = await supabase
      .from("clients")
      .select("*")
      .or(
        `name.ilike.%${customerName}%,first_name.ilike.%${customerName.split(" ")[0]}%`,
      )
      .limit(5);

    if (customerError) {
      console.error("Error finding customers:", customerError);
      return NextResponse.json(
        { error: customerError.message },
        { status: 400 },
      );
    }

    console.log("Found customers:", customers);

    if (!customers || customers.length === 0) {
      return NextResponse.json({
        error: "No customers found",
        searchTerm: customerName,
      });
    }

    // For each customer, check their memberships
    const membershipResults = await Promise.all(
      customers.map(async (customer) => {
        // Check customer_memberships table with both customer.id and as leads reference
        const { data: memberships, error: membershipError } = await supabase
          .from("customer_memberships")
          .select(
            `
          *,
          membership_plan:membership_plans(*)
        `,
          )
          .eq("customer_id", customer.id);

        // Also check if customer.id exists in leads table and has memberships there
        const { data: leadMemberships } = await supabase
          .from("customer_memberships")
          .select(
            `
          *,
          membership_plan:membership_plans(*),
          customer:leads(*)
        `,
          )
          .eq("customer_id", customer.id);

        // Also check if there's data in leads table
        const { data: leadData } = await supabase
          .from("leads")
          .select("*")
          .eq("id", customer.id)
          .single();

        return {
          customer: {
            id: customer.id,
            name:
              customer.name || `${customer.first_name} ${customer.last_name}`,
            email: customer.email,
            phone: customer.phone,
          },
          leadData,
          memberships: memberships || [],
          membershipError: membershipError?.message,
        };
      }),
    );

    // Also check the bookings table structure
    const { data: sampleBooking } = await supabase
      .from("bookings")
      .select("*")
      .limit(1);

    return NextResponse.json({
      searchTerm: customerName,
      customersFound: customers.length,
      results: membershipResults,
      bookingTableColumns: sampleBooking?.[0]
        ? Object.keys(sampleBooking[0])
        : "No bookings found",
    });
  } catch (error: any) {
    console.error("Debug error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
