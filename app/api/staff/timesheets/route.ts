import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { requireAuth, createErrorResponse } from "@/app/lib/api/auth-check";
import {
  TimesheetEntry,
  TimesheetListResponse,
  TimesheetQueryParams,
} from "@/app/lib/types/staff";

/**
 * GET /api/staff/timesheets - Get timesheets with date filters
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication and get organization
    const userWithOrg = await requireAuth();

    // Create Supabase client
    const supabase = await createClient();

    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const queryParams: TimesheetQueryParams = {
      staff_id: searchParams.get("staff_id") || undefined,
      start_date: searchParams.get("start_date") || undefined,
      end_date: searchParams.get("end_date") || undefined,
      status: (searchParams.get("status") as any) || undefined,
      page: parseInt(searchParams.get("page") || "1"),
      limit: parseInt(searchParams.get("limit") || "50"),
    };

    // Build query with staff profile join for better context
    let query = supabase
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
        )
      `,
      )
      .eq("organization_id", userWithOrg.organizationId)
      .order("clock_in", { ascending: false });

    // Apply filters
    if (queryParams.staff_id) {
      query = query.eq("staff_id", queryParams.staff_id);
    }

    if (queryParams.status) {
      query = query.eq("status", queryParams.status);
    }

    // Date filtering
    if (queryParams.start_date) {
      query = query.gte("clock_in", queryParams.start_date);
    }

    if (queryParams.end_date) {
      // Add 23:59:59 to end_date to include full day
      const endDateTime = new Date(queryParams.end_date);
      endDateTime.setHours(23, 59, 59, 999);
      query = query.lte("clock_in", endDateTime.toISOString());
    }

    // Apply pagination
    const from = ((queryParams.page || 1) - 1) * (queryParams.limit || 50);
    const to = from + (queryParams.limit || 50) - 1;

    query = query.range(from, to);

    const { data: timesheets, error, count } = await query;

    if (error) {
      console.error("Error fetching timesheets:", error);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch timesheets",
        },
        { status: 500 },
      );
    }

    const response: TimesheetListResponse = {
      success: true,
      data: timesheets || [],
      total: count || timesheets?.length || 0,
      page: queryParams.page,
      limit: queryParams.limit,
    };

    return NextResponse.json(response);
  } catch (error) {
    return createErrorResponse(error);
  }
}

/**
 * POST /api/staff/timesheets - Create new timesheet entry (for manual entries)
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication and get organization
    const userWithOrg = await requireAuth();

    const supabase = await createClient();
    const body = await request.json();

    // Validate required fields
    if (!body.staff_id || !body.clock_in) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields",
          message: "staff_id and clock_in are required",
        },
        { status: 400 },
      );
    }

    // Verify staff member belongs to organization
    const { data: staffMember, error: staffError } = await supabase
      .from("staff_profiles")
      .select("id, hourly_rate")
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

    // Check for overlapping timesheet entries
    const { data: overlapping } = await supabase
      .from("staff_timesheet_entries")
      .select("id")
      .eq("staff_id", body.staff_id)
      .eq("organization_id", userWithOrg.organizationId)
      .is("clock_out", null)
      .limit(1);

    if (overlapping && overlapping.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Staff member already has an active timesheet entry. Please clock out first.",
        },
        { status: 409 },
      );
    }

    // Get client IP address for tracking
    const forwardedFor = request.headers.get("x-forwarded-for");
    const ipAddress = forwardedFor
      ? forwardedFor.split(",")[0]
      : request.headers.get("x-real-ip") || "unknown";

    // Build insert data
    const insertData = {
      organization_id: userWithOrg.organizationId,
      staff_id: body.staff_id,
      shift_id: body.shift_id || null,
      clock_in: body.clock_in,
      clock_out: body.clock_out || null,
      break_start: body.break_start || null,
      break_end: body.break_end || null,
      break_duration: body.break_duration || 0,
      hourly_rate: body.hourly_rate || staffMember.hourly_rate,
      status: "active",
      location_clock_in: body.location || null,
      ip_address_clock_in: ipAddress,
      notes: body.notes || null,
    };

    // Create the timesheet entry
    const { data: timesheet, error } = await supabase
      .from("staff_timesheet_entries")
      .insert(insertData)
      .select(
        `
        *,
        staff_profiles!inner (
          id,
          first_name,
          last_name,
          email,
          position
        )
      `,
      )
      .single();

    if (error) {
      console.error("Error creating timesheet entry:", error);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to create timesheet entry",
          message: error.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: timesheet,
      message: "Timesheet entry created successfully",
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}
