import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

// Get conversation AI state
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");
    const phoneNumber = searchParams.get("phoneNumber");
    const channel = searchParams.get("channel");

    if (!organizationId || !phoneNumber || !channel) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("conversation_ai_state")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("phone_number", phoneNumber)
      .eq("channel", channel)
      .single();

    if (error && error.code !== "PGRST116") {
      // Not found is OK
      console.error("Error fetching conversation state:", error);
      return NextResponse.json(
        { error: "Failed to fetch conversation state" },
        { status: 500 },
      );
    }

    // Return default state if not found
    const defaultState = {
      ai_enabled: true,
      handoff_to_human: false,
      handoff_reason: null,
      handoff_timestamp: null,
      message_count: 0,
    };

    return NextResponse.json(data || defaultState);
  } catch (error) {
    console.error("Conversation state API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
