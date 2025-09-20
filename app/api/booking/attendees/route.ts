import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 },
      );
    }

    // Try admin client first, fall back to regular client
    let supabase;
    try {
      supabase = await createAdminClient();
      console.log("Using admin client for fetching attendees");
    } catch (adminError) {
      console.log("Admin client not available, using regular server client");
      supabase = await createClient();
    }

    // Use the unified view to get all bookings regardless of table
    const { data: bookings, error } = await supabase
      .from("unified_booking_view")
      .select("*")
      .eq("class_session_id", sessionId)
      .in("status", ["confirmed", "attended"])
      .order("created_at");

    if (error) {
      console.error("Error fetching bookings from unified view:", error);

      // Fallback to direct queries if view doesn't exist yet
      const { data: classBookings, error: cbError } = await supabase
        .from("class_bookings")
        .select(
          `
          *,
          leads!customer_id(id, first_name, last_name, email, phone),
          clients!client_id(id, first_name, last_name, email, phone)
        `,
        )
        .eq("class_session_id", sessionId)
        .in("booking_status", ["confirmed", "attended"])
        .order("created_at");

      if (cbError) {
        console.error("Fallback query error:", cbError);
        return NextResponse.json(
          { error: "Failed to fetch attendees" },
          { status: 400 },
        );
      }

      // Format the fallback data
      const attendees = (classBookings || []).map((booking) => {
        const customer = booking.leads || booking.clients;
        const customerName = customer
          ? `${customer.first_name || ""} ${customer.last_name || ""}`.trim() ||
            customer.email ||
            "Unknown"
          : "Unknown";

        return {
          id: booking.id,
          customerId: booking.customer_id || booking.client_id,
          customerName,
          customerEmail: customer?.email || "",
          customerPhone: customer?.phone || "",
          status: booking.booking_status,
          membershipType:
            booking.booking_type === "membership"
              ? "Membership"
              : booking.booking_type === "drop_in"
                ? "Drop-in"
                : "No Membership",
          bookedAt: booking.created_at,
        };
      });

      return NextResponse.json({ attendees });
    }

    // Format the unified view data
    const attendees = (bookings || []).map((booking) => ({
      id: booking.id,
      customerId: booking.customer_id,
      customerName: booking.customer_name || "Unknown",
      customerEmail: booking.customer_email || "",
      customerPhone: booking.customer_phone || "",
      status: booking.status,
      membershipType:
        booking.payment_status === "comp"
          ? "Complimentary"
          : booking.payment_status === "succeeded"
            ? "Paid"
            : "No Membership",
      bookedAt: booking.created_at,
    }));

    // Also get membership information for better display
    const customerIds = attendees.map((a) => a.customerId).filter(Boolean);
    console.log("Looking up memberships for customer IDs:", customerIds);

    if (customerIds.length > 0) {
      // Use RPC or direct query for better reliability
      const { data: memberships, error: membershipError } = await supabase
        .from("customer_memberships")
        .select(
          `
          customer_id,
          status,
          membership_plan_id,
          membership_plans!inner(name)
        `,
        )
        .in("customer_id", customerIds)
        .eq("status", "active");

      if (membershipError) {
        console.error("Error fetching memberships:", membershipError);
        // Fallback to a simpler query
        const { data: fallbackMemberships } = await supabase
          .from("customer_memberships")
          .select("*")
          .in("customer_id", customerIds)
          .eq("status", "active");

        if (fallbackMemberships) {
          // Get plan names separately
          const planIds = fallbackMemberships
            .map((m) => m.membership_plan_id)
            .filter(Boolean);
          const { data: plans } = await supabase
            .from("membership_plans")
            .select("id, name")
            .in("id", planIds);

          const planMap =
            plans?.reduce((acc, p) => {
              acc[p.id] = p.name;
              return acc;
            }, {}) || {};

          memberships = fallbackMemberships.map((m) => ({
            ...m,
            membership_plans: {
              name: planMap[m.membership_plan_id] || "Monthly",
            },
          }));
        }
      }

      console.log("Membership query result:", {
        memberships,
        error: memberships ? null : "No data returned",
      });

      if (memberships && memberships.length > 0) {
        console.log("Found memberships:", JSON.stringify(memberships, null, 2));
        const membershipMap: Record<string, string> = {};
        memberships.forEach((m) => {
          // Get plan name from the joined membership_plans (note the 's')
          const planName =
            m.membership_plans?.name || m.membership_plan?.name || "Monthly";
          membershipMap[m.customer_id] = planName;
          console.log(`Mapped membership for ${m.customer_id}: ${planName}`);
        });

        // Update membership types with actual membership names
        attendees.forEach((attendee) => {
          if (attendee.customerId && membershipMap[attendee.customerId]) {
            attendee.membershipType = membershipMap[attendee.customerId];
            console.log(
              `Updated membership for ${attendee.customerName}: ${attendee.membershipType}`,
            );
          }
        });
      } else {
        console.log("No active memberships found for customers");
      }
    } else {
      console.log("No customer IDs to look up memberships for");
    }

    return NextResponse.json({ attendees });
  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
