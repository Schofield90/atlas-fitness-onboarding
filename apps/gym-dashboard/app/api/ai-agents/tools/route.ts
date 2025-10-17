import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/app/lib/api/auth-check";
import { ToolRegistry } from "@/lib/ai-agents/tools/registry";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { id: userId, organizationId } = await requireAuth();

    // Get all tools from the registry (51 tools)
    const registry = new ToolRegistry();
    const allTools = registry.getAllTools();

    // Convert to simple format for frontend
    const tools = allTools.map(tool => ({
      id: tool.id,
      name: tool.name,
      description: tool.description,
      category: tool.category,
      enabled: true, // All registry tools are enabled by default
    }));

    return NextResponse.json({ success: true, tools });
  } catch (error: any) {
    console.error("Error in GET /api/ai-agents/tools:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: error.status || 500 },
    );
  }
}
