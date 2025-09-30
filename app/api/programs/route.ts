import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
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
  const supabase = await createClient();

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

  // Otherwise fetch all programs for this organization
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
  const supabase = await createClient();
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

export const GET = withApiErrorBoundary(getPrograms);
export const POST = withApiErrorBoundary(createProgram);
