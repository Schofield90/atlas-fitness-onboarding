import { NextRequest, NextResponse } from "next/server";
import { availabilityEngine } from "@/app/lib/availability-engine";
import { createAdminClient } from "@/app/lib/supabase/admin";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

export const runtime = "nodejs";

// GET /api/booking/availability - Get available time slots
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Required parameters
    const linkSlug = searchParams.get("link");
    const organizationSlug = searchParams.get("org");

    if (!linkSlug && !organizationSlug) {
      return NextResponse.json(
        {
          error: "Either booking link slug or organization slug is required",
        },
        { status: 400 },
      );
    }

    // Optional parameters
    const date = searchParams.get("date");
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");
    const duration = parseInt(searchParams.get("duration") || "30");
    const appointmentTypeId = searchParams.get("appointment_type_id");
    const staffId = searchParams.get("staff_id");
    const timezone = searchParams.get("timezone") || "Europe/London";

    const adminSupabase = createAdminClient();
    let organizationId: string;
    let bookingLinkConfig: any = null;

    // Get organization and booking link details
    if (linkSlug) {
      const { data: bookingLink, error: linkError } = await adminSupabase
        .from("booking_links")
        .select(
          `
          *,
          organization:organizations(id, slug, name)
        `,
        )
        .eq("slug", linkSlug)
        .eq("is_active", true)
        .single();

      if (linkError || !bookingLink) {
        return NextResponse.json(
          {
            error: "Booking link not found or inactive",
          },
          { status: 404 },
        );
      }

      organizationId = bookingLink.organization_id;
      bookingLinkConfig = bookingLink;
    } else {
      // Get organization by slug
      const { data: organization, error: orgError } = await adminSupabase
        .from("organizations")
        .select("id, slug, name")
        .eq("slug", organizationSlug)
        .single();

      if (orgError || !organization) {
        return NextResponse.json(
          {
            error: "Organization not found",
          },
          { status: 404 },
        );
      }

      organizationId = organization.id;
    }

    // Determine date range
    let dateRange: { start: string; end: string } | undefined;
    if (startDate && endDate) {
      dateRange = { start: startDate, end: endDate };
    } else if (date) {
      dateRange = { start: date, end: date };
    }

    // Get availability options
    const options = {
      dateRange,
      duration,
      appointmentTypeId,
      staffId: bookingLinkConfig?.user_id || staffId,
      timezone,
    };

    // If booking link specifies team booking, handle differently
    if (
      bookingLinkConfig?.type === "team" ||
      bookingLinkConfig?.type === "round_robin"
    ) {
      const teamIds = bookingLinkConfig.team_ids || [bookingLinkConfig.user_id];
      const availability = await availabilityEngine.getTeamAvailability(
        organizationId,
        teamIds,
        options,
      );

      return NextResponse.json({
        success: true,
        slots: availability,
        booking_link: bookingLinkConfig
          ? {
              slug: bookingLinkConfig.slug,
              name: bookingLinkConfig.name,
              description: bookingLinkConfig.description,
              type: bookingLinkConfig.type,
              appointment_types: bookingLinkConfig.appointment_type_ids,
            }
          : null,
        organization: {
          id: organizationId,
          name: bookingLinkConfig?.organization?.name,
        },
      });
    }

    // Regular availability check
    const availability = await availabilityEngine.getAvailability(
      organizationId,
      options,
    );

    // Get staff information for slots
    const staffIds = [
      ...new Set(availability.map((slot) => slot.staff_id).filter(Boolean)),
    ];
    const { data: staffInfo } = await adminSupabase
      .from("users")
      .select("id, full_name")
      .in("id", staffIds);

    // Enhance slots with staff names
    const enhancedSlots = availability.map((slot) => ({
      ...slot,
      staff_name: staffInfo?.find((staff) => staff.id === slot.staff_id)
        ?.full_name,
    }));

    return NextResponse.json({
      success: true,
      slots: enhancedSlots,
      booking_link: bookingLinkConfig
        ? {
            slug: bookingLinkConfig.slug,
            name: bookingLinkConfig.name,
            description: bookingLinkConfig.description,
            type: bookingLinkConfig.type,
            appointment_types: bookingLinkConfig.appointment_type_ids,
          }
        : null,
      organization: {
        id: organizationId,
        name: bookingLinkConfig?.organization?.name,
      },
    });
  } catch (error) {
    console.error("Error getting availability:", error);
    return NextResponse.json(
      {
        error: "Failed to get availability",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// POST /api/booking/availability - Check specific slot availability
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      link_slug,
      organization_slug,
      staff_id,
      start_time,
      end_time,
      appointment_type_id,
    } = body;

    if (!link_slug && !organization_slug) {
      return NextResponse.json(
        {
          error: "Either booking link slug or organization slug is required",
        },
        { status: 400 },
      );
    }

    if (!staff_id || !start_time || !end_time) {
      return NextResponse.json(
        {
          error: "staff_id, start_time, and end_time are required",
        },
        { status: 400 },
      );
    }

    const adminSupabase = createAdminClient();
    let organizationId: string;

    // Get organization ID
    if (link_slug) {
      const { data: bookingLink } = await adminSupabase
        .from("booking_links")
        .select("organization_id")
        .eq("slug", link_slug)
        .eq("is_active", true)
        .single();

      if (!bookingLink) {
        return NextResponse.json(
          {
            error: "Booking link not found",
          },
          { status: 404 },
        );
      }

      organizationId = bookingLink.organization_id;
    } else {
      const { data: organization } = await adminSupabase
        .from("organizations")
        .select("id")
        .eq("slug", organization_slug)
        .single();

      if (!organization) {
        return NextResponse.json(
          {
            error: "Organization not found",
          },
          { status: 404 },
        );
      }

      organizationId = organization.id;
    }

    // Check if slot is available
    const isAvailable = await availabilityEngine.isSlotAvailable(
      staff_id,
      organizationId,
      start_time,
      end_time,
      appointment_type_id,
    );

    return NextResponse.json({
      success: true,
      available: isAvailable,
      slot: {
        start_time,
        end_time,
        staff_id,
      },
    });
  } catch (error) {
    console.error("Error checking slot availability:", error);
    return NextResponse.json(
      {
        error: "Failed to check slot availability",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
