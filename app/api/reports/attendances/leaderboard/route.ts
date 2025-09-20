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

    // Query current attendance data from all_attendances view
    const { data: attendanceData, error } = await supabase
      .from("all_attendances")
      .select(
        "customer_id, first_name, last_name, customer_email, attendance_status, class_start_at",
      )
      .eq("organization_id", organizationId)
      .not("customer_id", "is", null)
      .gte("class_start_at", startDate.toISOString())
      .lte("class_start_at", endDate.toISOString());

    console.log(
      `Found ${attendanceData?.length || 0} current attendance records for date range`,
    );

    // If no current attendance data found, create a leaderboard showing imported clients
    // with a message that they haven't booked classes yet in the new system
    if (!attendanceData || attendanceData.length === 0) {
      console.log(
        "No current attendance data found, checking for imported clients",
      );

      const { data: importedClients, error: clientError } = await supabase
        .from("clients")
        .select("id, first_name, last_name, email, created_at")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (importedClients && importedClients.length > 0) {
        console.log(`Found ${importedClients.length} imported clients`);

        // Return imported clients with 0 attendance for now
        const clientLeaderboard = importedClients.map((client, index) => ({
          rank: index + 1,
          customer_id: client.id,
          customer_name: `${client.first_name} ${client.last_name}`.trim(),
          customer_email: client.email,
          attendance_count: 0,
        }));

        return NextResponse.json({
          success: true,
          data: {
            leaderboard: clientLeaderboard,
            stats: {
              total_attendances: 0,
              unique_customers: importedClients.length,
              avg_attendance_per_customer: 0,
              timeframe,
              date_range: {
                start: startDate.toISOString(),
                end: endDate.toISOString(),
              },
              note: "Showing imported customers. Historical GoTeamUp attendance data not yet integrated with new booking system.",
            },
          },
        });
      }
    }

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
      console.log(`Processing ${attendanceData.length} attendance records`);
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
