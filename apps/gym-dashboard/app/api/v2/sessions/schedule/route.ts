import { NextRequest, NextResponse } from "next/server";
import { bookingService } from "@/src/services";
import { getOrganizationAndUser } from "@/app/lib/auth-utils";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

// GET /api/v2/sessions/schedule - Get schedule for date range
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

    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    if (!dateFrom || !dateTo) {
      return NextResponse.json(
        { error: "dateFrom and dateTo are required" },
        { status: 400 },
      );
    }

    const filters = {
      instructorId: searchParams.get("instructorId") || undefined,
      classId: searchParams.get("classId") || undefined,
      locationId: searchParams.get("locationId") || undefined,
    };

    const schedule = await bookingService.getSchedule(
      organization.id,
      new Date(dateFrom),
      new Date(dateTo),
      filters,
    );

    return NextResponse.json(schedule);
  } catch (error) {
    console.error("Error fetching schedule:", error);
    return NextResponse.json(
      { error: "Failed to fetch schedule" },
      { status: 500 },
    );
  }
}
