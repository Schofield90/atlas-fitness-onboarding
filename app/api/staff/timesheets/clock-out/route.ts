import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { requireAuth, createErrorResponse } from "@/app/lib/api/auth-check";
import { ClockOutRequest } from "@/app/lib/types/staff";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

/**
 * POST /api/staff/timesheets/clock-out - Clock out
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication and get organization
    const userWithOrg = await requireAuth();

    const supabase = await createClient();
    const body: ClockOutRequest = await request.json();

    // Validate required fields
    if (!body.staff_id) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields",
          message: "staff_id is required",
        },
        { status: 400 },
      );
    }

    // Verify staff member belongs to organization
    const { data: staffMember, error: staffError } = await supabase
      .from("staff_profiles")
      .select("id, first_name, last_name, hourly_rate")
      .eq("id", body.staff_id)
      .eq("organization_id", userWithOrg.organizationId)
      .single();

    if (staffError || !staffMember) {
      return NextResponse.json(
        {
          success: false,
          error: "Staff member not found or unauthorized",
        },
        { status: 404 },
      );
    }

    // Find active timesheet entry
    const { data: activeTimesheet, error: timesheetError } = await supabase
      .from("staff_timesheet_entries")
      .select("*")
      .eq("staff_id", body.staff_id)
      .eq("organization_id", userWithOrg.organizationId)
      .is("clock_out", null)
      .order("clock_in", { ascending: false })
      .limit(1)
      .single();

    if (timesheetError || !activeTimesheet) {
      return NextResponse.json(
        {
          success: false,
          error: "No active timesheet entry found",
          message: "Staff member is not currently clocked in",
        },
        { status: 404 },
      );
    }

    // Get client IP address for tracking
    const forwardedFor = request.headers.get("x-forwarded-for");
    const ipAddress = forwardedFor
      ? forwardedFor.split(",")[0]
      : request.headers.get("x-real-ip") || "unknown";
    const clockOutTime = new Date().toISOString();

    // Calculate total hours and pay
    const clockInTime = new Date(activeTimesheet.clock_in);
    const clockOutTimeDate = new Date(clockOutTime);
    const totalMinutes = Math.floor(
      (clockOutTimeDate.getTime() - clockInTime.getTime()) / (1000 * 60),
    );
    const breakDuration = activeTimesheet.break_duration || 0;
    const totalHours = Math.max(0, (totalMinutes - breakDuration) / 60);

    // Calculate pay if hourly rate is available
    const hourlyRate = activeTimesheet.hourly_rate || staffMember.hourly_rate;
    const totalPay = hourlyRate ? totalHours * hourlyRate : null;

    // Update timesheet entry with clock out
    const updateData = {
      clock_out: clockOutTime,
      total_hours: Math.round(totalHours * 100) / 100, // Round to 2 decimal places
      total_pay: totalPay ? Math.round(totalPay * 100) / 100 : null,
      status: "completed",
      location_clock_out: body.location || null,
      ip_address_clock_out: ipAddress,
      notes: body.notes || activeTimesheet.notes,
      updated_at: clockOutTime,
    };

    const { data: updatedTimesheet, error: updateError } = await supabase
      .from("staff_timesheet_entries")
      .update(updateData)
      .eq("id", activeTimesheet.id)
      .eq("organization_id", userWithOrg.organizationId)
      .select(
        `
        *,
        staff_profiles!inner (
          id,
          first_name,
          last_name,
          email,
          position,
          department
        )
      `,
      )
      .single();

    if (updateError) {
      console.error("Error updating timesheet for clock-out:", updateError);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to clock out",
          message: updateError.message,
        },
        { status: 500 },
      );
    }

    // Update related shift status if applicable
    if (activeTimesheet.shift_id) {
      await supabase
        .from("staff_shifts")
        .update({ status: "completed" })
        .eq("id", activeTimesheet.shift_id)
        .eq("organization_id", userWithOrg.organizationId);
    }

    // Calculate some summary statistics for the response
    const workDuration = {
      total_minutes: totalMinutes,
      break_minutes: breakDuration,
      work_minutes: totalMinutes - breakDuration,
      total_hours: totalHours,
      formatted_duration: formatDuration(totalMinutes - breakDuration),
    };

    return NextResponse.json({
      success: true,
      data: updatedTimesheet,
      message: `${staffMember.first_name} ${staffMember.last_name} clocked out successfully`,
      clock_out_time: clockOutTime,
      work_summary: workDuration,
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

// Helper function to format duration in a human-readable format
function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) {
    return `${remainingMinutes} minutes`;
  } else if (remainingMinutes === 0) {
    return `${hours} ${hours === 1 ? "hour" : "hours"}`;
  } else {
    return `${hours} ${hours === 1 ? "hour" : "hours"} ${remainingMinutes} minutes`;
  }
}
