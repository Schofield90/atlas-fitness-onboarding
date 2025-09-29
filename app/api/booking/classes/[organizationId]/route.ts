import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { addDays, startOfDay, endOfDay } from "date-fns";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ organizationId: string }> },
) {
  const params = await context.params;
  const supabase = await createClient();

  try {
    // Get date range from query params or default to next 30 days
    const url = new URL(request.url);
    const startDate = url.searchParams.get("start") || new Date().toISOString();
    const endDate =
      url.searchParams.get("end") || addDays(new Date(), 30).toISOString();

    // Fetch class sessions for the organization
    const { data: sessions, error } = await supabase
      .from("class_sessions")
      .select(
        `
        id,
        name,
        description,
        start_time,
        end_time,
        max_capacity,
        current_bookings,
        location,
        program_id,
        programs (
          id,
          name,
          description,
          duration_minutes
        )
      `,
      )
      .eq("organization_id", params.organizationId)
      .gte("start_time", startDate)
      .lte("start_time", endDate)
      .order("start_time", { ascending: true });

    if (error) {
      console.error("Error fetching class sessions:", error);
      return NextResponse.json(
        { error: "Failed to fetch class sessions" },
        { status: 500 },
      );
    }

    // Transform data for the client
    const transformedSessions =
      sessions?.map((session) => ({
        id: session.id,
        program_name: session.programs?.name || session.name || "Class",
        program_description:
          session.programs?.description || session.description,
        start_time: session.start_time,
        end_time: session.end_time,
        spaces_available:
          (session.max_capacity || 0) - (session.current_bookings || 0),
        max_capacity: session.max_capacity || 0,
        current_bookings: session.current_bookings || 0,
        location: session.location || "Main Studio",
      })) || [];

    return NextResponse.json(transformedSessions);
  } catch (error) {
    console.error("Unexpected error fetching classes:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
