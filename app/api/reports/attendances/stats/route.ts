import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { requireOrgAccess } from "@/app/lib/auth/organization";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createAdminClient();
    const searchParams = request.nextUrl.searchParams;

    // Get organization ID from authenticated user
    let organizationId: string;
    try {
      const { organizationId: orgId } = await requireOrgAccess();
      organizationId = orgId;
    } catch (e) {
      return NextResponse.json(
        {
          success: false,
          error: "No organization found. Please complete onboarding.",
        },
        { status: 401 },
      );
    }

    // Parse filters from query params
    const filters = {
      date_from: searchParams.get("date_from") || undefined,
      date_to: searchParams.get("date_to") || undefined,
      customer_id: searchParams.get("customer_id") || undefined,
      class_type_id: searchParams.get("class_type_id") || undefined,
      venue_id: searchParams.get("venue_id") || undefined,
      instructor_id: searchParams.get("instructor_id") || undefined,
      membership_id: searchParams.get("membership_id") || undefined,
      include_future: searchParams.get("include_future") === "true",
    };

    // Parse array parameters
    const bookingMethods = searchParams.getAll("booking_method");
    const bookingSources = searchParams.getAll("booking_source");
    const statuses = searchParams.getAll("status");

    // Build base query for stats
    let query = supabase
      .from("all_attendances")
      .select("attendance_status", { count: "exact" })
      .eq("organization_id", organizationId);

    // Apply date filters
    if (filters.date_from) {
      query = query.gte("class_start_at", filters.date_from);
    }
    if (filters.date_to) {
      query = query.lte("class_start_at", filters.date_to);
    }

    // Apply future classes filter
    if (!filters.include_future) {
      query = query.lte("class_start_at", new Date().toISOString());
    }

    // Apply entity filters
    if (filters.customer_id) {
      query = query.eq("customer_id", filters.customer_id);
    }
    if (filters.class_type_id) {
      query = query.eq("class_type_id", filters.class_type_id);
    }
    if (filters.venue_id) {
      query = query.eq("venue_id", filters.venue_id);
    }
    if (filters.membership_id) {
      query = query.eq("membership_id", filters.membership_id);
    }

    // Apply array filters
    if (bookingMethods.length > 0) {
      query = query.in("booking_method", bookingMethods);
    }
    if (bookingSources.length > 0) {
      query = query.in("booking_source", bookingSources);
    }
    if (statuses.length > 0) {
      query = query.in("attendance_status", statuses);
    }

    // Apply instructor filter (special handling for array field)
    if (filters.instructor_id) {
      query = query.contains("instructor_ids", [filters.instructor_id]);
    }

    // Execute query to get all matching records
    const { data, error, count } = await query;

    if (error) {
      console.error("Stats query error:", error);
      throw error;
    }

    // Calculate statistics from the data
    const totalBookings = count || 0;
    let attendedCount = 0;
    let noShowCount = 0;
    let cancelledCount = 0;
    let registeredCount = 0;

    if (data) {
      data.forEach((record) => {
        switch (record.attendance_status) {
          case "attended":
            attendedCount++;
            break;
          case "no_show":
            noShowCount++;
            break;
          case "cancelled":
          case "late_cancelled":
            cancelledCount++;
            break;
          case "confirmed":
          case "registered":
            registeredCount++;
            break;
        }
      });
    }

    const attendanceRate =
      totalBookings > 0 ? Math.round((attendedCount / totalBookings) * 100) : 0;

    return NextResponse.json({
      success: true,
      data: {
        totalBookings,
        attendedCount,
        noShowCount,
        cancelledCount,
        registeredCount,
        attendanceRate,
      },
    });
  } catch (error: any) {
    console.error("Attendance stats error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch attendance statistics",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
