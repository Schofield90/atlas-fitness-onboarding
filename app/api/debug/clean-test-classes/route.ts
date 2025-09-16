import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { getCurrentUserOrganization } from "@/app/lib/organization-server";

export async function DELETE() {
  try {
    const supabase = createClient();
    const { organizationId, error: orgError } =
      await getCurrentUserOrganization();

    if (orgError || !organizationId) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 },
      );
    }

    // Find the "Group Pt" program with many sessions
    const { data: programs, error: fetchError } = await supabase
      .from("programs")
      .select("id, name")
      .eq("organization_id", organizationId)
      .eq("name", "Group Pt");

    if (fetchError) {
      return NextResponse.json(
        { error: "Failed to fetch programs", details: fetchError },
        { status: 500 },
      );
    }

    if (!programs || programs.length === 0) {
      return NextResponse.json({
        message: 'No "Group Pt" program found to clean up',
      });
    }

    // Delete all sessions for "Group Pt" programs
    const deletionResults = [];
    for (const program of programs) {
      const { error: deleteError, count } = await supabase
        .from("class_sessions")
        .delete()
        .eq("program_id", program.id)
        .select("*", { count: "exact", head: true });

      if (deleteError) {
        deletionResults.push({
          programId: program.id,
          programName: program.name,
          status: "error",
          error: deleteError.message,
        });
      } else {
        deletionResults.push({
          programId: program.id,
          programName: program.name,
          status: "success",
          sessionsDeleted: count || 0,
        });
      }

      // Also delete the program itself
      const { error: programDeleteError } = await supabase
        .from("programs")
        .delete()
        .eq("id", program.id);

      if (programDeleteError) {
        console.error("Failed to delete program:", programDeleteError);
      }
    }

    const totalDeleted = deletionResults
      .filter((r) => r.status === "success")
      .reduce((sum, r) => sum + (r.sessionsDeleted || 0), 0);

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${totalDeleted} test class sessions`,
      results: deletionResults,
    });
  } catch (error) {
    console.error("Error cleaning test classes:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const supabase = createClient();
    const { organizationId, error: orgError } =
      await getCurrentUserOrganization();

    if (orgError || !organizationId) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 },
      );
    }

    // Get session counts per program
    const { data: programs, error } = await supabase
      .from("programs")
      .select(
        `
        id,
        name,
        class_sessions (
          id
        )
      `,
      )
      .eq("organization_id", organizationId);

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch data", details: error },
        { status: 500 },
      );
    }

    const programStats = programs
      ?.map((p) => ({
        id: p.id,
        name: p.name,
        sessionCount: p.class_sessions?.length || 0,
      }))
      .sort((a, b) => b.sessionCount - a.sessionCount);

    return NextResponse.json({
      programs: programStats,
      totalPrograms: programs?.length || 0,
      totalSessions:
        programStats?.reduce((sum, p) => sum + p.sessionCount, 0) || 0,
    });
  } catch (error) {
    console.error("Error fetching class stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
