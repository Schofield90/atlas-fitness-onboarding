import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { isSlotAvailable } from "@/packages/core/availability/generateSlots";
import { parseISO } from "date-fns";
import { v4 as uuidv4 } from "uuid";
import Redis from "ioredis";

// Initialize Redis client
const redis = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL) : null;

interface BookingRequest {
  slot: string; // ISO datetime
  name: string;
  email: string;
  phone?: string;
  consent: boolean;
  timezone?: string;
  notes?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } },
) {
  try {
    const supabase = await createClient();
    const body: BookingRequest = await request.json();

    // Validate required fields
    if (!body.slot || !body.name || !body.email || !body.consent) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Normalize slug
    const normalizedSlug = params.slug.replace(/\//g, "-");

    // Fetch calendar with policy and staff
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

    // Parse slot times
    const slotStart = parseISO(body.slot);
    const slotEnd = new Date(
      slotStart.getTime() + policy.duration_mins * 60000,
    );

    // Use Redis lock to prevent race conditions (if available)
    const lockKey = `booking:${calendar.id}:${body.slot}`;
    let lockAcquired = false;

    if (redis) {
      // Try to acquire lock (expires after 10 seconds)
      const locked = await redis.set(lockKey, "1", "NX", "EX", 10);
      if (!locked) {
        return NextResponse.json(
          { error: "This slot is being booked by another user" },
          { status: 409 },
        );
      }
      lockAcquired = true;
    }

    try {
      // Fetch existing bookings to check availability
      const { data: existingBookings } = await supabase
        .from("bookings")
        .select("*")
        .eq("calendar_id", calendar.id)
        .gte(
          "start_time",
          new Date(slotStart.getTime() - 24 * 3600000).toISOString(),
        )
        .lte(
          "start_time",
          new Date(slotStart.getTime() + 24 * 3600000).toISOString(),
        )
        .in("status", ["confirmed", "pending"]);

      // Check if slot is still available
      const available = isSlotAvailable(
        slotStart,
        slotEnd,
        {
          workHours: policy.work_hours,
          slotIntervalMins: policy.slot_interval_mins,
          durationMins: policy.duration_mins,
          bufferBeforeMins: policy.buffer_before_mins,
          bufferAfterMins: policy.buffer_after_mins,
          minNoticeMins: policy.min_notice_mins,
          dateRangeDays: policy.date_range_days,
          maxPerSlotPerUser: policy.max_per_slot_per_user,
          lookBusyPercent: 0, // Don't apply look busy for actual booking
          timezone: policy.timezone || "Europe/London",
        },
        existingBookings || [],
      );

      if (!available) {
        return NextResponse.json(
          { error: "This slot is no longer available" },
          { status: 409 },
        );
      }

      // Assign staff based on distribution strategy
      let assignedStaffId: string | null = null;
      const staffMembers = calendar.calendar_staff || [];

      if (staffMembers.length > 0) {
        if (calendar.distribution === "single" || staffMembers.length === 1) {
          assignedStaffId = staffMembers[0].staff.id;
        } else if (calendar.distribution === "round_robin") {
          // Get count of bookings per staff
          const staffBookingCounts = new Map<string, number>();
          existingBookings?.forEach((booking) => {
            if (booking.staff_id) {
              staffBookingCounts.set(
                booking.staff_id,
                (staffBookingCounts.get(booking.staff_id) || 0) + 1,
              );
            }
          });

          // Find staff with least bookings
          let minCount = Infinity;
          let selectedStaff = staffMembers[0];

          for (const cs of staffMembers) {
            const count = staffBookingCounts.get(cs.staff.id) || 0;
            if (count < minCount) {
              minCount = count;
              selectedStaff = cs;
            }
          }

          assignedStaffId = selectedStaff.staff.id;
        } else {
          // Default to first available staff
          assignedStaffId = staffMembers[0].staff.id;
        }
      }

      // Generate unique ICS UID
      const icsUid = `${uuidv4()}@${calendar.slug}.com`;

      // Create the booking
      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .insert({
          calendar_id: calendar.id,
          staff_id: assignedStaffId,
          contact_name: body.name,
          contact_email: body.email,
          contact_phone: body.phone,
          start_time: slotStart.toISOString(),
          end_time: slotEnd.toISOString(),
          timezone: body.timezone || "Europe/London",
          status: calendar.auto_confirm ? "confirmed" : "pending",
          consent_given: body.consent,
          consent_text: "I agree to receive communications",
          ics_uid: icsUid,
        })
        .select(
          `
          *,
          staff(name, email),
          calendars(name, invite_template)
        `,
        )
        .single();

      if (bookingError) {
        throw bookingError;
      }

      // Add notes if provided
      if (body.notes && booking) {
        await supabase.from("booking_notes").insert({
          booking_id: booking.id,
          notes: body.notes,
        });
      }

      // TODO: Queue jobs for email/SMS notifications
      // This would typically be done with BullMQ or similar
      // For now, we'll just log it
      console.log("📧 Would queue email job for booking:", booking.id);
      console.log("📅 Would generate ICS file with UID:", icsUid);

      // Format response
      const response = {
        success: true,
        booking: {
          id: booking.id,
          startTime: booking.start_time,
          endTime: booking.end_time,
          status: booking.status,
          staff: booking.staff
            ? {
                id: booking.staff_id,
                name: booking.staff.name,
              }
            : null,
          calendar: {
            name: booking.calendars?.name,
          },
          icsDownloadUrl: `/api/bookings/${booking.id}/invite.ics`,
        },
        message: calendar.auto_confirm
          ? "Your booking has been confirmed!"
          : "Your booking request has been received and is pending confirmation.",
      };

      return NextResponse.json(response, { status: 201 });
    } finally {
      // Release Redis lock if acquired
      if (redis && lockAcquired) {
        await redis.del(lockKey);
      }
    }
  } catch (error) {
    console.error("Error creating booking:", error);
    return NextResponse.json(
      { error: "Failed to create booking" },
      { status: 500 },
    );
  }
}
