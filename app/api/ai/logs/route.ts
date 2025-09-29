import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

// Log AI chatbot actions
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      organizationId,
      workflowId,
      action_type,
      triggered_by,
      trigger_reason,
      phone_number,
    } = body;

    if (!organizationId || !action_type) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 },
      );
    }

    const adminSupabase = createAdminClient();

    const logData = {
      organization_id: organizationId,
      workflow_id: workflowId,
      action_type,
      triggered_by: triggered_by || "system",
      trigger_reason,
      phone_number,
    };

    const { data, error } = await adminSupabase
      .from("ai_chatbot_logs")
      .insert(logData)
      .select()
      .single();

    if (error) {
      console.error("Error logging AI action:", error);
      return NextResponse.json(
        { error: "Failed to log action" },
        { status: 500 },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("AI logs API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Get AI chatbot logs
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");
    const workflowId = searchParams.get("workflowId");
    const phoneNumber = searchParams.get("phoneNumber");
    const limit = parseInt(searchParams.get("limit") || "50");

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID required" },
        { status: 400 },
      );
    }

    const adminSupabase = createAdminClient();
    let query = adminSupabase
      .from("ai_chatbot_logs")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (workflowId) {
      query = query.eq("workflow_id", workflowId);
    }

    if (phoneNumber) {
      query = query.eq("phone_number", phoneNumber);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching AI logs:", error);
      return NextResponse.json(
        { error: "Failed to fetch logs" },
        { status: 500 },
      );
    }

    return NextResponse.json({ logs: data });
  } catch (error) {
    console.error("AI logs fetch API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
