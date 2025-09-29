import { NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId =
      searchParams.get("sessionId") || "06923cb5-fc5d-4482-8a23-d1866012e079";

    const supabase = await createAdminClient();

    // Method 1: Direct count
    const { count: directCount, error: countError } = await supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("class_session_id", sessionId);

    // Method 2: Fetch all bookings
    const { data: bookings, error: bookingsError } = await supabase
      .from("bookings")
      .select("*")
      .eq("class_session_id", sessionId);

    // Method 3: Through class_sessions relation
    const { data: session, error: sessionError } = await supabase
      .from("class_sessions")
      .select(
        `
        id,
        start_time,
        capacity,
        bookings(*)
      `,
      )
      .eq("id", sessionId)
      .single();

    return NextResponse.json({
      sessionId,
      counts: {
        directCount,
        bookingsArrayLength: bookings?.length || 0,
        throughRelation: session?.bookings?.length || 0,
      },
      session: session
        ? {
            id: session.id,
            capacity: session.capacity,
            bookingsCount: session.bookings?.length || 0,
            bookings: session.bookings,
          }
        : null,
      allBookings: bookings,
      errors: {
        countError,
        bookingsError,
        sessionError,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
