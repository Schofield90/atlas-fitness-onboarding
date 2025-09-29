import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { listCalendars } from "@/app/lib/google/calendar";
import { requireAuth, createOrgScopedClient } from "@/lib/auth-middleware";

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    // Create organization-scoped Supabase client
    const supabase = createOrgScopedClient(auth.organizationId);

    // Get stored tokens for the organization
    const { data: tokenData, error: tokenError } = await supabase
      .from("google_calendar_tokens")
      .select("*")
      .eq("organization_id", auth.organizationId)
      .single();

    if (tokenError) {
      console.error("Error fetching Google Calendar tokens:", tokenError);
      return NextResponse.json(
        { error: "Calendar tokens not found" },
        { status: 404 },
      );
    }

    if (!tokenData) {
      return NextResponse.json(
        { error: "Google Calendar not connected" },
        { status: 401 },
      );
    }

    // List calendars using the token
    const calendars = await listCalendars(tokenData);

    return NextResponse.json({
      success: true,
      calendars: calendars || [],
    });
  } catch (error) {
    console.error("Error listing calendars:", error);
    return NextResponse.json(
      {
        error: "Failed to list calendars",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
