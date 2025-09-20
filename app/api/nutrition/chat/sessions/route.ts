import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { requireAuth, createErrorResponse } from "@/app/lib/api/auth-check";

export async function GET(request: NextRequest) {
  try {
    // Check authentication and get organization
    const userWithOrg = await requireAuth();

    // Create Supabase client
    const supabase = await createClient();

    const { searchParams } = new URL(request.url);
    const includeComplete = searchParams.get("include_complete") === "true";
    const limit = parseInt(searchParams.get("limit") || "10");

    // Build query
    let query = supabase
      .from("nutrition_chat_sessions")
      .select("*")
      .eq("user_id", userWithOrg.id)
      .eq("organization_id", userWithOrg.organizationId)
      .order("created_at", { ascending: false })
      .limit(limit);

    // Filter by completion status if requested
    if (!includeComplete) {
      query = query.eq("is_complete", false);
    }

    const { data: sessions, error } = await query;

    if (error) {
      console.error("Error fetching chat sessions:", error);
      return createErrorResponse(error, 500);
    }

    return NextResponse.json({
      success: true,
      data: sessions || [],
    });
  } catch (error) {
    console.error("Error in GET /api/nutrition/chat/sessions:", error);
    return createErrorResponse(error);
  }
}
