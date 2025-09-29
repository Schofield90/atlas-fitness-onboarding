import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { requireAuth } from "@/app/lib/api/auth-check";

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const userWithOrg = await requireAuth();
    const adminSupabase = createAdminClient();

    // Check if user has a staff record
    const { data: staffRecord } = await adminSupabase
      .from("organization_staff")
      .select("*")
      .eq("organization_id", userWithOrg.organizationId)
      .eq("user_id", userWithOrg.id)
      .single();

    return NextResponse.json({
      hasStaffRecord: !!staffRecord,
      staffRecord: staffRecord || null,
      needsSetup: !staffRecord,
    });
  } catch (error: any) {
    console.error("Error checking staff setup:", error);
    return NextResponse.json({
      hasStaffRecord: false,
      needsSetup: true,
      error: error.message,
    });
  }
}
