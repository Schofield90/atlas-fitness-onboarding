import { NextRequest, NextResponse } from "next/server";
import { bookingService } from "@/src/services";
import { getOrganizationAndUser } from "@/app/lib/auth-utils";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

// DELETE /api/v2/bookings/[id] - Cancel booking
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { organization, user } = await getOrganizationAndUser();
    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 },
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const reason = searchParams.get("reason") || undefined;

    await bookingService.cancelBooking(params.id, reason);

    return NextResponse.json({
      message: "Booking cancelled successfully",
    });
  } catch (error) {
    console.error("Error cancelling booking:", error);
    return NextResponse.json(
      { error: "Failed to cancel booking" },
      { status: 500 },
    );
  }
}
