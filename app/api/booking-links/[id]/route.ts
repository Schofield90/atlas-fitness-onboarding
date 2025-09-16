import { NextRequest, NextResponse } from "next/server";
import { bookingLinkService } from "@/app/lib/services/booking-link";
import { createClient } from "@/app/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const bookingLink = await bookingLinkService.getBookingLinkById(params.id);

    if (!bookingLink) {
      return NextResponse.json(
        { error: "Booking link not found" },
        { status: 404 },
      );
    }

    // Check if user has access to this booking link
    const { data: orgMember } = await supabase
      .from("organization_members")
      .select("org_id, organization_id")
      .eq("user_id", user.id)
      .single();

    const orgId =
      (orgMember as any)?.organization_id || (orgMember as any)?.org_id;

    if (!orgId || bookingLink.organization_id !== orgId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    return NextResponse.json({ booking_link: bookingLink });
  } catch (error) {
    console.error("Error fetching booking link:", error);
    return NextResponse.json(
      { error: "Failed to fetch booking link" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has access to this booking link
    const existingLink = await bookingLinkService.getBookingLinkById(params.id);
    if (!existingLink) {
      return NextResponse.json(
        { error: "Booking link not found" },
        { status: 404 },
      );
    }

    const { data: orgMember } = await supabase
      .from("organization_members")
      .select("org_id, organization_id")
      .eq("user_id", user.id)
      .single();

    const orgId =
      (orgMember as any)?.organization_id || (orgMember as any)?.org_id;

    if (!orgId || existingLink.organization_id !== orgId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const body = await request.json();

    // Validate the configuration
    const validation = await bookingLinkService.validateBookingLinkConfig({
      ...body,
      id: params.id,
      organization_id: existingLink.organization_id,
    });

    if (!validation.valid) {
      return NextResponse.json(
        { error: "Invalid configuration", details: validation.errors },
        { status: 400 },
      );
    }

    // Update the booking link
    const updatedLink = await bookingLinkService.updateBookingLink(
      params.id,
      body,
    );

    // Persist availability rules into booking_availability if provided
    try {
      const availabilityRules: any = body.availability_rules || {};
      for (const staffId of Object.keys(availabilityRules)) {
        const weekly = availabilityRules[staffId]?.weekly || {};
        const flatRules: Array<{
          day_of_week: number;
          start_time: string;
          end_time: string;
          is_available: boolean;
        }> = [];
        for (const dayKey of Object.keys(weekly)) {
          const dayNum = Number(dayKey);
          const intervals = weekly[dayKey] || [];
          for (const intv of intervals) {
            flatRules.push({
              day_of_week: dayNum,
              start_time: intv.start,
              end_time: intv.end,
              is_available: true,
            });
          }
        }
        // Always reset for this staff to reflect current selections
        await bookingLinkService.setAvailabilityRules(
          updatedLink.id,
          staffId,
          flatRules,
        );
      }
    } catch (e) {
      console.error("Failed to persist availability rules for booking link", e);
    }

    return NextResponse.json({ booking_link: updatedLink });
  } catch (error) {
    console.error("Error updating booking link:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update booking link",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has access to this booking link
    const existingLink = await bookingLinkService.getBookingLinkById(params.id);
    if (!existingLink) {
      return NextResponse.json(
        { error: "Booking link not found" },
        { status: 404 },
      );
    }

    const { data: orgMember } = await supabase
      .from("organization_members")
      .select("org_id, organization_id")
      .eq("user_id", user.id)
      .single();

    const orgId =
      (orgMember as any)?.organization_id || (orgMember as any)?.org_id;

    if (!orgId || existingLink.organization_id !== orgId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    await bookingLinkService.deleteBookingLink(params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting booking link:", error);
    return NextResponse.json(
      { error: "Failed to delete booking link" },
      { status: 500 },
    );
  }
}
