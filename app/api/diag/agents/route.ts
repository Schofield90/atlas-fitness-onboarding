import { NextRequest, NextResponse } from "next/server";
import { toolRegistry } from "@/app/lib/ai-agents/tools/registry";

// Force dynamic - this is a diagnostic endpoint
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Diagnostic endpoint to verify tool registry and build info
 * GET /api/diag/agents
 */
export async function GET(request: NextRequest) {
  try {
    const allTools = toolRegistry.getAllTools();
    const ghlTool = toolRegistry.getTool("check_ghl_availability");

    return NextResponse.json({
      success: true,
      build: {
        gitSha: process.env.VERCEL_GIT_COMMIT_SHA || "local",
        gitBranch: process.env.VERCEL_GIT_COMMIT_REF || "unknown",
        project: process.env.VERCEL_PROJECT_PRODUCTION_URL || "localhost",
        environment: process.env.VERCEL_ENV || "development",
        region: process.env.VERCEL_REGION || "local",
      },
      registry: {
        totalTools: allTools.length,
        toolIds: allTools.map((t) => t.id),
        toolCategories: [...new Set(allTools.map((t) => t.category))],
      },
      ghlTool: {
        found: !!ghlTool,
        id: ghlTool?.id,
        name: ghlTool?.name,
        category: ghlTool?.category,
        enabled: ghlTool?.enabled,
      },
      stats: toolRegistry.getToolStats(),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}
