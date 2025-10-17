import { NextRequest, NextResponse } from "next/server";
import { toolRegistry } from "@/app/lib/ai-agents/tools/registry";
import { requireAuth } from "@/app/lib/api/auth-check";

// Force dynamic rendering - never cache availability results
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate the request
    await requireAuth();

    const { date } = await request.json();
    const { id: agentId } = await params;

    // DIAGNOSTIC: Log which registry and tools are loaded
    console.info("[AVAILABILITY_DIAGNOSTIC]", {
      gitSha: process.env.VERCEL_GIT_COMMIT_SHA || "local",
      project: process.env.VERCEL_PROJECT_PRODUCTION_URL || "localhost",
      date,
      agentId,
      registeredTools: toolRegistry.getAllTools().map((t) => t.id),
      hasGHLTool: !!toolRegistry.getTool("check_ghl_availability"),
    });

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
