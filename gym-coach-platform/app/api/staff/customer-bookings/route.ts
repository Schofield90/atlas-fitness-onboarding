import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/staff/customer-bookings?customerId=xxx
 * Fetch bookings for a customer (for gym staff view)
 * Uses service role to bypass RLS
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify staff authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get customerId from query params
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get("customerId");

    if (!customerId) {
      return NextResponse.json(
        { error: "customerId is required" },
        { status: 400 },
      );
    }

    // Verify staff has access to this organization
    // Check user_organizations first
    const { data: staffOrg } = await supabase
      .from("user_organizations")
      .select("organization_id, role")
      .eq("user_id", user.id)
      .maybeSingle();

    // Fallback to organization_staff table if not found
    let organizationId = staffOrg?.organization_id;

    if (!organizationId) {
      const { data: staffRecord } = await supabase
        .from("organization_staff")
        .select("organization_id")
        .eq("user_id", user.id)
        .maybeSingle();

      organizationId = staffRecord?.organization_id;
    }

    if (!organizationId) {
      return NextResponse.json(
        { error: "Staff organization not found" },
        { status: 403 },
      );
    }

    // Verify customer belongs to same organization
    const { data: customer } = await supabase
      .from("clients")
      .select("id, org_id")
      .eq("id", customerId)
      .single();

    if (!customer || customer.org_id !== organizationId) {
      return NextResponse.json(
        { error: "Customer not found or access denied" },
        { status: 403 },
      );
    }

    // Fetch from both tables using service role
    const [bookingsResult, classBookingsResult] = await Promise.all([
      // Query bookings table
      supabase
        .from("bookings")
        .select(
          `
          *,
          class_sessions (
            id,
            name,
            start_time,
            end_time,
            max_capacity,
            current_bookings,
            location,
            instructor_name,
            program_id,
            programs (
              name,
              description
            )
          )
        `,
        )
        .eq("client_id", customerId)
        .order("created_at", { ascending: false }),

      // Query class_bookings table
      supabase
        .from("class_bookings")
        .select(
          `
          *,
          class_sessions (
            id,
            name,
            start_time,
            end_time,
            max_capacity,
            current_bookings,
            location,
            instructor_name,
            program_id,
            programs (
              name,
              description
            )
          )
        `,
        )
        .or(`client_id.eq.${customerId},customer_id.eq.${customerId}`)
        .order("created_at", { ascending: false }),
    ]);

    const bookingsData = bookingsResult.data || [];
    const classBookingsData = classBookingsResult.data || [];

    // Combine results
    const allBookings = [...bookingsData, ...classBookingsData];

    console.log(
      `[API] Fetched ${bookingsData.length} from bookings, ${classBookingsData.length} from class_bookings`,
    );

    return NextResponse.json({
      bookings: allBookings,
      counts: {
        bookings: bookingsData.length,
        class_bookings: classBookingsData.length,
        total: allBookings.length,
      },
    });
  } catch (error: any) {
    console.error("Error in GET /api/staff/customer-bookings:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
