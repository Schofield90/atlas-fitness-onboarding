import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { requireOrgAccess } from "@/app/lib/auth/organization";

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

    // Build query with same filters as main route
    let query = supabase
      .from("all_attendances")
      .select("*")
      .eq("organization_id", organizationId);

    // Apply filters from query params
    const dateFrom = searchParams.get("date_from");
    const dateTo = searchParams.get("date_to");
    const customerId = searchParams.get("customer_id");
    const classTypeId = searchParams.get("class_type_id");
    const venueId = searchParams.get("venue_id");
    const instructorId = searchParams.get("instructor_id");
    const membershipId = searchParams.get("membership_id");
    const includeFuture = searchParams.get("include_future") === "true";

    const bookingMethods = searchParams.getAll("booking_method");
    const bookingSources = searchParams.getAll("booking_source");
    const statuses = searchParams.getAll("status");

    // Apply filters
    if (dateFrom) {
      query = query.gte("class_start_at", dateFrom);
    }
    if (dateTo) {
      query = query.lte("class_start_at", dateTo);
    }
    if (!includeFuture) {
      query = query.lte("class_start_at", new Date().toISOString());
    }
    if (customerId) {
      query = query.eq("customer_id", customerId);
    }
    if (classTypeId) {
      query = query.eq("class_type_id", classTypeId);
    }
    if (venueId) {
      query = query.eq("venue_id", venueId);
    }
    if (membershipId) {
      query = query.eq("membership_id", membershipId);
    }
    if (instructorId) {
      query = query.contains("instructor_ids", [instructorId]);
    }
    if (bookingMethods.length > 0) {
      query = query.in("booking_method", bookingMethods);
    }
    if (bookingSources.length > 0) {
      query = query.in("booking_source", bookingSources);
    }
    if (statuses.length > 0) {
      query = query.in("attendance_status", statuses);
    }

    // Order by class start time
    query = query.order("class_start_at", { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error("Attendance export error:", error);
      throw error;
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No attendance data found for the specified filters",
        },
        { status: 404 },
      );
    }

    // Generate CSV content
    const csvContent = generateCSV(data);

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split("T")[0];
    const filename = `attendances-report-${timestamp}.csv`;

    // Return CSV response
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error: any) {
    console.error("Attendances export error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to export attendances report",
        details: error.message,
      },
      { status: 500 },
    );
  }
}

function generateCSV(data: any[]): string {
  // Define CSV headers
  const headers = [
    "Booking ID",
    "Customer Name",
    "Customer Email",
    "Customer Phone",
    "Class Type",
    "Class Start Time",
    "Class End Time",
    "Venue",
    "Room Location",
    "Duration (min)",
    "Instructor IDs",
    "Membership",
    "Membership Active",
    "Attendance Status",
    "Booking Method",
    "Booking Source",
    "Checked In At",
    "Checked Out At",
    "Payment Amount",
    "Was Late",
    "Minutes Late",
    "Booking Created At",
  ];

  // Convert data to CSV rows
  const rows = data.map((record) => {
    const customerName =
      `${record.first_name || ""} ${record.last_name || ""}`.trim();
    const classStart = record.class_start_at
      ? new Date(record.class_start_at).toLocaleString()
      : "";
    const classEnd = record.class_end_at
      ? new Date(record.class_end_at).toLocaleString()
      : "";
    const checkedInAt = record.checked_in_at
      ? new Date(record.checked_in_at).toLocaleString()
      : "";
    const checkedOutAt = record.checked_out_at
      ? new Date(record.checked_out_at).toLocaleString()
      : "";
    const bookingCreatedAt = record.booking_created_at
      ? new Date(record.booking_created_at).toLocaleString()
      : "";
    const paymentAmount = record.payment_amount_pennies
      ? (record.payment_amount_pennies / 100).toFixed(2)
      : "0.00";
    const instructorIds = record.instructor_ids
      ? record.instructor_ids.join(", ")
      : "";

    return [
      record.booking_id || "",
      customerName || "",
      record.email || "",
      record.phone || "",
      record.class_type_name || "",
      classStart,
      classEnd,
      record.venue_name || "",
      record.room_location || "",
      record.duration_min || "",
      instructorIds,
      record.membership_name || "",
      record.membership_active ? "Yes" : "No",
      record.attendance_status || "",
      record.booking_method || "",
      record.booking_source || "",
      checkedInAt,
      checkedOutAt,
      paymentAmount,
      record.was_late ? "Yes" : "No",
      record.minutes_late || "",
      bookingCreatedAt,
    ];
  });

  // Escape CSV values and join
  const escapeCsvValue = (value: string | number): string => {
    const stringValue = String(value);
    if (
      stringValue.includes(",") ||
      stringValue.includes('"') ||
      stringValue.includes("\n")
    ) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };

  // Build CSV content
  const csvRows = [
    headers.map(escapeCsvValue).join(","),
    ...rows.map((row) => row.map(escapeCsvValue).join(",")),
  ];

  return csvRows.join("\n");
}
