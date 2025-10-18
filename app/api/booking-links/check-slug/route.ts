import { NextRequest, NextResponse } from "next/server";
import { serverBookingLinkService } from "@/app/lib/services/booking-link-server";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    console.log('[check-slug] Starting slug validation...');
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");
    const excludeId = searchParams.get("exclude_id");
    console.log('[check-slug] slug:', slug, 'excludeId:', excludeId);

    if (!slug) {
      return NextResponse.json(
        { error: "Slug parameter is required" },
        { status: 400 },
      );
    }

    console.log('[check-slug] Calling serverBookingLinkService.checkSlugAvailability...');
    const isAvailable = await serverBookingLinkService.checkSlugAvailability(
      slug,
      excludeId || undefined,
    );
    console.log('[check-slug] Result:', isAvailable);

    return NextResponse.json({
      available: isAvailable,
      slug,
    });
  } catch (error) {
    console.error("[check-slug] Error:", error);
    return NextResponse.json(
      { error: "Failed to check slug availability" },
      { status: 500 },
    );
  }
}
