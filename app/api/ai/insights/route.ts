import { NextRequest, NextResponse } from "next/server";
import { superAI } from "@/app/lib/ai/consciousness";
import { requireAuth, createErrorResponse } from "@/app/lib/api/auth-check";

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // SECURITY: Get authenticated user's organization - NEVER accept from request body
    const user = await requireAuth();
    const organizationId = user.organizationId;

    // Get proactive insights from the AI
    const insights = await superAI.getProactiveInsights(organizationId);

    return NextResponse.json({ insights });
  } catch (error) {
    console.error("AI insights error:", error);
    return createErrorResponse(error);
  }
}
