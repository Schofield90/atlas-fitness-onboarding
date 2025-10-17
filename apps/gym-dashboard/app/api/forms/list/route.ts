import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { requireAuth } from "@/app/lib/api/auth-check";

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const userWithOrg = await requireAuth();
    const supabase = createAdminClient();

    const { data: forms, error } = await supabase
      .from("forms")
      .select("*")
      .eq("organization_id", userWithOrg.organizationId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching forms:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ forms: forms || [] });
  } catch (error: any) {
    console.error("Error in forms list:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
