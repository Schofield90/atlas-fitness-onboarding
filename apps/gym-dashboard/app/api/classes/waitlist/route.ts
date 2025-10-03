import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/app/lib/supabase/server";
import { getUserAndOrganization } from "@/app/lib/auth-utils";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

interface WaitlistRequest {
  classSessionId: string;
  customerId: string;
  autoBook?: boolean;
}

interface WaitlistPosition {
  id: string;
  customer_id: string;
  class_session_id: string;
  position: number;
  added_at: string;
  notified_at?: string;
  status: "waiting" | "promoted" | "expired" | "cancelled";
  customer: {
    name: string;
    email: string;
    phone: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { user, organization } = await getUserAndOrganization(supabase);

    if (!user || !organization) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: WaitlistRequest = await request.json();
    const { classSessionId, customerId, autoBook = true } = body;

    // Check if customer is already on waitlist
    const { data: existingWaitlist } = await supabase
      .from("class_waitlists")
      .select("*")
      .eq("class_session_id", classSessionId)
      .eq("customer_id", customerId)
      .eq("status", "waiting")
      .single();

    if (existingWaitlist) {
      return NextResponse.json(
        { error: "Customer already on waitlist" },
        { status: 400 },
      );
    }

    // Check if customer is already booked
    const { data: existingBooking } = await supabase
      .from("bookings")
      .select("*")
      .eq("class_session_id", classSessionId)
      .eq("customer_id", customerId)
      .neq("booking_status", "cancelled")
      .single();

    if (existingBooking) {
      return NextResponse.json(
        { error: "Customer already booked for this class" },
        { status: 400 },
      );
    }

    // Get current waitlist count to determine position
    const { count: waitlistCount } = await supabase
      .from("class_waitlists")
      .select("*", { count: "exact", head: true })
      .eq("class_session_id", classSessionId)
      .eq("status", "waiting");

    const position = (waitlistCount || 0) + 1;

    // Add to waitlist
    const { data: waitlistEntry, error: waitlistError } = await supabase
      .from("class_waitlists")
      .insert({
        class_session_id: classSessionId,
        customer_id: customerId,
        position,
        organization_id: organization.id,
        status: "waiting",
        added_at: new Date().toISOString(),
      })
      .select(
        `
        *,
        customer:customer_id (
          name,
          email,
          phone
        ),
        class_session:class_session_id (
          name,
          start_time,
          end_time
        )
      `,
      )
      .single();

    if (waitlistError) {
      console.error("Error adding to waitlist:", waitlistError);
      return NextResponse.json(
        { error: "Failed to add to waitlist" },
        { status: 500 },
      );
    }

    // Send waitlist notification email/SMS (optional)
    // This would be implemented based on your notification system

    return NextResponse.json({
      success: true,
      waitlistEntry,
      position,
      message: `Added to waitlist at position ${position}`,
    });
  } catch (error) {
    console.error("Error adding to waitlist:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { user, organization } = await getUserAndOrganization(supabase);

    if (!user || !organization) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const classSessionId = url.searchParams.get("classSessionId");
    const customerId = url.searchParams.get("customerId");
    const status = url.searchParams.get("status");

    let query = supabase
      .from("class_waitlists")
      .select(
        `
        *,
        customer:customer_id (
          name,
          email,
          phone
        ),
        class_session:class_session_id (
          name,
          start_time,
          end_time,
          max_capacity,
          current_bookings
        )
      `,
      )
      .eq("organization_id", organization.id);

    if (classSessionId) {
      query = query.eq("class_session_id", classSessionId);
    }

    if (customerId) {
      query = query.eq("customer_id", customerId);
    }

    if (status) {
      query = query.eq("status", status);
    } else {
      query = query.eq("status", "waiting");
    }

    const { data: waitlist, error } = await query.order("position", {
      ascending: true,
    });

    if (error) {
      console.error("Error fetching waitlist:", error);
      return NextResponse.json(
        { error: "Failed to fetch waitlist" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      waitlist: waitlist || [],
      total: (waitlist || []).length,
    });
  } catch (error) {
    console.error("Error fetching waitlist:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { user, organization } = await getUserAndOrganization(supabase);

    if (!user || !organization) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { waitlistId, action, customerId, classSessionId } = body;

    if (action === "promote") {
      // Promote from waitlist to booking
      const { data: waitlistEntry, error: waitlistError } = await supabase
        .from("class_waitlists")
        .select("*")
        .eq("id", waitlistId)
        .eq("organization_id", organization.id)
        .single();

      if (waitlistError || !waitlistEntry) {
        return NextResponse.json(
          { error: "Waitlist entry not found" },
          { status: 404 },
        );
      }

      // Check if class has space
      const { data: classSession, error: classError } = await supabase
        .from("class_sessions")
        .select("*")
        .eq("id", waitlistEntry.class_session_id)
        .single();

      if (classError || !classSession) {
        return NextResponse.json(
          { error: "Class session not found" },
          { status: 404 },
        );
      }

      if (classSession.current_bookings >= classSession.max_capacity) {
        return NextResponse.json(
          { error: "Class is still full" },
          { status: 400 },
        );
      }

      // Create booking
      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .insert({
          customer_id: waitlistEntry.customer_id,
          class_session_id: waitlistEntry.class_session_id,
          booking_status: "confirmed",
          payment_status: "pending",
          booking_time: new Date().toISOString(),
        })
        .select()
        .single();

      if (bookingError) {
        console.error("Error creating booking:", bookingError);
        return NextResponse.json(
          { error: "Failed to create booking" },
          { status: 500 },
        );
      }

      // Update waitlist entry
      const { error: updateWaitlistError } = await supabase
        .from("class_waitlists")
        .update({
          status: "promoted",
          notified_at: new Date().toISOString(),
        })
        .eq("id", waitlistId);

      if (updateWaitlistError) {
        console.error("Error updating waitlist:", updateWaitlistError);
      }

      // Update class booking count
      const { error: updateClassError } = await supabase
        .from("class_sessions")
        .update({
          current_bookings: classSession.current_bookings + 1,
        })
        .eq("id", waitlistEntry.class_session_id);

      if (updateClassError) {
        console.error("Error updating class count:", updateClassError);
      }

      // Reorder remaining waitlist positions
      await reorderWaitlist(supabase, waitlistEntry.class_session_id);

      return NextResponse.json({
        success: true,
        booking,
        message: "Customer promoted from waitlist to booking",
      });
    } else if (action === "cancel") {
      // Cancel waitlist entry
      const { error: cancelError } = await supabase
        .from("class_waitlists")
        .update({
          status: "cancelled",
        })
        .eq("id", waitlistId)
        .eq("organization_id", organization.id);

      if (cancelError) {
        return NextResponse.json(
          { error: "Failed to cancel waitlist entry" },
          { status: 500 },
        );
      }

      // Get class session ID for reordering
      const { data: waitlistEntry } = await supabase
        .from("class_waitlists")
        .select("class_session_id")
        .eq("id", waitlistId)
        .single();

      if (waitlistEntry) {
        await reorderWaitlist(supabase, waitlistEntry.class_session_id);
      }

      return NextResponse.json({
        success: true,
        message: "Waitlist entry cancelled",
      });
    } else if (action === "reorder") {
      // Reorder waitlist positions
      const { positions } = body;

      if (!Array.isArray(positions)) {
        return NextResponse.json(
          { error: "Invalid positions array" },
          { status: 400 },
        );
      }

      const updates = positions.map((pos: { id: string; position: number }) =>
        supabase
          .from("class_waitlists")
          .update({ position: pos.position })
          .eq("id", pos.id)
          .eq("organization_id", organization.id),
      );

      await Promise.all(updates);

      return NextResponse.json({
        success: true,
        message: "Waitlist reordered successfully",
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error updating waitlist:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { user, organization } = await getUserAndOrganization(supabase);

    if (!user || !organization) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const waitlistId = url.searchParams.get("waitlistId");

    if (!waitlistId) {
      return NextResponse.json(
        { error: "Missing waitlistId" },
        { status: 400 },
      );
    }

    // Get waitlist entry before deletion for reordering
    const { data: waitlistEntry } = await supabase
      .from("class_waitlists")
      .select("class_session_id")
      .eq("id", waitlistId)
      .eq("organization_id", organization.id)
      .single();

    const { error } = await supabase
      .from("class_waitlists")
      .delete()
      .eq("id", waitlistId)
      .eq("organization_id", organization.id);

    if (error) {
      return NextResponse.json(
        { error: "Failed to remove from waitlist" },
        { status: 500 },
      );
    }

    // Reorder remaining positions
    if (waitlistEntry) {
      await reorderWaitlist(supabase, waitlistEntry.class_session_id);
    }

    return NextResponse.json({
      success: true,
      message: "Removed from waitlist",
    });
  } catch (error) {
    console.error("Error removing from waitlist:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Helper function to reorder waitlist positions after changes
async function reorderWaitlist(supabase: any, classSessionId: string) {
  const { data: waitingEntries } = await supabase
    .from("class_waitlists")
    .select("id")
    .eq("class_session_id", classSessionId)
    .eq("status", "waiting")
    .order("position", { ascending: true });

  if (waitingEntries && waitingEntries.length > 0) {
    const updates = waitingEntries.map((entry: any, index: number) =>
      supabase
        .from("class_waitlists")
        .update({ position: index + 1 })
        .eq("id", entry.id),
    );

    await Promise.all(updates);
  }
}
