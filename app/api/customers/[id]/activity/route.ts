import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/app/lib/supabase/server";
import { getUserAndOrganization } from "@/app/lib/auth-utils";

interface ActivityItem {
  id: string;
  type:
    | "booking"
    | "payment"
    | "note"
    | "communication"
    | "membership"
    | "login";
  title: string;
  description: string;
  date: string;
  metadata?: any;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { user, organization } = await getUserAndOrganization(supabase);

    if (!user || !organization) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const customerId = params.id;
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    // Verify customer belongs to organization
    const { data: customer, error: customerError } = await supabase
      .from("leads")
      .select("id, name")
      .eq("id", customerId)
      .eq("organization_id", organization.id)
      .single();

    if (customerError || !customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 },
      );
    }

    const activities: ActivityItem[] = [];

    // Get bookings activity
    const { data: bookings } = await supabase
      .from("bookings")
      .select(
        `
        id,
        booking_status,
        created_at,
        attended_at,
        cancelled_at,
        class_session:class_session_id (
          name,
          start_time,
          programs:program_id (
            name
          )
        )
      `,
      )
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (bookings) {
      bookings.forEach((booking) => {
        const className =
          booking.class_session?.name ||
          booking.class_session?.programs?.name ||
          "Unknown Class";

        // Booking created
        activities.push({
          id: `booking-${booking.id}`,
          type: "booking",
          title: "Class Booked",
          description: `Booked for ${className}`,
          date: booking.created_at,
          metadata: { booking, type: "created" },
        });

        // Attendance
        if (booking.attended_at) {
          activities.push({
            id: `booking-attended-${booking.id}`,
            type: "booking",
            title: "Class Attended",
            description: `Attended ${className}`,
            date: booking.attended_at,
            metadata: { booking, type: "attended" },
          });
        }

        // Cancellation
        if (booking.cancelled_at) {
          activities.push({
            id: `booking-cancelled-${booking.id}`,
            type: "booking",
            title: "Class Cancelled",
            description: `Cancelled booking for ${className}`,
            date: booking.cancelled_at,
            metadata: { booking, type: "cancelled" },
          });
        }
      });
    }

    // Get payment activity
    const { data: payments } = await supabase
      .from("payment_transactions")
      .select("*")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (payments) {
      payments.forEach((payment) => {
        activities.push({
          id: `payment-${payment.id}`,
          type: "payment",
          title:
            payment.status === "succeeded"
              ? "Payment Successful"
              : "Payment Failed",
          description: `${payment.status === "succeeded" ? "Paid" : "Failed payment of"} £${(payment.amount_pennies / 100).toFixed(2)} for ${payment.description || "service"}`,
          date: payment.created_at,
          metadata: { payment },
        });
      });
    }

    // Get membership activity
    const { data: memberships } = await supabase
      .from("customer_memberships")
      .select(
        `
        *,
        membership_plans (
          name,
          price_pennies
        )
      `,
      )
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (memberships) {
      memberships.forEach((membership) => {
        activities.push({
          id: `membership-${membership.id}`,
          type: "membership",
          title: "Membership Updated",
          description: `Membership ${membership.status}: ${membership.membership_plans?.name || "Unknown Plan"}`,
          date: membership.created_at,
          metadata: { membership },
        });

        // Membership cancellation
        if (membership.cancelled_at) {
          activities.push({
            id: `membership-cancelled-${membership.id}`,
            type: "membership",
            title: "Membership Cancelled",
            description: `Cancelled ${membership.membership_plans?.name || "membership"}`,
            date: membership.cancelled_at,
            metadata: { membership, type: "cancelled" },
          });
        }
      });
    }

    // Get communication activity (messages)
    const { data: messages } = await supabase
      .from("messages")
      .select("*")
      .eq("contact_id", customerId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (messages) {
      messages.forEach((message) => {
        activities.push({
          id: `message-${message.id}`,
          type: "communication",
          title:
            message.direction === "outbound"
              ? "Message Sent"
              : "Message Received",
          description: message.body
            ? message.body.length > 100
              ? message.body.substring(0, 100) + "..."
              : message.body
            : "Media message",
          date: message.created_at,
          metadata: { message },
        });
      });
    }

    // Get notes activity
    const { data: notes } = await supabase
      .from("customer_notes")
      .select("*")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (notes) {
      notes.forEach((note) => {
        activities.push({
          id: `note-${note.id}`,
          type: "note",
          title: "Note Added",
          description: `Staff added a note: ${note.content.length > 100 ? note.content.substring(0, 100) + "..." : note.content}`,
          date: note.created_at,
          metadata: { note },
        });
      });
    }

    // Sort all activities by date (most recent first)
    activities.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    // Apply pagination
    const paginatedActivities = activities.slice(offset, offset + limit);

    return NextResponse.json({
      activities: paginatedActivities,
      total: activities.length,
      hasMore: activities.length > offset + limit,
    });
  } catch (error) {
    console.error("Error fetching customer activity:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { user, organization } = await getUserAndOrganization(supabase);

    if (!user || !organization) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const customerId = params.id;
    const body = await request.json();
    const { type, title, description, metadata } = body;

    // Verify customer belongs to organization
    const { data: customer, error: customerError } = await supabase
      .from("leads")
      .select("id")
      .eq("id", customerId)
      .eq("organization_id", organization.id)
      .single();

    if (customerError || !customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 },
      );
    }

    // Create activity record based on type
    if (type === "note") {
      const { data: note, error: noteError } = await supabase
        .from("customer_notes")
        .insert({
          customer_id: customerId,
          content: description,
          created_by: user.id,
          organization_id: organization.id,
          metadata: metadata || {},
        })
        .select()
        .single();

      if (noteError) {
        return NextResponse.json(
          { error: "Failed to create note" },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        note,
        activity: {
          id: `note-${note.id}`,
          type: "note",
          title: "Note Added",
          description,
          date: note.created_at,
          metadata: { note },
        },
      });
    }

    // For other activity types, you might want to create a general activity log table
    return NextResponse.json(
      { error: "Unsupported activity type" },
      { status: 400 },
    );
  } catch (error) {
    console.error("Error creating customer activity:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
