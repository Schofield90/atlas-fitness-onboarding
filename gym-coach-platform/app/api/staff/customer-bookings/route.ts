import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

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

    // Validate user.id
    if (!user.id || user.id === "") {
      console.error("[API] Invalid user.id:", user.id);
      return NextResponse.json({ error: "Invalid user session" }, { status: 401 });
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

    console.log("[API] Checking staff access for user:", user.id, "customer:", customerId);

    // Verify staff has access to this organization
    // Check user_organizations first
    const { data: staffOrg, error: staffOrgError } = await supabase
      .from("user_organizations")
      .select("organization_id, role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (staffOrgError) {
      console.error("[API] Error checking user_organizations:", staffOrgError);
    }

    // Fallback to organization_staff table if not found
    let organizationId = staffOrg?.organization_id;

    if (!organizationId) {
      const { data: staffRecord, error: staffRecordError } = await supabase
        .from("organization_staff")
        .select("organization_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (staffRecordError) {
        console.error("[API] Error checking organization_staff:", staffRecordError);
      }

      organizationId = staffRecord?.organization_id;
      console.log("[API] Fallback to organization_staff, found org:", organizationId);
    } else {
      console.log("[API] Found org from user_organizations:", organizationId);
    }

    if (!organizationId) {
      console.error("[API] No organization found for user:", user.id);
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

    // Create service role client to bypass RLS
    const supabaseAdmin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Fetch from both tables using service role
    const [bookingsResult, classBookingsResult] = await Promise.all([
      // Query bookings table
      supabaseAdmin
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
      supabaseAdmin
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

    console.log('[API] Bookings result:', bookingsResult);
    console.log('[API] Class bookings result:', classBookingsResult);

    const bookingsData = bookingsResult.data || [];
    const classBookingsData = classBookingsResult.data || [];

    // Combine results
    const allBookings = [...bookingsData, ...classBookingsData];

    console.log(
      `[API] Fetched ${bookingsData.length} from bookings, ${classBookingsData.length} from class_bookings`,
    );
    console.log('[API] Returning bookings:', allBookings);

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
