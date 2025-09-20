import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const now = new Date();

    // Get all organizations to check
    const { data: orgs } = await supabase
      .from("organizations")
      .select("id, name");

    // Get upcoming classes for each org
    const results: any = {};

    for (const org of orgs || []) {
      const { data: classes, error } = await supabase
        .from("class_sessions")
        .select(
          `
          *,
          program:programs(name),
          bookings(id)
        `,
        )
        .eq("organization_id", org.id)
        .gte("start_time", now.toISOString())
        .order("start_time", { ascending: true })
        .limit(5);

      results[org.name] = {
        orgId: org.id,
        classCount: classes?.length || 0,
        classes: classes?.map((c) => ({
          id: c.id,
          programName: c.program?.name || "Unknown",
          startTime: c.start_time,
          instructor: c.instructor_name,
          location: c.location,
          capacity: c.capacity,
          bookingsCount: c.bookings?.length || 0,
        })),
        error: error?.message,
      };
    }

    // Also check the specific Atlas org
    const atlasOrgId = "63589490-8f55-4157-bd3a-e141594b748e";
    const { data: atlasClasses, error: atlasError } = await supabase
      .from("class_sessions")
      .select(
        `
        *,
        program:programs(name),
        bookings(id)
      `,
      )
      .eq("organization_id", atlasOrgId)
      .gte("start_time", now.toISOString())
      .order("start_time", { ascending: true })
      .limit(10);

    return NextResponse.json({
      currentTime: now.toISOString(),
      organizationResults: results,
      atlasOrgSpecific: {
        orgId: atlasOrgId,
        totalUpcoming: atlasClasses?.length || 0,
        classes: atlasClasses,
        error: atlasError?.message,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
