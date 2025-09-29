import { NextRequest, NextResponse } from "next/server";
import { analyticsService } from "@/src/services";
import { getOrganizationAndUser } from "@/app/lib/auth-utils";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

// GET /api/v2/analytics/leads - Get lead analytics
export async function GET(request: NextRequest) {
  try {
    const { organization, user } = await getOrganizationAndUser();
    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 },
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get("days") || "30");

    const analytics = await analyticsService.getLeadAnalytics(
      organization.id,
      days,
    );

    return NextResponse.json(analytics);
  } catch (error) {
    console.error("Error fetching lead analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 },
    );
  }
}
