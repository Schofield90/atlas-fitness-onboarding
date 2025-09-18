import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

interface RecurringClassRequest {
  classSessionId?: string; // Optional - for cloning existing session
  programId?: string; // For creating new sessions for a program
  frequency?: "daily" | "weekly" | "monthly";
  interval?: number;
  daysOfWeek?: number[]; // 0=Sunday, 6=Saturday
  endDate?: string;
  maxOccurrences?: number;
  recurrenceRule?: string; // RRULE string from the modal
  timeSlots?: Array<{ time: string; duration: number }>; // Time slots from the modal
}

// Simple recurrence generator without external dependencies
function generateRecurrences(
  startDate: Date,
  frequency: "daily" | "weekly" | "monthly",
  interval: number,
  endDate: Date,
  maxOccurrences: number,
  daysOfWeek?: number[],
): Date[] {
  const occurrences: Date[] = [];
  let currentDate = new Date(startDate);
  let count = 0;

  while (currentDate <= endDate && count < maxOccurrences) {
    if (frequency === "daily") {
      occurrences.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + interval);
      count++;
    } else if (frequency === "weekly") {
      if (daysOfWeek && daysOfWeek.length > 0) {
        // Generate for specific days of week
        for (let i = 0; i < 7 * interval; i++) {
          if (daysOfWeek.includes(currentDate.getDay())) {
            occurrences.push(new Date(currentDate));
            count++;
            if (count >= maxOccurrences) break;
          }
          currentDate.setDate(currentDate.getDate() + 1);
          if (currentDate > endDate) break;
        }
      } else {
        // Simple weekly recurrence
        occurrences.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 7 * interval);
        count++;
      }
    } else if (frequency === "monthly") {
      occurrences.push(new Date(currentDate));
      currentDate.setMonth(currentDate.getMonth() + interval);
      count++;
    }
  }

  return occurrences;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createAdminClient();
    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get("sessionId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Get recurring sessions - sessions with parent_session_id are recurring
    let query = supabase
      .from("class_sessions")
      .select("*")
      .not("parent_session_id", "is", null);

    if (sessionId) {
      query = query.eq("parent_session_id", sessionId);
    }

    if (startDate && endDate) {
      query = query.gte("start_time", startDate).lte("start_time", endDate);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ sessions: data });
  } catch (error: any) {
    console.error("Error fetching recurring classes:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createAdminClient();
    const body: RecurringClassRequest = await request.json();

    const {
      classSessionId,
      programId,
      frequency = "weekly",
      interval = 1,
      daysOfWeek,
      endDate,
      maxOccurrences = 52,
      recurrenceRule,
      timeSlots = [],
    } = body;

    let originalSession: any = null;
    let organizationId: string;
    let programData: any = null;

    // If we have a classSessionId, get the original session to clone
    if (classSessionId) {
      const { data: session, error: sessionError } = await supabase
        .from("class_sessions")
        .select("*")
        .eq("id", classSessionId)
        .single();

      if (sessionError || !session) {
        return NextResponse.json(
          { error: "Session not found" },
          { status: 404 },
        );
      }
      originalSession = session;
      organizationId = session.organization_id;
    } else if (programId) {
      // Creating new sessions for a program without cloning
      const { data: program, error: programError } = await supabase
        .from("programs")
        .select("*")
        .eq("id", programId)
        .single();

      if (programError || !program) {
        return NextResponse.json(
          { error: "Program not found" },
          { status: 404 },
        );
      }
      organizationId = program.organization_id;
      programData = program;
    } else {
      return NextResponse.json(
        { error: "Either classSessionId or programId is required" },
        { status: 400 },
      );
    }

    // Generate occurrences
    const startDate = originalSession
      ? new Date(originalSession.start_time)
      : new Date();
    const endDateTime = endDate
      ? new Date(endDate)
      : new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year default

    // Parse RRULE if provided (from the modal)
    let actualFrequency = frequency;
    let actualDaysOfWeek = daysOfWeek;

    if (recurrenceRule && recurrenceRule.startsWith("FREQ=")) {
      const parts = recurrenceRule.split(";");
      parts.forEach((part) => {
        if (part.startsWith("FREQ=")) {
          actualFrequency = part.replace("FREQ=", "").toLowerCase() as any;
        } else if (part.startsWith("BYDAY=")) {
          const days = part.replace("BYDAY=", "").split(",");
          const dayMap: { [key: string]: number } = {
            SU: 0,
            MO: 1,
            TU: 2,
            WE: 3,
            TH: 4,
            FR: 5,
            SA: 6,
          };
          actualDaysOfWeek = days
            .map((d) => dayMap[d])
            .filter((d) => d !== undefined);
        }
      });
    }

    const occurrences = generateRecurrences(
      startDate,
      actualFrequency,
      interval,
      endDateTime,
      maxOccurrences,
      actualDaysOfWeek,
    );

    // Calculate duration
    const duration = originalSession
      ? new Date(originalSession.end_time).getTime() -
        new Date(originalSession.start_time).getTime()
      : 60 * 60 * 1000; // Default 1 hour

    // Create sessions array
    let sessions: any[] = [];

    if (originalSession) {
      // Clone existing session for each occurrence (skip first as it's the original)
      sessions = occurrences.slice(1).map((date) => ({
        ...originalSession,
        id: undefined, // Let DB generate new ID
        parent_session_id: classSessionId,
        start_time: date.toISOString(),
        end_time: new Date(date.getTime() + duration).toISOString(),
        occurrence_date: date.toISOString().split("T")[0],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
    } else if (programId && timeSlots.length > 0) {
      // Create new sessions from time slots
      sessions = [];
      occurrences.forEach((date) => {
        timeSlots.forEach((slot) => {
          const [hours, minutes] = slot.time.split(":").map(Number);
          const sessionStart = new Date(date);
          sessionStart.setHours(hours, minutes, 0, 0);
          const sessionEnd = new Date(
            sessionStart.getTime() + slot.duration * 60 * 1000,
          );

          sessions.push({
            program_id: programId,
            organization_id: organizationId,
            name: programData?.name || "Class Session",
            start_time: sessionStart.toISOString(),
            end_time: sessionEnd.toISOString(),
            occurrence_date: sessionStart.toISOString().split("T")[0],
            status: "scheduled",
            current_bookings: 0,
            max_capacity:
              programData?.max_participants ||
              programData?.default_capacity ||
              20,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        });
      });
    }

    if (sessions.length === 0) {
      return NextResponse.json(
        {
          error:
            "No sessions to create. Please check your recurrence settings and time slots.",
        },
        { status: 400 },
      );
    }

    // Insert all sessions
    const { data: createdSessions, error: insertError } = await supabase
      .from("class_sessions")
      .insert(sessions)
      .select();

    if (insertError) throw insertError;

    // Update original session if we cloned from one
    if (classSessionId) {
      await supabase
        .from("class_sessions")
        .update({
          recurrence_rule:
            recurrenceRule ||
            `${actualFrequency.toUpperCase()};INTERVAL=${interval}`,
          recurrence_end_date: endDateTime.toISOString(),
        })
        .eq("id", classSessionId);
    }

    return NextResponse.json({
      message: "Recurring classes created successfully",
      instances: createdSessions?.length || 0,
      sessions: createdSessions,
    });
  } catch (error: any) {
    console.error("Error creating recurring classes:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createAdminClient();
    const { sessionId, updates, updateSeries } = await request.json();

    if (updateSeries) {
      // Update all sessions in the series
      const { error } = await supabase
        .from("class_sessions")
        .update(updates)
        .or(`id.eq.${sessionId},parent_session_id.eq.${sessionId}`);

      if (error) throw error;

      return NextResponse.json({ message: "Series updated successfully" });
    } else {
      // Update single occurrence
      const { error } = await supabase
        .from("class_sessions")
        .update(updates)
        .eq("id", sessionId);

      if (error) throw error;

      return NextResponse.json({ message: "Session updated successfully" });
    }
  } catch (error: any) {
    console.error("Error updating recurring class:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createAdminClient();
    const { sessionId, deleteSeries } = await request.json();

    if (deleteSeries) {
      // Delete all sessions in the series
      const { error } = await supabase
        .from("class_sessions")
        .delete()
        .or(`id.eq.${sessionId},parent_session_id.eq.${sessionId}`);

      if (error) throw error;

      return NextResponse.json({ message: "Series deleted successfully" });
    } else {
      // Delete single occurrence
      const { error } = await supabase
        .from("class_sessions")
        .delete()
        .eq("id", sessionId);

      if (error) throw error;

      return NextResponse.json({ message: "Session deleted successfully" });
    }
  } catch (error: any) {
    console.error("Error deleting recurring class:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
