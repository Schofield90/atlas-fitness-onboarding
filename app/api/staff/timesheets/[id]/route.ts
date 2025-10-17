import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { requireAuth, createErrorResponse } from "@/app/lib/api/auth-check";
import { UpdateTimesheetRequest } from "@/app/lib/types/staff";

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

/**
 * GET /api/staff/timesheets/[id] - Get specific timesheet entry
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    // Check authentication and get organization
    const userWithOrg = await requireAuth();

    // Create Supabase client
    const supabase = await createClient();

    const { data: timesheet, error } = await supabase
      .from("staff_timesheet_entries")
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
        ),
        staff_shifts (
          id,
          shift_date,
          start_time,
          end_time,
          location,
          position
        )
      `,
      )
      .eq("id", params.id)
      .eq("organization_id", userWithOrg.organizationId)
      .single();

    if (error || !timesheet) {
      return NextResponse.json(
        {
          success: false,
          error: "Timesheet entry not found",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: timesheet,
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

/**
 * PUT /api/staff/timesheets/[id] - Update timesheet entry
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    // Check authentication and get organization
    const userWithOrg = await requireAuth();

    const supabase = await createClient();
    const body: UpdateTimesheetRequest = await request.json();

    // First check if timesheet exists and belongs to organization
    const { data: existingTimesheet, error: checkError } = await supabase
      .from("staff_timesheet_entries")
      .select("*, staff_profiles!inner(first_name, last_name)")
      .eq("id", params.id)
      .eq("organization_id", userWithOrg.organizationId)
      .single();

    if (checkError || !existingTimesheet) {
      return NextResponse.json(
        {
          success: false,
          error: "Timesheet entry not found or unauthorized",
        },
        { status: 404 },
      );
    }

    // Validate break time logic if break times are being updated
    if (body.break_start && body.break_end) {
      const breakStart = new Date(body.break_start);
      const breakEnd = new Date(body.break_end);

      if (breakEnd <= breakStart) {
        return NextResponse.json(
          {
            success: false,
            error: "Break end time must be after break start time",
          },
          { status: 400 },
        );
      }

      // Calculate break duration in minutes
      const breakMinutes = Math.floor(
        (breakEnd.getTime() - breakStart.getTime()) / (1000 * 60),
      );
      body.break_duration = breakMinutes;
    }

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    // Only update fields that are provided
    if (body.break_start !== undefined)
      updateData.break_start = body.break_start;
    if (body.break_end !== undefined) updateData.break_end = body.break_end;
    if (body.break_duration !== undefined)
      updateData.break_duration = body.break_duration;
    if (body.hourly_rate !== undefined)
      updateData.hourly_rate = body.hourly_rate;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.approved_by !== undefined) {
      updateData.approved_by = body.approved_by;
      updateData.approved_at = new Date().toISOString();
    }

    // Recalculate totals if necessary fields are being updated
    if (body.break_duration !== undefined || body.hourly_rate !== undefined) {
      const clockIn = new Date(existingTimesheet.clock_in);
      const clockOut = existingTimesheet.clock_out
        ? new Date(existingTimesheet.clock_out)
        : null;

      if (clockOut) {
        const totalMinutes = Math.floor(
          (clockOut.getTime() - clockIn.getTime()) / (1000 * 60),
        );
        const breakDuration =
          body.break_duration ?? existingTimesheet.break_duration;
        const workMinutes = Math.max(0, totalMinutes - breakDuration);
        const totalHours = workMinutes / 60;

        updateData.total_hours = Math.round(totalHours * 100) / 100;

        const hourlyRate = body.hourly_rate ?? existingTimesheet.hourly_rate;
        if (hourlyRate) {
          updateData.total_pay =
            Math.round(totalHours * hourlyRate * 100) / 100;
        }
      }
    }

    // Update timesheet entry
    const { data: updatedTimesheet, error } = await supabase
      .from("staff_timesheet_entries")
      .update(updateData)
      .eq("id", params.id)
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

    if (error) {
      console.error("Error updating timesheet entry:", error);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to update timesheet entry",
          message: error.message,
        },
        { status: 500 },
      );
    }

    if (!updatedTimesheet) {
      return NextResponse.json(
        {
          success: false,
          error: "Timesheet entry not found or unauthorized",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedTimesheet,
      message: "Timesheet entry updated successfully",
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

/**
 * DELETE /api/staff/timesheets/[id] - Delete timesheet entry
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    // Check authentication and get organization
    const userWithOrg = await requireAuth();

    const supabase = await createClient();

    // First check if timesheet exists and belongs to organization
    const { data: existingTimesheet, error: checkError } = await supabase
      .from("staff_timesheet_entries")
      .select(
        `
        id, 
        clock_in, 
        clock_out, 
        status,
        staff_profiles!inner(first_name, last_name)
      `,
      )
      .eq("id", params.id)
      .eq("organization_id", userWithOrg.organizationId)
      .single();

    if (checkError || !existingTimesheet) {
      return NextResponse.json(
        {
          success: false,
          error: "Timesheet entry not found or unauthorized",
        },
        { status: 404 },
      );
    }

    // Prevent deletion of active (not clocked out) entries
    if (existingTimesheet.status === "active" && !existingTimesheet.clock_out) {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot delete active timesheet entry",
          message:
            "Please clock out the staff member first, or use the clock-out endpoint",
        },
        { status: 409 },
      );
    }

    // Check if this timesheet is part of processed payroll
    const { data: payrollEntry } = await supabase
      .from("staff_payroll_entries")
      .select("id")
      .eq("organization_id", userWithOrg.organizationId)
      .overlaps("timesheet_ids", [params.id])
      .limit(1);

    if (payrollEntry && payrollEntry.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot delete timesheet entry",
          message:
            "This timesheet entry is associated with processed payroll and cannot be deleted",
        },
        { status: 409 },
      );
    }

    // Perform the deletion
    const { error: deleteError } = await supabase
      .from("staff_timesheet_entries")
      .delete()
      .eq("id", params.id)
      .eq("organization_id", userWithOrg.organizationId);

    if (deleteError) {
      console.error("Error deleting timesheet entry:", deleteError);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to delete timesheet entry",
          message: deleteError.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: `Timesheet entry for ${existingTimesheet.staff_profiles.first_name} ${existingTimesheet.staff_profiles.last_name} deleted successfully`,
      deleted_id: params.id,
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}
