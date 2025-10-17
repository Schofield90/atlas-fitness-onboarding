import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { requireOrgAccess } from "@/app/lib/auth/organization";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

interface AttendanceFilters {
  date_from?: string;
  date_to?: string;
  tz?: string;
  customer_id?: string;
  class_type_id?: string;
  venue_id?: string;
  instructor_id?: string;
  booking_method?: string[];
  booking_source?: string[];
  membership_id?: string;
  status?: string[];
  include_future?: boolean;
  group_by?:
    | "each"
    | "customer"
    | "class_type"
    | "venue"
    | "instructor"
    | "day_of_week"
    | "start_time"
    | "booking_method"
    | "status"
    | "booking_source";
  page?: number;
  page_size?: number;
}

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
    const filters: AttendanceFilters = {
      date_from: searchParams.get("date_from") || undefined,
      date_to: searchParams.get("date_to") || undefined,
      tz: searchParams.get("tz") || "UTC",
      customer_id: searchParams.get("customer_id") || undefined,
      class_type_id: searchParams.get("class_type_id") || undefined,
      venue_id: searchParams.get("venue_id") || undefined,
      instructor_id: searchParams.get("instructor_id") || undefined,
      membership_id: searchParams.get("membership_id") || undefined,
      include_future: searchParams.get("include_future") === "true",
      group_by:
        (searchParams.get("group_by") as AttendanceFilters["group_by"]) ||
        "each",
      page: parseInt(searchParams.get("page") || "1"),
      page_size: parseInt(searchParams.get("page_size") || "50"),
    };

    // Parse array parameters
    const bookingMethods = searchParams.getAll("booking_method");
    if (bookingMethods.length > 0) {
      filters.booking_method = bookingMethods;
    }

    const bookingSources = searchParams.getAll("booking_source");
    if (bookingSources.length > 0) {
      filters.booking_source = bookingSources;
    }

    const statuses = searchParams.getAll("status");
    if (statuses.length > 0) {
      filters.status = statuses;
    }

    // Build base query
    let query = supabase
      .from("all_attendances")
      .select("*", { count: "exact" })
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
    if (filters.booking_method && filters.booking_method.length > 0) {
      query = query.in("booking_method", filters.booking_method);
    }
    if (filters.booking_source && filters.booking_source.length > 0) {
      query = query.in("booking_source", filters.booking_source);
    }
    if (filters.status && filters.status.length > 0) {
      query = query.in("attendance_status", filters.status);
    }

    // Apply instructor filter (special handling for array field)
    if (filters.instructor_id) {
      query = query.contains("instructor_ids", [filters.instructor_id]);
    }

    // Handle grouping vs individual records
    if (filters.group_by === "each") {
      // Return individual attendance records with pagination
      const offset = (filters.page! - 1) * filters.page_size!;

      query = query
        .order("class_start_at", { ascending: false })
        .range(offset, offset + filters.page_size! - 1);

      const { data, error, count } = await query;

      if (error) {
        console.error("Attendance query error:", error);
        throw error;
      }

      return NextResponse.json({
        success: true,
        data: {
          attendances: data || [],
          pagination: {
            page: filters.page,
            page_size: filters.page_size,
            total_count: count || 0,
            total_pages: Math.ceil((count || 0) / filters.page_size!),
          },
          group_by: "each",
        },
      });
    } else {
      // Return grouped data
      const { data: rawData, error } = await query;

      if (error) {
        console.error("Attendance query error:", error);
        throw error;
      }

      if (!rawData) {
        return NextResponse.json({
          success: true,
          data: {
            grouped_data: [],
            total_count: 0,
            group_by: filters.group_by,
          },
        });
      }

      // Group the data based on group_by parameter
      const groupedData = groupAttendanceData(rawData, filters.group_by!);

      return NextResponse.json({
        success: true,
        data: {
          grouped_data: groupedData,
          total_count: rawData.length,
          group_by: filters.group_by,
        },
      });
    }
  } catch (error: any) {
    console.error("Attendances report error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch attendances report",
        details: error.message,
      },
      { status: 500 },
    );
  }
}

function groupAttendanceData(data: any[], groupBy: string): any[] {
  const groups: Record<string, any> = {};

  data.forEach((record) => {
    let groupKey: string;
    let groupLabel: string;

    switch (groupBy) {
      case "customer":
        groupKey = record.customer_id || "unknown";
        groupLabel =
          `${record.first_name || ""} ${record.last_name || ""}`.trim() ||
          "Unknown Customer";
        break;
      case "class_type":
        groupKey = record.class_type_name || "unknown";
        groupLabel = record.class_type_name || "Unknown Class Type";
        break;
      case "venue":
        groupKey = record.venue_id || "unknown";
        groupLabel = record.venue_name || "Unknown Venue";
        break;
      case "instructor":
        // Handle instructor array - use first instructor for grouping
        groupKey = record.instructor_ids?.[0] || "unknown";
        groupLabel = `Instructor ${record.instructor_ids?.[0] || "Unknown"}`;
        break;
      case "day_of_week":
        const dayOfWeek = new Date(record.class_start_at).getDay();
        const dayNames = [
          "Sunday",
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ];
        groupKey = dayOfWeek.toString();
        groupLabel = dayNames[dayOfWeek];
        break;
      case "start_time":
        const startTime = new Date(record.class_start_at);
        const hour = startTime.getHours();
        groupKey = hour.toString();
        groupLabel = `${hour.toString().padStart(2, "0")}:00`;
        break;
      case "booking_method":
        groupKey = record.booking_method || "unknown";
        groupLabel = record.booking_method || "Unknown Method";
        break;
      case "status":
        groupKey = record.attendance_status || "unknown";
        groupLabel = record.attendance_status || "Unknown Status";
        break;
      case "booking_source":
        groupKey = record.booking_source || "unknown";
        groupLabel = record.booking_source || "Unknown Source";
        break;
      default:
        groupKey = "all";
        groupLabel = "All";
        break;
    }

    if (!groups[groupKey]) {
      groups[groupKey] = {
        group_key: groupKey,
        group_label: groupLabel,
        total_bookings: 0,
        attended_count: 0,
        no_show_count: 0,
        cancelled_count: 0,
        registered_count: 0,
        attendance_rate: 0,
      };
    }

    const group = groups[groupKey];
    group.total_bookings++;

    switch (record.attendance_status) {
      case "attended":
        group.attended_count++;
        break;
      case "no_show":
        group.no_show_count++;
        break;
      case "late_cancelled":
        group.cancelled_count++;
        break;
      case "registered":
        group.registered_count++;
        break;
    }

    // Calculate attendance rate
    group.attendance_rate =
      group.total_bookings > 0
        ? Math.round((group.attended_count / group.total_bookings) * 100)
        : 0;
  });

  // Convert to array and sort by total bookings descending
  return Object.values(groups).sort(
    (a: any, b: any) => b.total_bookings - a.total_bookings,
  );
}
