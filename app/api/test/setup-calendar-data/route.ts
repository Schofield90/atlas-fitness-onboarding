import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// This route is ONLY for E2E testing
export async function POST(request: NextRequest) {
  // Security check - only allow in test environment
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ALLOW_TEST_LOGIN !== "true"
  ) {
    return NextResponse.json(
      { error: "Test setup not allowed in production" },
      { status: 403 },
    );
  }

  try {
    const body = await request.json();
    const { organizationId, sessionsCount = 3 } = body;

    if (!organizationId) {
      return NextResponse.json(
        { error: "Missing organizationId" },
        { status: 400 },
      );
    }

    // Create admin client with service role key for test purposes
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    console.log(
      `Setting up ${sessionsCount} test sessions for org: ${organizationId}`,
    );

    // First, clear any existing test data
    await supabaseAdmin
      .from("class_sessions")
      .delete()
      .eq("organization_id", organizationId);

    await supabaseAdmin
      .from("programs")
      .delete()
      .eq("organization_id", organizationId);

    // Create a test program
    const { data: program, error: programError } = await supabaseAdmin
      .from("programs")
      .insert({
        organization_id: organizationId,
        name: "Test HIIT Program",
        description: "Test program for E2E testing",
        type: "hiit",
        duration_minutes: 45,
        max_capacity: 20,
        is_active: true,
      })
      .select()
      .single();

    if (programError || !program) {
      console.error("Failed to create test program:", programError);
      return NextResponse.json(
        {
          error: "Failed to create test program",
          details: programError?.message,
        },
        { status: 500 },
      );
    }

    // Create test class sessions
    const sessions = [];
    const now = new Date();

    for (let i = 0; i < sessionsCount; i++) {
      const sessionDate = new Date(now);
      sessionDate.setDate(now.getDate() + i); // Spread over next few days
      sessionDate.setHours(10 + i * 2, 0, 0, 0); // Different times

      const endTime = new Date(sessionDate);
      endTime.setMinutes(sessionDate.getMinutes() + 45);

      sessions.push({
        organization_id: organizationId,
        program_id: program.id,
        name: `Test Session ${i + 1}`,
        description: `Test class session ${i + 1} for E2E testing`,
        start_time: sessionDate.toISOString(),
        end_time: endTime.toISOString(),
        max_capacity: 20,
        current_bookings: 0,
        instructor_name: "Test Instructor",
        location: "Studio A",
        price: 20.0,
        status: "active",
      });
    }

    const { data: createdSessions, error: sessionsError } = await supabaseAdmin
      .from("class_sessions")
      .insert(sessions)
      .select();

    if (sessionsError) {
      console.error("Failed to create test sessions:", sessionsError);
      return NextResponse.json(
        {
          error: "Failed to create test sessions",
          details: sessionsError.message,
        },
        { status: 500 },
      );
    }

    console.log(
      `Successfully created ${createdSessions?.length || 0} test sessions`,
    );

    return NextResponse.json({
      success: true,
      data: {
        organizationId,
        programId: program.id,
        sessionsCreated: createdSessions?.length || 0,
        sessions: createdSessions,
      },
    });
  } catch (error) {
    console.error("Test setup error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
