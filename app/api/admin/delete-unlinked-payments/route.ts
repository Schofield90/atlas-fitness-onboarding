import { NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Delete all payments with client_id = null
 * Use this to clean up failed imports before re-importing
 */
export async function POST() {
  try {
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const orgId = "ee1206d7-62fb-49cf-9f39-95b9c54423a4";

    // Count unlinked payments before deletion
    const { count: beforeCount } = await supabaseAdmin
      .from("payments")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .is("client_id", null);

    // Delete unlinked payments
    const { error: deleteError, count: deletedCount } = await supabaseAdmin
      .from("payments")
      .delete({ count: "exact" })
      .eq("organization_id", orgId)
      .is("client_id", null);

    if (deleteError) {
      throw deleteError;
    }

    // Count remaining payments
    const { count: afterCount } = await supabaseAdmin
      .from("payments")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId);

    return NextResponse.json({
      success: true,
      message: `Deleted ${deletedCount || 0} unlinked payments`,
      stats: {
        unlinked_before: beforeCount || 0,
        deleted: deletedCount || 0,
        remaining_total: afterCount || 0,
      },
    });
  } catch (error: any) {
    console.error("Error deleting unlinked payments:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete payments" },
      { status: 500 },
    );
  }
}
