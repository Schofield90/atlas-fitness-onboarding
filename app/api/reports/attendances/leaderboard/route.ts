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

    // Parse timeframe parameters
    const timeframe = searchParams.get("timeframe") || "month"; // day, week, month, year, custom
    const customStartDate = searchParams.get("start_date");
    const customEndDate = searchParams.get("end_date");
    const limit = parseInt(searchParams.get("limit") || "10");

    // Calculate date range based on timeframe
    let startDate: Date;
    let endDate = new Date();

    switch (timeframe) {
      case "day":
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        break;
      case "week":
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        break;
      case "month":
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
        startDate.setHours(0, 0, 0, 0);
        break;
      case "year":
        startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1);
        startDate.setHours(0, 0, 0, 0);
        break;
      case "custom":
        if (!customStartDate || !customEndDate) {
          return NextResponse.json(
            {
              success: false,
              error:
                "Custom timeframe requires start_date and end_date parameters",
            },
            { status: 400 },
          );
        }
        startDate = new Date(customStartDate);
        endDate = new Date(customEndDate);
        break;
      default:
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
    }

    // Query to get customer attendance counts
    const { data: attendanceData, error } = await supabase
      .from("all_attendances")
      .select("customer_id, first_name, last_name, customer_email")
      .eq("organization_id", organizationId)
      .eq("attendance_status", "attended")
      .gte("class_start_at", startDate.toISOString())
      .lte("class_start_at", endDate.toISOString());

    if (error) {
      console.error("Leaderboard query error:", error);
      throw error;
    }

    // Aggregate attendance data by customer
    const customerMap = new Map<
      string,
      {
        customer_id: string;
        customer_name: string;
        customer_email: string;
        attendance_count: number;
        rank?: number;
      }
    >();

    if (attendanceData) {
      attendanceData.forEach((record) => {
        const customerId = record.customer_id;
        if (!customerId) return;

        if (customerMap.has(customerId)) {
          customerMap.get(customerId)!.attendance_count++;
        } else {
          customerMap.set(customerId, {
            customer_id: customerId,
            customer_name:
              `${record.first_name || ""} ${record.last_name || ""}`.trim() ||
              "Unknown",
            customer_email: record.customer_email || "",
            attendance_count: 1,
          });
        }
      });
    }

    // Convert to array and sort by attendance count
    const leaderboard = Array.from(customerMap.values())
      .sort((a, b) => b.attendance_count - a.attendance_count)
      .slice(0, limit)
      .map((customer, index) => ({
        ...customer,
        rank: index + 1,
      }));

    // Calculate some statistics
    const totalAttendances = attendanceData?.length || 0;
    const uniqueCustomers = customerMap.size;
    const avgAttendancePerCustomer =
      uniqueCustomers > 0
        ? Math.round((totalAttendances / uniqueCustomers) * 10) / 10
        : 0;

    return NextResponse.json({
      success: true,
      data: {
        leaderboard,
        stats: {
          total_attendances: totalAttendances,
          unique_customers: uniqueCustomers,
          avg_attendance_per_customer: avgAttendancePerCustomer,
          timeframe,
          date_range: {
            start: startDate.toISOString(),
            end: endDate.toISOString(),
          },
        },
      },
    });
  } catch (error: any) {
    console.error("Customer leaderboard error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch customer leaderboard",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
