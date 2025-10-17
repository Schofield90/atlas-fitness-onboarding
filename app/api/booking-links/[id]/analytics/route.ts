import { NextRequest, NextResponse } from "next/server";
import { serverBookingLinkService } from "@/app/lib/services/booking-link-server";
import { createClient } from "@/app/lib/supabase/server";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has access to this booking link
    const bookingLink = await serverBookingLinkService.getBookingLinkById(
      params.id,
    );
    if (!bookingLink) {
      return NextResponse.json(
        { error: "Booking link not found" },
        { status: 404 },
      );
    }

    const { data: orgMember, error: orgError } = await supabase
      .from("organization_members")
      .select("org_id")
      .eq("user_id", user.id)
      .single();

    if (
      orgError ||
      !orgMember ||
      bookingLink.organization_id !== orgMember.org_id
    ) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "30");

    // Get analytics data
    const analytics = await serverBookingLinkService.getAnalytics(
      params.id,
      days,
    );

    // Get booking stats
    const stats = await serverBookingLinkService.getBookingStats(params.id);

    return NextResponse.json({
      analytics,
      stats,
      booking_link: {
        id: bookingLink.id,
        name: bookingLink.name,
        slug: bookingLink.slug,
      },
    });
  } catch (error) {
    console.error("Error fetching booking link analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 },
    );
  }
}
