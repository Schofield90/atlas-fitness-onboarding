import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

const ADMIN_EMAILS = ["sam@atlas-gyms.co.uk", "sam@gymleadhub.co.uk"];

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check authorization
    if (!ADMIN_EMAILS.includes(user.email?.toLowerCase() || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get the latest weekly brief
    const { data: briefData, error: briefError } = await supabase
      .from("weekly_briefs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (briefError && briefError.code !== "PGRST116") {
      throw briefError;
    }

    if (!briefData) {
      return NextResponse.json({
        briefData: null,
        generatedAt: null,
      });
    }

    return NextResponse.json({
      briefData: briefData.data,
      generatedAt: briefData.created_at,
    });
  } catch (error) {
    console.error("Error fetching weekly brief:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
