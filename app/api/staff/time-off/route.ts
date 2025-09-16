import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { requireAuth, createErrorResponse } from "@/app/lib/api/auth-check";
import {
  TimeOffRequest,
  CreateTimeOffRequest,
  TimeOffListResponse,
  TimeOffQueryParams,
} from "@/app/lib/types/staff";

/**
 * GET /api/staff/time-off - List time off requests
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication and get organization
    const userWithOrg = await requireAuth();

    // Create Supabase client
    const supabase = createClient();

    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const queryParams: TimeOffQueryParams = {
      staff_id: searchParams.get("staff_id") || undefined,
      type: (searchParams.get("type") as any) || undefined,
      status: (searchParams.get("status") as any) || undefined,
      start_date: searchParams.get("start_date") || undefined,
      end_date: searchParams.get("end_date") || undefined,
      page: parseInt(searchParams.get("page") || "1"),
      limit: parseInt(searchParams.get("limit") || "50"),
    };

    // Build query with staff profile join for better context
    let query = supabase
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
      .eq("organization_id", userWithOrg.organizationId)
      .order("created_at", { ascending: false });

    // Apply filters
    if (queryParams.staff_id) {
      query = query.eq("staff_id", queryParams.staff_id);
    }

    if (queryParams.type) {
      query = query.eq("type", queryParams.type);
    }

    if (queryParams.status) {
      query = query.eq("status", queryParams.status);
    }

    // Date filtering - requests that overlap with the specified date range
    if (queryParams.start_date && queryParams.end_date) {
      query = query
        .lte("start_date", queryParams.end_date)
        .gte("end_date", queryParams.start_date);
    } else if (queryParams.start_date) {
      query = query.gte("end_date", queryParams.start_date);
    } else if (queryParams.end_date) {
      query = query.lte("start_date", queryParams.end_date);
    }

    // Apply pagination
    const from = ((queryParams.page || 1) - 1) * (queryParams.limit || 50);
    const to = from + (queryParams.limit || 50) - 1;

    query = query.range(from, to);

    const { data: timeOffRequests, error, count } = await query;

    if (error) {
      console.error("Error fetching time off requests:", error);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch time off requests",
        },
        { status: 500 },
      );
    }

    const response: TimeOffListResponse = {
      success: true,
      data: timeOffRequests || [],
      total: count || timeOffRequests?.length || 0,
      page: queryParams.page,
      limit: queryParams.limit,
    };

    return NextResponse.json(response);
  } catch (error) {
    return createErrorResponse(error);
  }
}

/**
 * POST /api/staff/time-off - Create new time off request
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication and get organization
    const userWithOrg = await requireAuth();

    const supabase = createClient();
    const body: CreateTimeOffRequest & { staff_id: string } =
      await request.json();

    // Validate required fields
    if (!body.staff_id || !body.type || !body.start_date || !body.end_date) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields",
          message: "staff_id, type, start_date, and end_date are required",
        },
        { status: 400 },
      );
    }

    // Validate date format and logic
    const startDate = new Date(body.start_date);
    const endDate = new Date(body.end_date);

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

    // Verify staff member belongs to organization
    const { data: staffMember, error: staffError } = await supabase
      .from("staff_profiles")
      .select("id, first_name, last_name, status")
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

    // Check if staff member is active
    if (staffMember.status !== "active") {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot create time off request: staff member status is ${staffMember.status}`,
        },
        { status: 403 },
      );
    }

    // Calculate days requested
    const timeDiff = endDate.getTime() - startDate.getTime();
    const daysRequested = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1; // +1 to include both start and end date

    // Check for overlapping approved requests
    const { data: conflictingRequests } = await supabase
      .from("staff_time_off_requests")
      .select("id, start_date, end_date, type, status")
      .eq("staff_id", body.staff_id)
      .eq("organization_id", userWithOrg.organizationId)
      .eq("status", "approved")
      .lte("start_date", body.end_date)
      .gte("end_date", body.start_date);

    if (conflictingRequests && conflictingRequests.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Conflicting time off request exists",
          message:
            "There is already an approved time off request that overlaps with these dates",
          conflicts: conflictingRequests,
        },
        { status: 409 },
      );
    }

    // Build insert data
    const insertData = {
      organization_id: userWithOrg.organizationId,
      staff_id: body.staff_id,
      type: body.type,
      start_date: body.start_date,
      end_date: body.end_date,
      days_requested: daysRequested,
      reason: body.reason || null,
      status: "pending",
    };

    // Create the time off request
    const { data: timeOffRequest, error } = await supabase
      .from("staff_time_off_requests")
      .insert(insertData)
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
      console.error("Error creating time off request:", error);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to create time off request",
          message: error.message,
        },
        { status: 500 },
      );
    }

    // TODO: Send notification to managers/administrators
    // This could be implemented later as part of the notification system

    return NextResponse.json({
      success: true,
      data: timeOffRequest,
      message: `Time off request created successfully for ${staffMember.first_name} ${staffMember.last_name}`,
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}
