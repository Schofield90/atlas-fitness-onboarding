import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { requireAuth, createErrorResponse } from "@/app/lib/api/auth-check";
import { UpdateTimeOffRequest } from "@/app/lib/types/staff";

/**
 * GET /api/staff/time-off/[id] - Get specific time off request
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

    const { data: timeOffRequest, error } = await supabase
      .from("staff_time_off_requests")
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
        approver:staff_profiles!staff_time_off_requests_approved_by_fkey (
          id,
          first_name,
          last_name
        )
      `,
      )
      .eq("id", params.id)
      .eq("organization_id", userWithOrg.organizationId)
      .single();

    if (error || !timeOffRequest) {
      return NextResponse.json(
        {
          success: false,
          error: "Time off request not found",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: timeOffRequest,
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

/**
 * PUT /api/staff/time-off/[id] - Update/approve time off request
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    // Check authentication and get organization
    const userWithOrg = await requireAuth();

    const supabase = await createClient();
    const body: UpdateTimeOffRequest & { approved_by?: string } =
      await request.json();

    // First check if time off request exists and belongs to organization
    const { data: existingRequest, error: checkError } = await supabase
      .from("staff_time_off_requests")
      .select(
        `
        *,
        staff_profiles!inner (
          first_name,
          last_name
        )
      `,
      )
      .eq("id", params.id)
      .eq("organization_id", userWithOrg.organizationId)
      .single();

    if (checkError || !existingRequest) {
      return NextResponse.json(
        {
          success: false,
          error: "Time off request not found or unauthorized",
        },
        { status: 404 },
      );
    }

    // Validate date changes if provided
    let daysRequested = existingRequest.days_requested;
    if (body.start_date || body.end_date) {
      const startDate = new Date(body.start_date || existingRequest.start_date);
      const endDate = new Date(body.end_date || existingRequest.end_date);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid date format",
            message: "Dates must be in valid ISO format (YYYY-MM-DD)",
          },
          { status: 400 },
        );
      }

      if (endDate < startDate) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid date range",
            message: "End date must be on or after start date",
          },
          { status: 400 },
        );
      }

      // Recalculate days requested
      const timeDiff = endDate.getTime() - startDate.getTime();
      daysRequested = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
    }

    // Check for conflicts if dates are being changed and status is approved/being approved
    const isBeingApproved =
      body.status === "approved" || existingRequest.status === "approved";
    const datesChanging = body.start_date || body.end_date;

    if (
      (isBeingApproved && datesChanging) ||
      (body.status === "approved" && existingRequest.status !== "approved")
    ) {
      const checkStartDate = body.start_date || existingRequest.start_date;
      const checkEndDate = body.end_date || existingRequest.end_date;

      const { data: conflictingRequests } = await supabase
        .from("staff_time_off_requests")
        .select("id, start_date, end_date, type")
        .eq("staff_id", existingRequest.staff_id)
        .eq("organization_id", userWithOrg.organizationId)
        .eq("status", "approved")
        .neq("id", params.id) // Exclude current request
        .lte("start_date", checkEndDate)
        .gte("end_date", checkStartDate);

      if (conflictingRequests && conflictingRequests.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: "Conflicting approved time off request exists",
            message: "Cannot approve: overlaps with existing approved time off",
            conflicts: conflictingRequests,
          },
          { status: 409 },
        );
      }
    }

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    // Only update fields that are provided
    if (body.type !== undefined) updateData.type = body.type;
    if (body.start_date !== undefined) updateData.start_date = body.start_date;
    if (body.end_date !== undefined) updateData.end_date = body.end_date;
    if (body.reason !== undefined) updateData.reason = body.reason;
    if (body.approval_notes !== undefined)
      updateData.approval_notes = body.approval_notes;

    // Update calculated fields
    if (daysRequested !== existingRequest.days_requested) {
      updateData.days_requested = daysRequested;
    }

    // Handle status changes and approval
    if (body.status !== undefined) {
      updateData.status = body.status;

      if (body.status === "approved") {
        updateData.approved_by = body.approved_by || userWithOrg.id;
        updateData.approved_at = new Date().toISOString();
      } else if (body.status === "denied") {
        updateData.approved_by = body.approved_by || userWithOrg.id;
        updateData.approved_at = new Date().toISOString();
      } else if (body.status === "cancelled") {
        // Keep existing approval info but mark as cancelled
      }
    }

    // Update time off request
    const { data: updatedRequest, error } = await supabase
      .from("staff_time_off_requests")
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
        ),
        approver:staff_profiles!staff_time_off_requests_approved_by_fkey (
          id,
          first_name,
          last_name
        )
      `,
      )
      .single();

    if (error) {
      console.error("Error updating time off request:", error);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to update time off request",
          message: error.message,
        },
        { status: 500 },
      );
    }

    if (!updatedRequest) {
      return NextResponse.json(
        {
          success: false,
          error: "Time off request not found or unauthorized",
        },
        { status: 404 },
      );
    }

    // Generate appropriate success message
    let message = "Time off request updated successfully";
    if (body.status === "approved") {
      message = `Time off request approved for ${existingRequest.staff_profiles.first_name} ${existingRequest.staff_profiles.last_name}`;
    } else if (body.status === "denied") {
      message = `Time off request denied for ${existingRequest.staff_profiles.first_name} ${existingRequest.staff_profiles.last_name}`;
    } else if (body.status === "cancelled") {
      message = `Time off request cancelled for ${existingRequest.staff_profiles.first_name} ${existingRequest.staff_profiles.last_name}`;
    }

    return NextResponse.json({
      success: true,
      data: updatedRequest,
      message,
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

/**
 * DELETE /api/staff/time-off/[id] - Cancel/delete time off request
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    // Check authentication and get organization
    const userWithOrg = await requireAuth();

    const supabase = await createClient();

    // First check if time off request exists and belongs to organization
    const { data: existingRequest, error: checkError } = await supabase
      .from("staff_time_off_requests")
      .select(
        `
        id, 
        status, 
        start_date, 
        end_date,
        staff_profiles!inner (
          first_name, 
          last_name
        )
      `,
      )
      .eq("id", params.id)
      .eq("organization_id", userWithOrg.organizationId)
      .single();

    if (checkError || !existingRequest) {
      return NextResponse.json(
        {
          success: false,
          error: "Time off request not found or unauthorized",
        },
        { status: 404 },
      );
    }

    // Check if the request has already started
    const today = new Date().toISOString().split("T")[0]; // Get today's date in YYYY-MM-DD format
    const startDate = existingRequest.start_date;

    if (startDate <= today && existingRequest.status === "approved") {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot delete started time off",
          message:
            "Time off request has already started or passed and cannot be deleted",
        },
        { status: 409 },
      );
    }

    // For approved requests that haven't started, we should mark as cancelled instead of deleting
    if (existingRequest.status === "approved") {
      const { data: cancelledRequest, error: cancelError } = await supabase
        .from("staff_time_off_requests")
        .update({
          status: "cancelled",
          updated_at: new Date().toISOString(),
        })
        .eq("id", params.id)
        .eq("organization_id", userWithOrg.organizationId)
        .select(
          `
          *,
          staff_profiles!inner (
            first_name,
            last_name
          )
        `,
        )
        .single();

      if (cancelError) {
        return NextResponse.json(
          {
            success: false,
            error: "Failed to cancel time off request",
            message: cancelError.message,
          },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        data: cancelledRequest,
        message: `Time off request cancelled for ${existingRequest.staff_profiles.first_name} ${existingRequest.staff_profiles.last_name}`,
      });
    }

    // Safe to delete pending or denied requests
    const { error: deleteError } = await supabase
      .from("staff_time_off_requests")
      .delete()
      .eq("id", params.id)
      .eq("organization_id", userWithOrg.organizationId);

    if (deleteError) {
      console.error("Error deleting time off request:", deleteError);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to delete time off request",
          message: deleteError.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: `Time off request for ${existingRequest.staff_profiles.first_name} ${existingRequest.staff_profiles.last_name} deleted successfully`,
      deleted_id: params.id,
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}
