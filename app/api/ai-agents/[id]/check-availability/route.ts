import { NextRequest, NextResponse } from "next/server";
import { toolRegistry } from "@/lib/ai-agents/tools/registry";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { date } = await request.json();
    const agentId = params.id;

    // Execute check_ghl_availability tool
    const result = await toolRegistry.executeTool(
      "check_ghl_availability",
      { preferredDate: date },
      {
        agentId,
        organizationId: "", // Not needed for this tool
        conversationId: undefined,
        userId: undefined,
      }
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[Check Availability API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to check availability",
      },
      { status: 500 }
    );
  }
}
