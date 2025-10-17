import { NextRequest, NextResponse } from "next/server";
import { startImpersonation } from "@/app/lib/admin/impersonation";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { organizationId, scope, reason, durationMinutes } = body;

    if (!organizationId || !reason) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 },
      );
    }

    const result = await startImpersonation({
      organizationId,
      scope: scope || "read",
      reason,
      durationMinutes: durationMinutes || 15,
    });

    if (!result.success) {
      return NextResponse.json(result, { status: 403 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Impersonation start error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
