import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

export async function DELETE() {
  try {
    const supabase = await createClient();

    // Get the current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's organization
    const { data: orgData, error: orgError } = await supabase
      .from("organizations")
      .select("id")
      .eq("owner_id", user.id)
      .single();

    if (orgError || !orgData) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 },
      );
    }

    const organizationId = orgData.id;

    // First, get a list of test sessions before deletion
    const { data: beforeSessions } = await supabase
      .from("class_sessions")
      .select("id, name, start_time")
      .eq("organization_id", organizationId).or(`
        name.ilike.%test%,
        name.ilike.%sample%,
        name.ilike.%demo%,
        name.eq.Morning Yoga,
        name.eq.HIIT Training,
        name.eq.Strength Training,
        name.eq.Evening Pilates,
        name.eq.Spin Class,
        name.eq.CrossFit,
        name.eq.Boxing,
        name.eq.Zumba,
        description.ilike.%instructor: john%,
        description.ilike.%instructor: sarah%,
        description.ilike.%instructor: mike%,
        description.ilike.%instructor: emma%,
        description.ilike.%instructor: alex%,
        description.ilike.%instructor: lisa%
      `);

    console.log(`Found ${beforeSessions?.length || 0} test sessions to delete`);

    // Delete test sessions
    const { data: deletedSessions, error: deleteError } = await supabase
      .from("class_sessions")
      .delete()
      .eq("organization_id", organizationId)
      .or(
        `
        name.ilike.%test%,
        name.ilike.%sample%,
        name.ilike.%demo%,
        name.eq.Morning Yoga,
        name.eq.HIIT Training,
        name.eq.Strength Training,
        name.eq.Evening Pilates,
        name.eq.Spin Class,
        name.eq.CrossFit,
        name.eq.Boxing,
        name.eq.Zumba,
        description.ilike.%instructor: john%,
        description.ilike.%instructor: sarah%,
        description.ilike.%instructor: mike%,
        description.ilike.%instructor: emma%,
        description.ilike.%instructor: alex%,
        description.ilike.%instructor: lisa%
      `,
      )
      .select();

    if (deleteError) {
      console.error("Error deleting test sessions:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete test sessions", details: deleteError },
        { status: 500 },
      );
    }

    // Get remaining sessions count
    const { count: remainingCount } = await supabase
      .from("class_sessions")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId);

    return NextResponse.json({
      success: true,
      deleted: deletedSessions?.length || 0,
      deletedSessions: deletedSessions || [],
      remaining: remainingCount || 0,
      message: `Successfully deleted ${deletedSessions?.length || 0} test sessions. ${remainingCount || 0} sessions remaining.`,
    });
  } catch (error) {
    console.error("Error in cleanup:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
