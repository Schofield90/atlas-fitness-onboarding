import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { requireAuth } from "@/app/lib/api/auth-check";
import {
  handleApiError,
  ValidationError,
  DatabaseError,
  withApiErrorBoundary,
} from "@/app/lib/errors";

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

async function getPrograms(request: NextRequest) {
  const userWithOrg = await requireAuth();
  const supabase = createAdminClient(); // Use admin client to bypass RLS

  console.log("[Programs API] User organization:", userWithOrg.organizationId);

  const { searchParams } = new URL(request.url);
  const programId = searchParams.get("id");

  // If ID provided, fetch single program
  if (programId) {
    const { data, error } = await supabase
      .from("programs")
      .select("*")
      .eq("id", programId)
      .eq("organization_id", userWithOrg.organizationId)
      .single();

    if (error) {
      console.error("Error fetching program:", error);
      throw DatabaseError.queryError("programs", "select", {
        programId,
        organizationId: userWithOrg.organizationId,
        originalError: error.message,
        code: error.code,
      });
    }

    return NextResponse.json({ data });
  }

  // Otherwise fetch all programs/class types for this organization
  // First try class_types table (newer structure)
  const { data: classTypes, error: classTypesError } = await supabase
    .from("class_types")
    .select(`*`)
    .eq("organization_id", userWithOrg.organizationId)
    .order("created_at", { ascending: false });

  console.log("[Programs API] Class types query result:", {
    count: classTypes?.length || 0,
    error: classTypesError?.message,
    organizationId: userWithOrg.organizationId,
  });

  // If class_types has data, return it transformed to match programs structure
  if (classTypes && classTypes.length > 0) {
    const transformedData = classTypes.map((ct) => ({
      id: ct.id,
      organization_id: ct.organization_id,
      name: ct.name,
      description: ct.description,
      duration_minutes: ct.duration_minutes || 60,
      default_capacity: ct.default_capacity || 20,
      max_participants: ct.default_capacity || 20,
      is_active: true,
      price_pennies: 0,
      metadata: { color: ct.color, category: ct.category },
      created_at: ct.created_at,
      updated_at: ct.updated_at,
    }));
    return NextResponse.json({ data: transformedData });
  }

  // Fallback to programs table (legacy structure)
  const { data, error } = await supabase
    .from("programs")
    .select(`*`)
    .eq("organization_id", userWithOrg.organizationId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching programs:", error);
    throw DatabaseError.queryError("programs", "select", {
      organizationId: userWithOrg.organizationId,
      originalError: error.message,
      code: error.code,
    });
  }

  return NextResponse.json({ data });
}

async function createProgram(request: NextRequest) {
  const userWithOrg = await requireAuth();
  const supabase = createAdminClient(); // Use admin client to bypass RLS
  const body = await request.json();

  // Validate required fields
  if (!body.name) {
    throw ValidationError.required("name");
  }

  // Create the program
  const capacity =
    parseInt(body.max_participants || body.default_capacity) || 20;
  const { data: program, error } = await supabase
    .from("programs")
    .insert({
      organization_id: userWithOrg.organizationId,
      name: body.name,
      description: body.description || "",
      price_pennies: body.price_pennies || 0,
      is_active: body.is_active !== undefined ? body.is_active : true,
      max_participants: capacity,
      default_capacity: capacity,
      metadata: body.metadata || {},
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating program:", error);
    throw DatabaseError.queryError("programs", "insert", {
      organizationId: userWithOrg.organizationId,
      originalError: error.message,
      code: error.code,
    });
  }

  return NextResponse.json({
    success: true,
    program,
    message: "Program created successfully",
  });
}

async function deleteProgram(request: NextRequest) {
  const userWithOrg = await requireAuth();
  const supabaseAdmin = createAdminClient();

  const { searchParams } = new URL(request.url);
  const programId = searchParams.get("id");

  if (!programId) {
    throw ValidationError.required("id");
  }

  // Verify program belongs to user's organization before deleting
  const { data: program, error: fetchError } = await supabaseAdmin
    .from("programs")
    .select("id")
    .eq("id", programId)
    .eq("organization_id", userWithOrg.organizationId)
    .single();

  if (fetchError || !program) {
    throw new Error("Program not found or access denied");
  }

  // First delete all class sessions for this program (to avoid foreign key constraint errors)
  const { error: sessionsError } = await supabaseAdmin
    .from("class_sessions")
    .delete()
    .eq("program_id", programId);

  if (sessionsError) {
    console.error("Error deleting class sessions:", sessionsError);
    throw DatabaseError.queryError("class_sessions", "delete", {
      programId,
      originalError: sessionsError.message,
      code: sessionsError.code,
    });
  }

  // Then delete the program
  const { error: programError } = await supabaseAdmin
    .from("programs")
    .delete()
    .eq("id", programId);

  if (programError) {
    console.error("Error deleting program:", programError);
    throw DatabaseError.queryError("programs", "delete", {
      programId,
      originalError: programError.message,
      code: programError.code,
    });
  }

  return NextResponse.json({
    success: true,
    message: "Program and associated sessions deleted successfully",
  });
}

export const GET = withApiErrorBoundary(getPrograms);
export const POST = withApiErrorBoundary(createProgram);
export const DELETE = withApiErrorBoundary(deleteProgram);
