import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { requireAuth } from "@/app/lib/api/auth-check";
import {
  handleApiError,
  ValidationError,
  DatabaseError,
  withApiErrorBoundary,
} from "@/app/lib/errors";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

async function getClassSessions(request: NextRequest) {
  const userWithOrg = await requireAuth();
  const supabase = await createClient();

  // Fetch class sessions for the user's organization
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
    .eq("organization_id", userWithOrg.organizationId)
    .order("start_time", { ascending: true });

  if (error) {
    console.error("Error fetching class sessions:", error);
    throw DatabaseError.queryError("class_sessions", "select", {
      organizationId: userWithOrg.organizationId,
      originalError: error.message,
      code: error.code,
    });
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
}

export const GET = withApiErrorBoundary(getClassSessions);

// Create a new class session
async function createClassSession(request: NextRequest) {
  const userWithOrg = await requireAuth();
  const supabase = await createClient();
  const body = await request.json();

  // Validate required fields
  if (!body.name) {
    throw ValidationError.required("name");
  }
  if (!body.start_time) {
    throw ValidationError.required("start_time");
  }
  if (!body.end_time) {
    throw ValidationError.required("end_time");
  }

  // Create the class session with user's organization_id
  const { data: newSession, error } = await supabase
    .from("class_sessions")
    .insert({
      name: body.name,
      start_time: body.start_time,
      end_time: body.end_time,
      organization_id: userWithOrg.organizationId, // 🔴 SECURITY: Use authenticated user's org
      max_capacity: body.max_capacity || 20,
      current_bookings: 0,
      instructor: body.instructor || userWithOrg.email,
      description: body.description,
      location: body.location || "Main Studio",
      class_type: body.class_type,
      program_id: body.program_id,
      created_by: userWithOrg.id,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating class session:", error);
    throw DatabaseError.queryError("class_sessions", "insert", {
      organizationId: userWithOrg.organizationId,
      originalError: error.message,
      code: error.code,
    });
  }

  return NextResponse.json({
    success: true,
    session: newSession,
  });
}

export const POST = withApiErrorBoundary(createClassSession);

// Update a class session
async function updateClassSession(request: NextRequest) {
  const userWithOrg = await requireAuth();
  const supabase = await createClient();
  const body = await request.json();
  const { id, ...updateData } = body;

  if (!id) {
    throw ValidationError.required("id");
  }

  // Verify the class session belongs to the user's organization
  const { data: existingSession } = await supabase
    .from("class_sessions")
    .select("id")
    .eq("id", id)
    .eq("organization_id", userWithOrg.organizationId)
    .single();

  if (!existingSession) {
    throw ValidationError.notFound("Class session");
  }

  // Update the class session (ensuring organization_id cannot be changed)
  const { organization_id: _, ...safeUpdateData } = updateData;

  const { data: updatedSession, error } = await supabase
    .from("class_sessions")
    .update(safeUpdateData)
    .eq("id", id)
    .eq("organization_id", userWithOrg.organizationId) // 🔴 SECURITY: Ensure org ownership
    .select()
    .single();

  if (error) {
    console.error("Error updating class session:", error);
    throw DatabaseError.queryError("class_sessions", "update", {
      organizationId: userWithOrg.organizationId,
      originalError: error.message,
      code: error.code,
    });
  }

  return NextResponse.json({
    success: true,
    session: updatedSession,
  });
}

export const PUT = withApiErrorBoundary(updateClassSession);

// Delete a class session
async function deleteClassSession(request: NextRequest) {
  const userWithOrg = await requireAuth();
  const supabase = await createClient();
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get("id");

  if (!id) {
    throw ValidationError.required("id");
  }

  // Verify the class session belongs to the user's organization
  const { data: existingSession } = await supabase
    .from("class_sessions")
    .select("id")
    .eq("id", id)
    .eq("organization_id", userWithOrg.organizationId)
    .single();

  if (!existingSession) {
    throw ValidationError.notFound("Class session");
  }

  // Delete the class session
  const { error } = await supabase
    .from("class_sessions")
    .delete()
    .eq("id", id)
    .eq("organization_id", userWithOrg.organizationId); // 🔴 SECURITY: Ensure org ownership

  if (error) {
    console.error("Error deleting class session:", error);
    throw DatabaseError.queryError("class_sessions", "delete", {
      organizationId: userWithOrg.organizationId,
      originalError: error.message,
      code: error.code,
    });
  }

  return NextResponse.json({
    success: true,
    message: "Class session deleted successfully",
  });
}

export const DELETE = withApiErrorBoundary(deleteClassSession);
