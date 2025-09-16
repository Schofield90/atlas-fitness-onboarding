import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const {
      classSessionId,
      customerId,
      clientId,
      registrationType,
      membershipId,
    } = await request.json();

    if (!classSessionId || (!customerId && !clientId)) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Try admin client first, fall back to regular client
    let supabase;
    try {
      supabase = await createAdminClient();
      console.log("Using admin client for booking");
    } catch (adminError) {
      console.log("Admin client not available, using regular server client");
      supabase = createClient();
    }

    console.log("Booking request:", {
      classSessionId,
      customerId,
      clientId,
      registrationType,
      membershipId,
    });

    // First verify the customer exists in leads table
    const customerIdToUse = customerId || clientId;
    console.log("Looking for customer with ID:", customerIdToUse);

    const { data: customerExists, error: customerCheckError } = await supabase
      .from("leads")
      .select("id, name, email")
      .eq("id", customerIdToUse)
      .single();

    console.log("Customer lookup result:", {
      customerExists,
      customerCheckError,
    });

    if (customerCheckError || !customerExists) {
      console.error("Customer lookup failed:", {
        customerIdToUse,
        error: customerCheckError?.message,
        errorCode: customerCheckError?.code,
        customerExists: !!customerExists,
      });
      return NextResponse.json(
        {
          error: `Customer not found with ID: ${customerIdToUse}. Error: ${customerCheckError?.message || "Customer does not exist"}`,
        },
        { status: 400 },
      );
    }

    console.log("Customer found:", customerExists);

    // Get the class session to find the organization_id
    const { data: sessionData, error: sessionError } = await supabase
      .from("class_sessions")
      .select("organization_id")
      .eq("id", classSessionId)
      .single();

    if (sessionError || !sessionData) {
      console.error("Session lookup failed:", sessionError);
      return NextResponse.json(
        { error: "Class session not found" },
        { status: 400 },
      );
    }

    console.log("Session organization_id:", sessionData.organization_id);

    // Unified approach: All customers are in the leads table
    // The bookings table should reference customer_id -> leads(id)

    // Prepare booking data for class_bookings table
    const bookingData: any = {
      class_session_id: classSessionId,
      customer_id: customerId || clientId, // This will be a lead ID
      organization_id: sessionData.organization_id, // Add organization_id from session
      booking_status: "confirmed", // class_bookings uses booking_status not status
      booking_type:
        registrationType === "membership"
          ? "membership"
          : registrationType === "free"
            ? "drop_in"
            : "drop_in",
      payment_status: registrationType === "free" ? "comp" : "pending",
      booked_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    // Add membership information if provided
    if (membershipId && registrationType === "membership") {
      bookingData.membership_id = membershipId;
    }

    // Insert the booking into class_bookings table
    const { data, error } = await supabase
      .from("class_bookings")
      .insert(bookingData)
      .select()
      .single();

    if (error) {
      console.error("Booking insert error:", error);

      // Check if it's a foreign key constraint error
      if (error.message?.includes("violates foreign key constraint")) {
        return NextResponse.json(
          {
            error:
              "Customer not found. Please ensure the customer exists in the system.",
          },
          { status: 400 },
        );
      }

      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Update lead status to client if they made a booking
    if (registrationType === "membership" || registrationType === "drop-in") {
      await supabase
        .from("leads")
        .update({ status: "client" })
        .eq("id", customerId || clientId)
        .neq("status", "client"); // Only update if not already a client
    }

    // Update the current_bookings count in class_sessions
    const { data: currentSession } = await supabase
      .from("class_sessions")
      .select("current_bookings")
      .eq("id", classSessionId)
      .single();

    const newBookingCount = (currentSession?.current_bookings || 0) + 1;

    await supabase
      .from("class_sessions")
      .update({ current_bookings: newBookingCount })
      .eq("id", classSessionId);

    console.log("Updated booking count to:", newBookingCount);

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
