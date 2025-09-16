import { NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { createClient } from "@/app/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Get user for organization
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get user's organization
    const { data: userOrg } = await supabase
      .from("user_organizations")
      .select("organization_id")
      .eq("user_id", user.id)
      .single();

    if (!userOrg) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 404 },
      );
    }

    // Use admin client to bypass RLS
    const adminSupabase = createAdminClient();

    // First ensure we have a program
    let programId = body.program_id;
    if (!programId) {
      const { data: program, error: programError } = await adminSupabase
        .from("programs")
        .insert({
          organization_id: userOrg.organization_id,
          name: body.name || "General Class",
          description: body.description || "General fitness class",
          price_pennies: (body.price || 10) * 100,
          is_active: true,
        })
        .select()
        .single();

      if (programError) {
        return NextResponse.json(
          {
            error: "Failed to create program",
            details: programError,
          },
          { status: 500 },
        );
      }

      programId = program.id;
    }

    // Create the class session
    const { data: classSession, error } = await adminSupabase
      .from("class_sessions")
      .insert({
        organization_id: userOrg.organization_id,
        program_id: programId,
        name: body.name,
        instructor_name: body.instructor_name || "TBD",
        start_time: body.start_time || new Date().toISOString(),
        duration_minutes: body.duration_minutes || 60,
        capacity: body.capacity || 20,
        location: body.location || "Main Studio",
        description: body.description,
        recurring: body.recurring || false,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        {
          error: "Failed to create class",
          details: error,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      class: classSession,
      message: "Class created successfully (bypassed RLS)",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Server error",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
