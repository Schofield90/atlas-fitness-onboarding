import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/app/lib/api/auth-check";

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const userWithOrg = await requireAuth();

    return NextResponse.json({
      organizationId: userWithOrg.organizationId,
      email: userWithOrg.email,
      role: userWithOrg.role,
    });
  } catch (error: any) {
    console.error("Error getting organization info:", error);
    return NextResponse.json(
      { error: "Failed to get organization info" },
      { status: 500 },
    );
  }
}
