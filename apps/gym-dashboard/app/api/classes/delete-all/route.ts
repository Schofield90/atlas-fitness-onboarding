import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/app/lib/api/auth-check";
import { createAdminClient } from "@/app/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/classes/delete-all
 * Deletes ALL class data for testing purposes
 * WARNING: This is destructive and cannot be undone
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth();
    const organizationId = user.organizationId;

    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // 1. Delete all class_sessions
    const { error: sessionsError, count: sessionsCount } =
      await supabaseAdmin
        .from("class_sessions")
        .delete()
        .eq("organization_id", organizationId)
        .select("*", { count: "exact", head: true });

    if (sessionsError) {
      throw new Error(`Failed to delete sessions: ${sessionsError.message}`);
    }

    // 2. Delete all class_schedules
    const { error: schedulesError, count: schedulesCount } =
      await supabaseAdmin
        .from("class_schedules")
        .delete()
        .eq("organization_id", organizationId)
        .select("*", { count: "exact", head: true });

    if (schedulesError) {
      throw new Error(
        `Failed to delete schedules: ${schedulesError.message}`,
      );
    }

    // 3. Delete all programs (class types)
    const { error: programsError, count: programsCount } =
      await supabaseAdmin
        .from("programs")
        .delete()
        .eq("organization_id", organizationId)
        .select("*", { count: "exact", head: true });

    if (programsError) {
      throw new Error(`Failed to delete programs: ${programsError.message}`);
    }

    // 4. Delete all class_types
    const { error: classTypesError, count: classTypesCount } =
      await supabaseAdmin
        .from("class_types")
        .delete()
        .eq("organization_id", organizationId)
        .select("*", { count: "exact", head: true });

    if (classTypesError) {
      throw new Error(
        `Failed to delete class types: ${classTypesError.message}`,
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        sessionsDeleted: sessionsCount || 0,
        schedulesDeleted: schedulesCount || 0,
        programsDeleted: programsCount || 0,
        classTypesDeleted: classTypesCount || 0,
        message: "All class data deleted successfully",
      },
    });
  } catch (error: any) {
    console.error("Delete all classes error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete class data" },
      { status: 500 },
    );
  }
}
