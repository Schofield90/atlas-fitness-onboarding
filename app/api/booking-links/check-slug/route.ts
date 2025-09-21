import { NextRequest, NextResponse } from "next/server";
import { serverBookingLinkService } from "@/app/lib/services/booking-link-server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");
    const excludeId = searchParams.get("exclude_id");

    if (!slug) {
      return NextResponse.json(
        { error: "Slug parameter is required" },
        { status: 400 },
      );
    }

    const isAvailable = await serverBookingLinkService.checkSlugAvailability(
      slug,
      excludeId || undefined,
    );

    return NextResponse.json({
      available: isAvailable,
      slug,
    });
  } catch (error) {
    console.error("Error checking slug availability:", error);
    return NextResponse.json(
      { error: "Failed to check slug availability" },
      { status: 500 },
    );
  }
}
