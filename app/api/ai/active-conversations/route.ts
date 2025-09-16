import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

// Get active AI conversations
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID required" },
        { status: 400 },
      );
    }

    const supabase = createClient();

    // Get all conversation states for the organization
    const { data: conversationStates, error } = await supabase
      .from("conversation_ai_state")
      .select("*")
      .eq("organization_id", organizationId)
      .order("updated_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Error fetching active conversations:", error);
      return NextResponse.json(
        { error: "Failed to fetch conversations" },
        { status: 500 },
      );
    }

    // Enrich with recent message count
    const enrichedConversations = await Promise.all(
      (conversationStates || []).map(async (conv) => {
        // Count recent messages for this conversation
        const tableName =
          conv.channel === "whatsapp" ? "whatsapp_logs" : "sms_logs";

        const { count } = await supabase
          .from(tableName)
          .select("*", { count: "exact", head: true })
          .eq("organization_id", organizationId)
          .eq("from_number", conv.phone_number)
          .gte(
            "created_at",
            new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          ); // Last 7 days

        return {
          ...conv,
          recent_message_count: count || 0,
        };
      }),
    );

    return NextResponse.json({
      conversations: enrichedConversations,
      total: enrichedConversations.length,
    });
  } catch (error) {
    console.error("Active conversations API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
