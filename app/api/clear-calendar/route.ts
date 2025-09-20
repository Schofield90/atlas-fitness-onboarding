import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 },
      );
    }

    // Get user's organization from user_organizations table
    const { data: userOrg, error: userOrgError } = await supabase
      .from("user_organizations")
      .select("organization_id")
      .eq("user_id", user.id)
      .single();

    if (userOrgError || !userOrg?.organization_id) {
      // Use default test organization as fallback
      const defaultOrgId = "63589490-8f55-4157-bd3a-e141594b748e";
      console.log("Using default test organization:", defaultOrgId);
      var organizationId = defaultOrgId;
    } else {
      var organizationId = userOrg.organization_id;
    }
    console.log("Clearing calendar for organization:", organizationId);

    // First, get all class session IDs for this organization
    const { data: sessionIds, error: sessionIdsError } = await supabase
      .from("class_sessions")
      .select("id")
      .eq("organization_id", organizationId);

    if (sessionIdsError) {
      console.error("Error fetching session IDs:", sessionIdsError);
    } else {
      console.log("Found sessions to delete:", sessionIds?.length || 0);
    }

    // Delete all bookings for class sessions in this organization
    let bookingsDeleted = 0;
    if (sessionIds && sessionIds.length > 0) {
      const sessionIdList = sessionIds.map((s) => s.id);
      const { error: bookingsError, count: bookingsCount } = await supabase
        .from("bookings")
        .delete({ count: "exact" })
        .in("class_session_id", sessionIdList);

      if (bookingsError) {
        console.error("Error deleting bookings:", bookingsError);
      } else {
        bookingsDeleted = bookingsCount || 0;
        console.log("Deleted bookings:", bookingsDeleted);
      }
    }

    // Delete all class sessions for this organization
    const { error: sessionsError, count: sessionsDeleted } = await supabase
      .from("class_sessions")
      .delete({ count: "exact" })
      .eq("organization_id", organizationId);

    if (sessionsError) {
      console.error("Error deleting class sessions:", sessionsError);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to delete class sessions: " + sessionsError.message,
        },
        { status: 500 },
      );
    }

    console.log("Deleted class sessions:", sessionsDeleted);

    // Delete all programs for this organization
    const { error: programsError, count: programsDeleted } = await supabase
      .from("programs")
      .delete({ count: "exact" })
      .eq("organization_id", organizationId);

    if (programsError) {
      console.error("Error deleting programs:", programsError);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to delete programs: " + programsError.message,
        },
        { status: 500 },
      );
    }

    console.log("Deleted programs:", programsDeleted);

    const result = {
      success: true,
      data: {
        sessionsDeleted: sessionsDeleted || 0,
        programsDeleted: programsDeleted || 0,
        bookingsDeleted: bookingsDeleted,
        message: "Calendar cleared successfully",
      },
    };

    console.log("Clear calendar result:", result);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error clearing calendar:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error: " + (error as Error).message,
      },
      { status: 500 },
    );
  }
}
