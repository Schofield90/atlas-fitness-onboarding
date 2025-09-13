import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { requireAuth, createErrorResponse } from "@/app/lib/api/auth-check";

export async function GET(request: NextRequest) {
  try {
    // SECURITY: Get authenticated user's organization - NEVER accept from query params
    const user = await requireAuth();
    const organizationId = user.organizationId;

    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Use provided dates or default to next 7 days
    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate
      ? new Date(endDate)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Get all class sessions with program details and booking count
    console.log(
      "[API] Fetching classes for org:",
      organizationId,
      "Date range:",
      start.toISOString(),
      "to",
      end.toISOString(),
    );

    const { data: classes, error } = await supabase
      .from("class_sessions")
      .select(
        `
        *,
        program:programs(name, description, price_pennies, max_participants, default_capacity),
        bookings:class_bookings!left(
          id,
          customer_id,
          booking_status,
          created_at
        )
      `,
      )
      .eq("organization_id", organizationId)
      .gte("start_time", start.toISOString())
      .lte("start_time", end.toISOString())
      .order("start_time", { ascending: true });

    console.log("[API] Raw query result - class count:", classes?.length);
    console.log(
      "[API] Sample class with bookings:",
      classes?.[0]
        ? {
            id: classes[0].id,
            start_time: classes[0].start_time,
            bookings_count: classes[0].bookings?.length || 0,
            bookings: classes[0].bookings,
          }
        : "No classes found",
    );

    if (error) {
      console.error("Error fetching classes:", error);
      return NextResponse.json(
        { error: "Failed to fetch classes" },
        { status: 500 },
      );
    }

    // Log all classes with bookings for debugging
    if (classes && classes.length > 0) {
      const classesWithBookings = classes.filter(
        (c) => c.bookings && c.bookings.length > 0,
      );
      console.log("API: Classes with bookings:", classesWithBookings.length);
      classesWithBookings.forEach((cls) => {
        console.log(`Class ${cls.id} at ${cls.start_time}:`, {
          bookingsCount: cls.bookings?.length || 0,
          bookings: cls.bookings,
        });
      });
    }

    // Transform classes to ensure capacity is correctly set
    // Use the class session's max_capacity first, then fall back to program's max_participants or default_capacity
    const transformedClasses = (classes || []).map((cls) => ({
      ...cls,
      capacity:
        cls.max_capacity ||
        cls.program?.max_participants ||
        cls.program?.default_capacity ||
        20,
      // Also ensure max_capacity is set for consistency
      max_capacity:
        cls.max_capacity ||
        cls.program?.max_participants ||
        cls.program?.default_capacity ||
        20,
    }));

    return NextResponse.json({ classes: transformedClasses });
  } catch (error) {
    console.error("Error in GET /api/booking/classes:", error);
    return createErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    // SECURITY: Get authenticated user's organization - NEVER accept from request body
    const user = await requireAuth();
    const organizationId = user.organizationId;

    const supabase = await createClient();
    const body = await request.json();

    const {
      programId,
      title,
      instructor,
      startTime,
      duration,
      capacity,
      room,
      price,
      description,
      type,
    } = body;

    // First, create or get the program
    let actualProgramId = programId;

    if (!programId) {
      // Create a new program for this class type
      const { data: program, error: programError } = await supabase
        .from("programs")
        .insert({
          organization_id: organizationId,
          name: title,
          description: description || `${type} class`,
          price_pennies: price * 100,
          is_active: true,
        })
        .select()
        .single();

      if (programError) {
        console.error("Error creating program:", programError);
        return NextResponse.json(
          { error: "Failed to create program" },
          { status: 500 },
        );
      }

      actualProgramId = program.id;
    }

    // Create the class session
    const { data: classSession, error: sessionError } = await supabase
      .from("class_sessions")
      .insert({
        organization_id: organizationId,
        program_id: actualProgramId,
        instructor_name: instructor,
        start_time: startTime,
        duration_minutes: duration,
        max_capacity: capacity, // Use max_capacity as that's the actual column name
        location: room,
        is_active: true,
      })
      .select()
      .single();

    if (sessionError) {
      console.error("Error creating class session:", sessionError);
      return NextResponse.json(
        { error: "Failed to create class session" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      message: "Class created successfully",
      class: classSession,
    });
  } catch (error) {
    console.error("Error in POST /api/booking/classes:", error);
    return createErrorResponse(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    // SECURITY: Get authenticated user's organization
    const user = await requireAuth();

    const supabase = await createClient();
    const body = await request.json();
    const { classId, ...updateData } = body;

    if (!classId) {
      return NextResponse.json({ error: "Class ID required" }, { status: 400 });
    }

    // SECURITY: Update only if class belongs to user's organization
    const { data, error } = await supabase
      .from("class_sessions")
      .update({
        instructor_name: updateData.instructor,
        start_time: updateData.startTime,
        duration_minutes: updateData.duration,
        max_capacity: updateData.capacity, // Use max_capacity as that's the actual column name
        location: updateData.room,
      })
      .eq("id", classId)
      .eq("organization_id", user.organizationId) // SECURITY: Ensure organization ownership
      .select()
      .single();

    if (error) {
      console.error("Error updating class:", error);
      return NextResponse.json(
        { error: "Failed to update class" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      message: "Class updated successfully",
      class: data,
    });
  } catch (error) {
    console.error("Error in PUT /api/booking/classes:", error);
    return createErrorResponse(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // SECURITY: Get authenticated user's organization
    const user = await requireAuth();

    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;
    const classId = searchParams.get("classId");

    if (!classId) {
      return NextResponse.json({ error: "Class ID required" }, { status: 400 });
    }

    // SECURITY: Soft delete only if class belongs to user's organization
    const { error } = await supabase
      .from("class_sessions")
      .update({ is_active: false })
      .eq("id", classId)
      .eq("organization_id", user.organizationId); // SECURITY: Ensure organization ownership

    if (error) {
      console.error("Error deleting class:", error);
      return NextResponse.json(
        { error: "Failed to delete class" },
        { status: 500 },
      );
    }

    return NextResponse.json({ message: "Class deleted successfully" });
  } catch (error) {
    console.error("Error in DELETE /api/booking/classes:", error);
    return createErrorResponse(error);
  }
}
