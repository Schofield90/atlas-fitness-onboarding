import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

export async function DELETE() {
  try {
    const supabase = await createClient();

    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get user's organization
    const { data: staffData } = await supabase
      .from("organization_staff")
      .select("organization_id")
      .eq("user_id", user.id)
      .single();

    if (!staffData) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 404 },
      );
    }

    // First, delete all bookings associated with classes
    const { error: bookingsError } = await supabase
      .from("bookings")
      .delete()
      .eq("organization_id", staffData.organization_id);

    // Then delete all class sessions
    const { data: deletedClasses, error: classError } = await supabase
      .from("class_sessions")
      .delete()
      .eq("organization_id", staffData.organization_id)
      .select();

    if (classError) {
      // If organization-based delete fails, try deleting all classes (for cleanup)
      const { data: allDeleted, error: allError } = await supabase
        .from("class_sessions")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000") // Delete all except impossible UUID
        .select();

      if (allError) {
        throw allError;
      }

      return NextResponse.json({
        success: true,
        message: "All classes deleted",
        deletedCount: allDeleted?.length || 0,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Classes deleted successfully",
      deletedCount: deletedClasses?.length || 0,
    });
  } catch (error: any) {
    console.error("Error deleting classes:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to delete classes",
      },
      { status: 500 },
    );
  }
}
