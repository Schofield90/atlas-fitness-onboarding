import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import {
  generateSlots,
  distributeSlots,
} from "@/packages/core/availability/generateSlots";
import { startOfDay, endOfDay, parseISO } from "date-fns";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } },
) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const timezone = searchParams.get("tz") || "Europe/London";

    if (!from || !to) {
      return NextResponse.json(
        { error: "Missing required parameters: from, to" },
        { status: 400 },
      );
    }

    // Normalize slug
    const normalizedSlug = params.slug.replace(/\//g, "-");

    // Fetch calendar with availability policy
    const { data: calendar, error: calendarError } = await supabase
      .from("calendars")
      .select(
        `
        *,
        availability_policies(*),
        calendar_staff(
          *,
          staff(*)
        )
      `,
      )
      .eq("slug", normalizedSlug)
      .single();

    if (calendarError || !calendar) {
      return NextResponse.json(
        { error: "Calendar not found" },
        { status: 404 },
      );
    }

    const policy = calendar.availability_policies?.[0];
    if (!policy) {
      return NextResponse.json(
        { error: "No availability policy configured" },
        { status: 404 },
      );
    }

    // Fetch existing bookings in the date range
    const startDate = startOfDay(parseISO(from));
    const endDate = endOfDay(parseISO(to));

    const { data: bookings } = await supabase
      .from("bookings")
      .select("*")
      .eq("calendar_id", calendar.id)
      .gte("start_time", startDate.toISOString())
      .lte("start_time", endDate.toISOString())
      .in("status", ["confirmed", "pending"]);

    // Generate slots for each staff member if applicable
    const staffMembers =
      calendar.calendar_staff?.map((cs: any) => ({
        id: cs.staff.id,
        name: cs.staff.name,
        weight: cs.weight || 1,
      })) || [];

    // Generate base slots
    const slots = generateSlots(
      {
        workHours: policy.work_hours,
        slotIntervalMins: policy.slot_interval_mins,
        durationMins: policy.duration_mins,
        bufferBeforeMins: policy.buffer_before_mins,
        bufferAfterMins: policy.buffer_after_mins,
        minNoticeMins: policy.min_notice_mins,
        dateRangeDays: policy.date_range_days,
        maxPerSlotPerUser: policy.max_per_slot_per_user,
        lookBusyPercent: policy.look_busy_percent,
        timezone: policy.timezone || timezone,
      },
      startDate,
      endDate,
      bookings || [],
      undefined,
      timezone,
    );

    // Distribute slots among staff if needed
    let finalSlots = slots;
    if (staffMembers.length > 0 && calendar.distribution !== "single") {
      // Count existing bookings per staff
      const bookingCounts = new Map<string, number>();
      bookings?.forEach((booking) => {
        if (booking.staff_id) {
          bookingCounts.set(
            booking.staff_id,
            (bookingCounts.get(booking.staff_id) || 0) + 1,
          );
        }
      });

      finalSlots = distributeSlots(
        slots,
        staffMembers,
        calendar.distribution,
        bookingCounts,
      );
    } else if (staffMembers.length > 0) {
      // Single staff assignment
      finalSlots = slots.map((day) => ({
        ...day,
        slots: day.slots.map((slot) => ({
          ...slot,
          staffId: staffMembers[0].id,
        })),
      }));
    }

    // Format response
    const response = {
      calendar: {
        id: calendar.id,
        name: calendar.name,
        slug: calendar.slug,
        distribution: calendar.distribution,
      },
      timezone,
      availability: finalSlots.map((day) => ({
        date: day.date,
        slots: day.slots
          .filter((s) => s.available)
          .map((s) => ({
            startTime: s.startTime,
            endTime: s.endTime,
            staffId: s.staffId,
            staffName: staffMembers.find((sm) => sm.id === s.staffId)?.name,
          })),
      })),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching availability:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
