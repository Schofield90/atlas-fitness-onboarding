import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { requireOrgAccess } from "@/app/lib/auth/organization";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

type ChartType = "daily" | "weekly" | "monthly" | "hourly" | "day_of_week";

interface ChartDataPoint {
  label: string;
  value: number;
  date?: string;
  attended?: number;
  registered?: number;
  no_show?: number;
  cancelled?: number;
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

    // Parse chart parameters
    const chartType = (searchParams.get("type") as ChartType) || "daily";
    const dateFrom = searchParams.get("date_from");
    const dateTo = searchParams.get("date_to");
    const tz = searchParams.get("tz") || "UTC";

    // Build base query
    let query = supabase
      .from("all_attendances")
      .select("*")
      .eq("organization_id", organizationId);

    // Apply date filters
    if (dateFrom) {
      query = query.gte("class_start_at", dateFrom);
    }
    if (dateTo) {
      query = query.lte("class_start_at", dateTo);
    }

    // Apply other filters from query params
    const customerId = searchParams.get("customer_id");
    const classTypeId = searchParams.get("class_type_id");
    const venueId = searchParams.get("venue_id");
    const instructorId = searchParams.get("instructor_id");
    const membershipId = searchParams.get("membership_id");
    const includeFuture = searchParams.get("include_future") === "true";

    const bookingMethods = searchParams.getAll("booking_method");
    const bookingSources = searchParams.getAll("booking_source");
    const statuses = searchParams.getAll("status");

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

    const { data, error } = await query;

    if (error) {
      console.error("Chart data query error:", error);
      throw error;
    }

    if (!data || data.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          chart_data: [],
          chart_type: chartType,
          total_points: 0,
        },
      });
    }

    // Generate chart data based on type
    const chartData = generateChartData(data, chartType, tz);

    // Limit to 20 buckets as requested
    const limitedData = chartData.slice(0, 20);

    return NextResponse.json({
      success: true,
      data: {
        chart_data: limitedData,
        chart_type: chartType,
        total_points: chartData.length,
        truncated: chartData.length > 20,
      },
    });
  } catch (error: any) {
    console.error("Chart data error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate chart data",
        details: error.message,
      },
      { status: 500 },
    );
  }
}

function generateChartData(
  data: any[],
  chartType: ChartType,
  timezone: string,
): ChartDataPoint[] {
  const buckets: Record<string, ChartDataPoint> = {};

  data.forEach((record) => {
    const classDate = new Date(record.class_start_at);
    let bucketKey: string;
    let bucketLabel: string;

    switch (chartType) {
      case "daily":
        bucketKey = classDate.toISOString().split("T")[0];
        bucketLabel = classDate.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          timeZone: timezone,
        });
        break;

      case "weekly":
        const weekStart = new Date(classDate);
        weekStart.setDate(classDate.getDate() - classDate.getDay());
        bucketKey = weekStart.toISOString().split("T")[0];
        bucketLabel = `Week of ${weekStart.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          timeZone: timezone,
        })}`;
        break;

      case "monthly":
        bucketKey = `${classDate.getFullYear()}-${String(classDate.getMonth() + 1).padStart(2, "0")}`;
        bucketLabel = classDate.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          timeZone: timezone,
        });
        break;

      case "hourly":
        const hour = classDate.getHours();
        bucketKey = hour.toString();
        bucketLabel = `${hour.toString().padStart(2, "0")}:00`;
        break;

      case "day_of_week":
        const dayOfWeek = classDate.getDay();
        const dayNames = [
          "Sunday",
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ];
        bucketKey = dayOfWeek.toString();
        bucketLabel = dayNames[dayOfWeek];
        break;

      default:
        bucketKey = "all";
        bucketLabel = "All";
        break;
    }

    if (!buckets[bucketKey]) {
      buckets[bucketKey] = {
        label: bucketLabel,
        value: 0,
        date: bucketKey,
        attended: 0,
        registered: 0,
        no_show: 0,
        cancelled: 0,
      };
    }

    const bucket = buckets[bucketKey];
    bucket.value++;

    // Count by status
    switch (record.attendance_status) {
      case "attended":
        bucket.attended!++;
        break;
      case "registered":
        bucket.registered!++;
        break;
      case "no_show":
        bucket.no_show!++;
        break;
      case "late_cancelled":
        bucket.cancelled!++;
        break;
    }
  });

  // Convert to array and sort
  let chartData = Object.values(buckets);

  // Sort based on chart type
  switch (chartType) {
    case "daily":
    case "weekly":
    case "monthly":
      chartData.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
      break;
    case "hourly":
      chartData.sort(
        (a, b) => parseInt(a.date || "0") - parseInt(b.date || "0"),
      );
      break;
    case "day_of_week":
      chartData.sort(
        (a, b) => parseInt(a.date || "0") - parseInt(b.date || "0"),
      );
      break;
    default:
      chartData.sort((a, b) => b.value - a.value);
      break;
  }

  return chartData;
}
