import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/app/lib/supabase/server";
import { getUserAndOrganization } from "@/app/lib/auth-utils";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

interface TimesheetEntry {
  id?: string;
  staff_id: string;
  organization_id: string;
  date: string;
  clock_in_time?: string;
  clock_out_time?: string;
  break_duration_minutes?: number;
  total_hours?: number;
  hourly_rate?: number;
  status: "active" | "completed" | "approved" | "rejected";
  notes?: string;
  location?: string;
  created_at?: string;
  updated_at?: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { user, organization } = await getUserAndOrganization(supabase);

    if (!user || !organization) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, staff_id, location, notes } = body;

    // Verify staff member belongs to organization
    const { data: staffMember, error: staffError } = await supabase
      .from("staff")
      .select("id, name, hourly_rate, status")
      .eq("id", staff_id)
      .eq("organization_id", organization.id)
      .single();

    if (staffError || !staffMember) {
      return NextResponse.json(
        { error: "Staff member not found" },
        { status: 404 },
      );
    }

    if (staffMember.status !== "active") {
      return NextResponse.json(
        { error: "Staff member is not active" },
        { status: 400 },
      );
    }

    const today = new Date().toISOString().split("T")[0];
    const now = new Date().toISOString();

    if (action === "clock_in") {
      // Check if already clocked in today
      const { data: existingTimesheet } = await supabase
        .from("timesheets")
        .select("*")
        .eq("staff_id", staff_id)
        .eq("date", today)
        .eq("status", "active")
        .single();

      if (existingTimesheet) {
        return NextResponse.json(
          {
            error: "Already clocked in today",
            timesheet: existingTimesheet,
          },
          { status: 400 },
        );
      }

      // Create new timesheet entry
      const { data: timesheet, error: createError } = await supabase
        .from("timesheets")
        .insert({
          staff_id,
          organization_id: organization.id,
          date: today,
          clock_in_time: now,
          hourly_rate: staffMember.hourly_rate,
          status: "active",
          location: location || "Unknown",
          notes: notes || "",
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (createError) {
        console.error("Error creating timesheet:", createError);
        return NextResponse.json(
          { error: "Failed to clock in" },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        message: `${staffMember.name} clocked in successfully`,
        timesheet,
        action: "clock_in",
      });
    } else if (action === "clock_out") {
      // Find active timesheet for today
      const { data: activeTimesheet, error: findError } = await supabase
        .from("timesheets")
        .select("*")
        .eq("staff_id", staff_id)
        .eq("date", today)
        .eq("status", "active")
        .single();

      if (findError || !activeTimesheet) {
        return NextResponse.json(
          {
            error:
              "No active timesheet found for today. Please clock in first.",
          },
          { status: 400 },
        );
      }

      // Calculate total hours
      const clockInTime = new Date(activeTimesheet.clock_in_time);
      const clockOutTime = new Date(now);
      const totalMinutes = Math.floor(
        (clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60),
      );
      const breakMinutes =
        body.break_duration_minutes ||
        activeTimesheet.break_duration_minutes ||
        0;
      const workMinutes = Math.max(0, totalMinutes - breakMinutes);
      const totalHours = Math.round((workMinutes / 60) * 100) / 100; // Round to 2 decimal places

      // Update timesheet with clock out
      const { data: updatedTimesheet, error: updateError } = await supabase
        .from("timesheets")
        .update({
          clock_out_time: now,
          break_duration_minutes: breakMinutes,
          total_hours: totalHours,
          status: "completed",
          notes: notes || activeTimesheet.notes,
          updated_at: now,
        })
        .eq("id", activeTimesheet.id)
        .select()
        .single();

      if (updateError) {
        console.error("Error updating timesheet:", updateError);
        return NextResponse.json(
          { error: "Failed to clock out" },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        message: `${staffMember.name} clocked out successfully`,
        timesheet: updatedTimesheet,
        action: "clock_out",
        total_hours: totalHours,
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "clock_in" or "clock_out"' },
        { status: 400 },
      );
    }
  } catch (error) {
    console.error("Error processing timesheet:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { user, organization } = await getUserAndOrganization(supabase);

    if (!user || !organization) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const staffId = url.searchParams.get("staff_id");
    const date = url.searchParams.get("date");
    const startDate = url.searchParams.get("start_date");
    const endDate = url.searchParams.get("end_date");
    const status = url.searchParams.get("status");
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    let query = supabase
      .from("timesheets")
      .select(
        `
        *,
        staff:staff_id (
          name,
          email,
          role
        )
      `,
      )
      .eq("organization_id", organization.id);

    if (staffId) {
      query = query.eq("staff_id", staffId);
    }

    if (date) {
      query = query.eq("date", date);
    }

    if (startDate) {
      query = query.gte("date", startDate);
    }

    if (endDate) {
      query = query.lte("date", endDate);
    }

    if (status) {
      query = query.eq("status", status);
    }

    const {
      data: timesheets,
      error,
      count,
    } = await query
      .order("date", { ascending: false })
      .order("clock_in_time", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Error fetching timesheets:", error);
      return NextResponse.json(
        { error: "Failed to fetch timesheets" },
        { status: 500 },
      );
    }

    // Get current status for each staff member (if querying multiple staff)
    const currentStatuses: { [key: string]: any } = {};

    if (!staffId) {
      const today = new Date().toISOString().split("T")[0];
      const { data: activeTimesheets } = await supabase
        .from("timesheets")
        .select("staff_id, clock_in_time, status")
        .eq("organization_id", organization.id)
        .eq("date", today)
        .eq("status", "active");

      (activeTimesheets || []).forEach((ts) => {
        currentStatuses[ts.staff_id] = {
          is_clocked_in: true,
          clock_in_time: ts.clock_in_time,
        };
      });
    }

    return NextResponse.json({
      timesheets: timesheets || [],
      current_statuses: currentStatuses,
      total: count,
      has_more: (count || 0) > offset + limit,
    });
  } catch (error) {
    console.error("Error fetching timesheets:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { user, organization } = await getUserAndOrganization(supabase);

    if (!user || !organization) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { timesheet_id, ...updateData } = body;

    if (!timesheet_id) {
      return NextResponse.json(
        { error: "Timesheet ID required" },
        { status: 400 },
      );
    }

    // Verify timesheet belongs to organization
    const { data: existingTimesheet, error: fetchError } = await supabase
      .from("timesheets")
      .select("*")
      .eq("id", timesheet_id)
      .eq("organization_id", organization.id)
      .single();

    if (fetchError || !existingTimesheet) {
      return NextResponse.json(
        { error: "Timesheet not found" },
        { status: 404 },
      );
    }

    // Recalculate total hours if times are updated
    if (
      updateData.clock_in_time ||
      updateData.clock_out_time ||
      updateData.break_duration_minutes !== undefined
    ) {
      const clockInTime = new Date(
        updateData.clock_in_time || existingTimesheet.clock_in_time,
      );
      const clockOutTime = new Date(
        updateData.clock_out_time || existingTimesheet.clock_out_time,
      );

      if (clockOutTime && clockInTime) {
        const totalMinutes = Math.floor(
          (clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60),
        );
        const breakMinutes =
          updateData.break_duration_minutes !== undefined
            ? updateData.break_duration_minutes
            : existingTimesheet.break_duration_minutes || 0;
        const workMinutes = Math.max(0, totalMinutes - breakMinutes);
        updateData.total_hours = Math.round((workMinutes / 60) * 100) / 100;
      }
    }

    const { data: updatedTimesheet, error: updateError } = await supabase
      .from("timesheets")
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", timesheet_id)
      .eq("organization_id", organization.id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating timesheet:", updateError);
      return NextResponse.json(
        { error: "Failed to update timesheet" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Timesheet updated successfully",
      timesheet: updatedTimesheet,
    });
  } catch (error) {
    console.error("Error updating timesheet:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { user, organization } = await getUserAndOrganization(supabase);

    if (!user || !organization) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const timesheetId = url.searchParams.get("timesheet_id");

    if (!timesheetId) {
      return NextResponse.json(
        { error: "Timesheet ID required" },
        { status: 400 },
      );
    }

    // Verify timesheet belongs to organization and is not in a payroll batch
    const { data: timesheet, error: fetchError } = await supabase
      .from("timesheets")
      .select("id, status")
      .eq("id", timesheetId)
      .eq("organization_id", organization.id)
      .single();

    if (fetchError || !timesheet) {
      return NextResponse.json(
        { error: "Timesheet not found" },
        { status: 404 },
      );
    }

    if (timesheet.status === "approved") {
      return NextResponse.json(
        {
          error: "Cannot delete approved timesheet",
        },
        { status: 400 },
      );
    }

    const { error: deleteError } = await supabase
      .from("timesheets")
      .delete()
      .eq("id", timesheetId)
      .eq("organization_id", organization.id);

    if (deleteError) {
      console.error("Error deleting timesheet:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete timesheet" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Timesheet deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting timesheet:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
