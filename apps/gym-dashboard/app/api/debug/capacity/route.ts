import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // For debug purposes, bypass auth by using service role
    const {
      createClient: createServiceClient,
    } = require("@supabase/supabase-js");
    const debugSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Check programs table
    const { data: programs, error: programsError } = await debugSupabase
      .from("programs")
      .select("id, name, max_participants, default_capacity")
      .eq("organization_id", "63589490-8f55-4157-bd3a-e141594b748e")
      .limit(5);

    // Check class_sessions table
    const { data: sessions, error: sessionsError } = await debugSupabase
      .from("class_sessions")
      .select(
        `
        id,
        start_time,
        max_capacity,
        capacity,
        program:programs(name, max_participants, default_capacity)
      `,
      )
      .eq("organization_id", "63589490-8f55-4157-bd3a-e141594b748e")
      .gte("start_time", new Date().toISOString())
      .limit(10)
      .order("start_time");

    return NextResponse.json({
      programs: programs || [],
      programsError: programsError?.message,
      sessions: sessions || [],
      sessionsError: sessionsError?.message,
      note: "Check the values of max_participants, default_capacity, max_capacity, and capacity fields",
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
