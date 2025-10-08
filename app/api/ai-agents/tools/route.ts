import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/app/lib/api/auth-check";
import { createAdminClient } from "@/app/lib/supabase/admin";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { id: userId, organizationId } = await requireAuth();
    const supabase = createAdminClient();

    const { data: tools, error } = await supabase
      .from("ai_agent_tools")
      .select("*")
      .eq("enabled", true)
      .order("category")
      .order("name");

    if (error) {
      console.error("Error fetching tools:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch tools" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, tools: tools || [] });
  } catch (error: any) {
    console.error("Error in GET /api/ai-agents/tools:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: error.status || 500 },
    );
  }
}
