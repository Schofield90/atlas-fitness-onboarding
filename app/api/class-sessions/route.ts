import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const searchParams = request.nextUrl.searchParams;
    const organizationId = searchParams.get("organizationId");

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 },
      );
    }

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch class sessions for the organization
    const { data: sessions, error } = await supabase
      .from("class_sessions")
      .select(
        `
        *,
        programs (
          name,
          description,
          color
        )
      `,
      )
      .eq("organization_id", organizationId)
      .order("start_time", { ascending: true });

    if (error) {
      console.error("Error fetching class sessions:", error);
      return NextResponse.json(
        { error: "Failed to fetch class sessions", details: error.message },
        { status: 500 },
      );
    }

    // Transform the data to match what the frontend expects
    const transformedSessions = (sessions || []).map((session) => ({
      ...session,
      id: session.id,
      name: session.name || session.programs?.name || "Class",
      instructor: session.instructor || "TBD",
      startTime: session.start_time,
      endTime: session.end_time,
      capacity: session.max_capacity || 20,
      enrolled: session.current_bookings || 0,
      type: session.class_type || session.programs?.name || "General",
      description: session.description || session.programs?.description,
      location: session.location || "Main Studio",
      color: session.programs?.color || "#3B82F6",
    }));

    return NextResponse.json({
      success: true,
      sessions: transformedSessions,
      total: transformedSessions.length,
    });
  } catch (error) {
    console.error("Error in class-sessions API:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// Create a new class session
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const body = await request.json();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validate required fields
    const { name, start_time, end_time, organization_id, max_capacity } = body;

    if (!name || !start_time || !end_time || !organization_id) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Create the class session
    const { data: newSession, error } = await supabase
      .from("class_sessions")
      .insert({
        name,
        start_time,
        end_time,
        organization_id,
        max_capacity: max_capacity || 20,
        current_bookings: 0,
        instructor: body.instructor || user.email,
        description: body.description,
        location: body.location || "Main Studio",
        class_type: body.class_type,
        program_id: body.program_id,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating class session:", error);
      return NextResponse.json(
        { error: "Failed to create class session", details: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      session: newSession,
    });
  } catch (error) {
    console.error("Error in POST class-sessions:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// Update a class session
export async function PUT(request: NextRequest) {
  try {
    const supabase = createClient();
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 },
      );
    }

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Update the class session
    const { data: updatedSession, error } = await supabase
      .from("class_sessions")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating class session:", error);
      return NextResponse.json(
        { error: "Failed to update class session", details: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      session: updatedSession,
    });
  } catch (error) {
    console.error("Error in PUT class-sessions:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// Delete a class session
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createClient();
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 },
      );
    }

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Delete the class session
    const { error } = await supabase
      .from("class_sessions")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting class session:", error);
      return NextResponse.json(
        { error: "Failed to delete class session", details: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Class session deleted successfully",
    });
  } catch (error) {
    console.error("Error in DELETE class-sessions:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
