import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } },
) {
  try {
    const supabase = createClient();

    // Normalize slug
    const normalizedSlug = params.slug.replace(/\//g, "-");

    // Fetch calendar
    const { data: calendar, error } = await supabase
      .from("calendars")
      .select("*")
      .eq("slug", normalizedSlug)
      .single();

    if (error || !calendar) {
      return NextResponse.json(
        { error: "Calendar not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(calendar);
  } catch (error) {
    console.error("Error fetching calendar:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
